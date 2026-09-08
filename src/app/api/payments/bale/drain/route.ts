import { db, schema } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import { getEnv } from '@/lib/env';
import { processUpdate } from '@/lib/payments/bale-webhook';
import { timingSafeEqual } from 'node:crypto';

function tokenMatches(provided: string | null): boolean {
  const expected = getEnv().RECONCILE_TOKEN;
  if (!expected || !provided || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

/**
 * getUpdates drain (webhook-outage fallback). Token-guarded. Restart-safe:
 * last_offset is persisted after EACH processed update, so a crash re-fetches
 * at most one update — and settlePayment's latch makes re-processing
 * idempotent. Duplicate deliveries are inherently safe for the same reason.
 * Ambiguous/unverifiable updates are refused by the shared handler (routed to
 * pending_review where applicable) — the drain never auto-settles uncertainty.
 */
export async function POST(req: Request) {
  if (!tokenMatches(req.headers.get('x-reconcile-token'))) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 });
  }
  const env = getEnv();
  if (!env.BALE_BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'BALE_NOT_CONFIGURED' }), { status: 400 });
  }

  const [state] = await db.select().from(schema.baleDrainState).where(eq(schema.baleDrainState.id, 1)).limit(1);
  let offset = state?.lastOffset ?? 0;

  const notes: { update_id: number; note: string }[] = [];
  let processed = 0;

  // Bounded run: at most 20 pages of 100 updates per invocation.
  for (let page = 0; page < 20; page++) {
    const res = await fetch(`https://tapi.bale.ai/bot${env.BALE_BOT_TOKEN}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offset: offset || undefined, timeout: 0, limit: 100 }),
    }).catch(() => null);
    if (!res || !res.ok) {
      // Transient network failure: offset unchanged → next run retries safely.
      break;
    }
    const json = (await res.json().catch(() => null)) as { ok: boolean; result?: { update_id: number }[] } | null;
    if (!json?.ok) break;
    const updates = json.result ?? [];
    if (updates.length === 0) break;

    for (const update of updates) {
      offset = Math.max(offset, update.update_id + 1);
      try {
        const outcome = await processUpdate(update);
        notes.push({ update_id: update.update_id, note: outcome.note ?? 'processed' });
      } catch (e) {
        // Persist the offset anyway: a poison update must not block the drain.
        notes.push({ update_id: update.update_id, note: `error: ${e instanceof Error ? e.message : 'unknown'}` });
      }
      processed += 1;
      await db
        .insert(schema.baleDrainState)
        .values({ id: 1, lastOffset: offset, updatedAt: new Date() })
        .onConflictDoUpdate({ target: schema.baleDrainState.id, set: { lastOffset: offset, updatedAt: new Date() } });
    }
  }

  return new Response(JSON.stringify({ processed, offset, notes }), { status: 200 });
}
