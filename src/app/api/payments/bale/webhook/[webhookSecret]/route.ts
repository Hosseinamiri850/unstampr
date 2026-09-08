import { getEnv } from '@/lib/env';
import { processUpdate } from '@/lib/payments/bale-webhook';
import { ok } from '@/lib/api/http';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

/** Constant-time comparison of the URL secret against the configured one. */
function secretMatches(provided: string): boolean {
  const expected = getEnv().BALE_WEBHOOK_SECRET;
  if (!expected || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

/**
 * Bale Bot API webhook. Auth = secret path segment (Bale's setWebhook has no
 * secret_token param — verified in docs + spike). Bad secret → 404 without
 * revealing whether the route exists. Handlers are idempotent; any malformed
 * or unknown update still gets a 200 so Bale never enters a retry storm.
 */
export async function POST(req: Request, { params }: { params: Promise<{ webhookSecret: string }> }) {
  const { webhookSecret } = await params;
  if (!secretMatches(webhookSecret ?? '')) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  let update: unknown;
  try {
    update = await req.json();
  } catch {
    return ok({ ok: true, note: 'malformed json ignored' });
  }

  try {
    const outcome = await processUpdate(update);
    return ok({ ok: true, ...(outcome.note ? { note: outcome.note } : {}) });
  } catch (e) {
    // Handler crash: log server-side, still 200 — the reconcile sweep and
    // settlePayment's latch make a missed update recoverable.
    console.error('[bale-webhook] update processing failed:', e instanceof Error ? e.message : e);
    return ok({ ok: true, note: 'accepted-with-error' });
  }
}
