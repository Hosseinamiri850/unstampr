import { db, schema } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import { getPaymentProvider } from '@/lib/payments';
import { settlePayment } from '@/lib/payments/settlement';
import { getEnv } from '@/lib/env';
import { AppError } from '@/lib/types';
import { handleError } from '@/lib/api/http';
import { NextResponse } from 'next/server';

export async function GET(_req: Request) {
  try {
    const provider = getPaymentProvider();
    if (provider.id !== 'mock') {
      return NextResponse.redirect(new URL('/dashboard?payment=failed', getEnv().APP_URL));
    }
    return NextResponse.redirect(new URL('/dashboard?payment=success', getEnv().APP_URL));
  } catch (e) {
    return handleError(e);
  }
}

/**
 * ZarinPal gateway return. Provider verification (verify.json against the
 * stored amount) happens HERE, before settlement; credits/plan/amount granted
 * come exclusively from the internal payment row via settlePayment's atomic
 * latch, so repeated or concurrent gateway redirects can never double-grant.
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const authority = url.searchParams.get('Authority') ?? url.searchParams.get('authority');
    const status = url.searchParams.get('Status') ?? 'OK';
    if (!authority) return NextResponse.redirect(new URL('/dashboard?payment=failed', getEnv().APP_URL));
    if (status !== 'OK') {
      return NextResponse.redirect(new URL('/dashboard?payment=failed', getEnv().APP_URL));
    }

    const [tx] = await db
      .select()
      .from(schema.paymentTransactions)
      .where(eq(schema.paymentTransactions.providerAuthority, authority))
      .limit(1);
    if (!tx) return NextResponse.redirect(new URL('/dashboard?payment=failed', getEnv().APP_URL));

    const provider = getPaymentProvider();
    if (tx.provider !== provider.id) {
      throw new AppError('PROVIDER_MISMATCH', 'payment belongs to another provider', 409);
    }
    const verify = await provider.verifyPayment(authority, tx.amountToman);
    if (!verify.verified) {
      return NextResponse.redirect(new URL('/dashboard?payment=failed', getEnv().APP_URL));
    }

    await settlePayment({
      paymentId: tx.id,
      source: 'zarinpal',
      providerChargeId: verify.refId ?? authority,
      providerRefId: verify.refId,
      settledVia: 'callback',
    });

    return NextResponse.redirect(new URL('/dashboard?payment=success', getEnv().APP_URL));
  } catch (e) {
    if (e instanceof AppError && (e.code === 'ALREADY_SETTLED_DUP' || e.code === 'CHARGE_ID_CONFLICT')) {
      // settlePayment already classified the outcome: duplicate → benign,
      // conflicting ref id → do not grant; both redirect to the dashboard.
      return NextResponse.redirect(new URL('/dashboard?payment=success', getEnv().APP_URL));
    }
    return handleError(e);
  }
}
