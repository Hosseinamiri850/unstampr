import { db, schema } from '@/lib/db/client';
import { and, eq, isNotNull, lt } from 'drizzle-orm';
import { getEnv } from '@/lib/env';
import { bale } from '@/lib/payments/bale';
import { settlePayment } from '@/lib/payments/settlement';
import { timingSafeEqual } from 'node:crypto';

const SWEEP_AFTER_SEC = 15 * 60;
const MAX_SETTLE_AGE_SEC = 72 * 3600;

function tokenMatches(provided: string | null): boolean {
  const expected = getEnv().RECONCILE_TOKEN;
  if (!expected || !provided || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

async function isAuthorized(req: Request): Promise<boolean> {
  return tokenMatches(req.headers.get('x-reconcile-token'));
}

/**
 * Reconcile sweep for pending Bale payments whose pre-checkout was seen but
 * whose successful_payment update never arrived. For each candidate, ask Bale
 * via inquireTransaction (we hold the charge id persisted at pre-checkout):
 *   paid     → settlePayment (same atomic latch as the webhook)
 *   failed/rejected → mark failed
 *   pending  → leave for a later sweep
 * Uncertain outcomes (inquire unreachable) are left untouched — never guessed.
 * Rows older than MAX_SETTLE_AGE stay pending for manual review instead of
 * auto-resolving; payment expiration gates pre-checkout only, never settlement.
 */
export async function POST(req: Request) {
  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 });
  }
  if (!bale.inquireTransaction) {
    return new Response(JSON.stringify({ error: 'BALE_NOT_CONFIGURED' }), { status: 400 });
  }

  const cutoff = new Date(Date.now() - SWEEP_AFTER_SEC * 1000);
  const candidates = await db
    .select({
      id: schema.paymentTransactions.id,
      chargeId: schema.paymentTransactions.providerChargeId,
      amountToman: schema.paymentTransactions.amountToman,
      payerChatId: schema.paymentTransactions.payerChatId,
      payload: schema.paymentTransactions.payload,
      createdAt: schema.paymentTransactions.createdAt,
    })
    .from(schema.paymentTransactions)
    .where(
      and(
        eq(schema.paymentTransactions.provider, 'bale'),
        eq(schema.paymentTransactions.status, 'pending'),
        isNotNull(schema.paymentTransactions.providerChargeId),
        isNotNull(schema.paymentTransactions.precheckoutSeenAt),
        lt(schema.paymentTransactions.precheckoutSeenAt, cutoff),
      ),
    )
    .limit(50);

  const results: { id: string; action: string }[] = [];
  for (const row of candidates) {
    if (!row.chargeId) continue;
    let info: Awaited<ReturnType<typeof bale.inquireTransaction>>;
    try {
      info = await bale.inquireTransaction(row.chargeId);
    } catch {
      results.push({ id: row.id, action: 'inquire-unreachable-left-pending' });
      continue;
    }
    if (!info || info.id !== row.chargeId) {
      results.push({ id: row.id, action: 'unknown-transaction-left-pending' });
      continue;
    }
    if (info.status === 'paid') {
      const ageSec = (Date.now() - row.createdAt.getTime()) / 1000;
      if (ageSec > MAX_SETTLE_AGE_SEC) {
        results.push({ id: row.id, action: 'too-old-manual-review' });
        continue;
      }
      if (row.payerChatId && String(info.userID) !== row.payerChatId) {
        results.push({ id: row.id, action: 'user-mismatch-left-pending' });
        continue;
      }
      if (info.amount !== row.amountToman * 10) {
        results.push({ id: row.id, action: 'amount-mismatch-left-pending' });
        continue;
      }
      try {
        const settled = await settlePayment({
          paymentId: row.id,
          source: 'bale',
          providerChargeId: row.chargeId,
          payload: row.payload ?? undefined,
          settledVia: 'inquire',
        });
        results.push({ id: row.id, action: settled.outcome });
      } catch {
        results.push({ id: row.id, action: 'settle-failed-left-pending' });
      }
    } else if (info.status === 'failed' || info.status === 'rejected') {
      const latched = await db
        .update(schema.paymentTransactions)
        .set({ status: 'failed' })
        .where(and(eq(schema.paymentTransactions.id, row.id), eq(schema.paymentTransactions.status, 'pending')))
        .returning({ id: schema.paymentTransactions.id });
      results.push({ id: row.id, action: latched.length ? 'marked-failed' : 'lost-race' });
    } else {
      results.push({ id: row.id, action: `status-${info.status}-left-pending` });
    }
  }

  return new Response(JSON.stringify({ scanned: candidates.length, results }), { status: 200 });
}
