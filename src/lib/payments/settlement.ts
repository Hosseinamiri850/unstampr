/**
 * Shared, provider-agnostic settlement path. Exactly-once credit grant.
 *
 * Trust model (nothing here trusts the caller):
 *  - The caller (Bale provider layer, ZarinPal callback, admin review) must
 *    FIRST verify the event against the provider (authority/amount/currency/
 *    user) and only then call settlePayment. This function re-validates every
 *    internal invariant inside the DB transaction, so a caller bug or a forged
 *    webhook can at worst fail loudly — it can never mint credits.
 *  - plan/credits granted come exclusively from the internal payment row.
 *  - `pending_review` is never auto-settled here; only `pending` can latch.
 *
 * Identifier semantics (Bale — see drizzle/0003_payment_bale.sql):
 *  - providerChargeId  canonical Bale transaction id (PreCheckoutQuery.id ==
 *                      telegram_payment_charge_id); UNIQUE index backstops it
 *  - providerWalletTracking  user-visible receipt number; metadata only
 *  - payload           correlation token; UNIQUE index backstops it
 *  - providerRefId     ZarinPal-only (verify.json ref_id); Bale leaves NULL
 */
import { db, schema } from '@/lib/db/client';
import { and, eq, sql } from 'drizzle-orm';
import { AppError } from '@/lib/types';

export type PaymentSource = 'bale' | 'zarinpal';

export interface SettleInput {
  /** Internal payment_transactions.id (UUID). */
  paymentId: string;
  /** Provider the caller authenticated as — must match the row's provider. */
  source: PaymentSource;
  /**
   * Canonical provider transaction id. Bale: PreCheckoutQuery.id /
   * telegram_payment_charge_id. ZarinPal (future refactor): the ref_id.
   * Required, stored on the row, UNIQUE-indexed.
   */
  providerChargeId: string;
  /** ZarinPal ref_id (stored in provider_ref_id); undefined for Bale. */
  providerRefId?: string;
  /** Bale wallet tracking number (receipt); undefined for ZarinPal. */
  providerWalletTracking?: string;
  /** Correlation token as echoed by the provider; required for Bale. */
  payload?: string;
  /** How settlement was triggered — observability only, never authoritative. */
  settledVia: 'webhook' | 'inquire' | 'callback' | 'admin';
}

export type SettleResult =
  | { outcome: 'settled'; creditsGranted: number; alreadySettled: false }
  | { outcome: 'already_settled'; creditsGranted: 0; alreadySettled: true };

/**
 * Atomically mark a payment verified and grant its credits exactly once.
 * The guarded UPDATE ... WHERE status='pending' is the only latch: concurrent
 * callers serialize on the row lock and the loser sees zero updated rows.
 */
export async function settlePayment(input: SettleInput): Promise<SettleResult> {
  const { paymentId, source, providerChargeId } = input;
  if (!providerChargeId || typeof providerChargeId !== 'string') {
    throw new AppError('INVALID_CHARGE_ID', 'provider charge id is required', 400);
  }
  if (source === 'bale' && !input.payload) {
    throw new AppError('INVALID_PAYLOAD', 'payload is required for bale settlement', 400);
  }

  return db.transaction(async (tx) => {
    // Load under the row lock we are about to take with the guarded UPDATE —
    // the SELECT below is for validation/metadata only, never for the latch.
    const [payment] = await tx
      .select()
      .from(schema.paymentTransactions)
      .where(eq(schema.paymentTransactions.id, paymentId))
      .limit(1);

    if (!payment) throw new AppError('PAYMENT_NOT_FOUND', undefined, 404);
    if (payment.provider !== source) {
      throw new AppError('PROVIDER_MISMATCH', `payment belongs to provider ${payment.provider}`, 409);
    }
    if (payment.status === 'pending_review') {
      throw new AppError('PAYMENT_IN_REVIEW', 'payment is awaiting manual review', 409);
    }
    if (payment.status !== 'pending') {
      // verified/failed/expired/malformed — the latch would be a no-op anyway;
      // fail loudly unless this is an idempotent duplicate of a real settlement.
      if (payment.status === 'verified') {
        if (payment.providerChargeId === providerChargeId) {
          return { outcome: 'already_settled', creditsGranted: 0, alreadySettled: true } as const;
        }
        // Same row, different charge id: conflicting evidence, never silently ok.
        throw new AppError('CHARGE_ID_CONFLICT', 'payment already settled with a different charge id', 409);
      }
      throw new AppError('PAYMENT_NOT_PENDING', `payment status is ${payment.status}`, 409);
    }
    if (input.payload && payment.payload && payment.payload !== input.payload) {
      throw new AppError('PAYLOAD_MISMATCH', undefined, 409);
    }
    if (source === 'bale' && payment.payload && input.payload !== payment.payload) {
      throw new AppError('PAYLOAD_MISMATCH', undefined, 409);
    }

    // THE LATCH. Single guarded statement; only the transaction that flips
    // pending→verified proceeds. Losers observe verified after re-read.
    const latched = await tx
      .update(schema.paymentTransactions)
      .set({
        status: 'verified',
        providerChargeId,
        providerRefId: input.providerRefId ?? null,
        providerWalletTracking: input.providerWalletTracking ?? null,
        settledVia: input.settledVia,
        verifiedAt: new Date(),
      })
      .where(and(eq(schema.paymentTransactions.id, paymentId), eq(schema.paymentTransactions.status, 'pending')))
      .returning({ id: schema.paymentTransactions.id, credits: schema.paymentTransactions.credits });

    if (latched.length === 0) {
      // Lost the race — someone else settled between our SELECT and UPDATE.
      // Re-read inside this transaction to classify: same charge id means a
      // benign duplicate; anything else is a conflict (our snapshot already
      // said 'pending', so the concurrent winner must have used this tx's row).
      const [winner] = await tx
        .select({ chargeId: schema.paymentTransactions.providerChargeId })
        .from(schema.paymentTransactions)
        .where(eq(schema.paymentTransactions.id, paymentId))
        .limit(1);
      if (winner?.chargeId === providerChargeId) {
        return { outcome: 'already_settled', creditsGranted: 0, alreadySettled: true } as const;
      }
      throw new AppError('CHARGE_ID_CONFLICT', 'concurrent settlement with a different charge id', 409);
    }

    const credits = latched[0]!.credits;
    const [user] = await tx
      .update(schema.users)
      .set({ credits: sql`${schema.users.credits} + ${credits}`, plan: payment.plan, updatedAt: new Date() })
      .where(eq(schema.users.id, payment.userId))
      .returning({ credits: schema.users.credits });
    if (!user) throw new AppError('USER_NOT_FOUND', undefined, 404);

    await tx.insert(schema.creditTransactions).values({
      userId: payment.userId,
      delta: credits,
      reason: 'purchase',
      jobId: null,
    });

    return { outcome: 'settled', creditsGranted: credits, alreadySettled: false } as const;
  });
}

/**
 * Terminal failure transition, used by providers when the provider itself
 * reports failed/rejected (never by webhooks alone for Bale — Bale terminal
 * marks come from the reconcile sweep via inquireTransaction, or admin).
 * Guarded latch: only a pending row can fail; an already-settled row is never
 * overwritten (double-failure after settlement would be a correctness bug).
 */
export async function markPaymentFailed(
  paymentId: string,
  source: PaymentSource,
  reason: 'failed' | 'expired',
): Promise<void> {
  await db.transaction(async (tx) => {
    const latched = await tx
      .update(schema.paymentTransactions)
      .set({ status: reason })
      .where(
        and(
          eq(schema.paymentTransactions.id, paymentId),
          eq(schema.paymentTransactions.provider, source),
          eq(schema.paymentTransactions.status, 'pending'),
        ),
      )
      .returning({ id: schema.paymentTransactions.id });
    if (latched.length === 0) {
      throw new AppError('PAYMENT_NOT_PENDING', 'payment is not in pending state', 409);
    }
  });
}
