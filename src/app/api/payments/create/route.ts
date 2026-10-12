import { db, schema } from '@/lib/db/client';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';
import { getPaymentProvider, baleConfigured } from '@/lib/payments';
import { bale } from '@/lib/payments/bale';
import { getLink } from '@/lib/payments/bale-linking';
import { getPlan } from '@/lib/plans';
import { getEnv } from '@/lib/env';
import { AppError } from '@/lib/types';
import { ok, fail, handleError } from '@/lib/api/http';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

const body = z.object({ plan: z.enum(['mvp', 'proPlus']), provider: z.enum(['zarinpal', 'bale']).optional() });

/** Correlation token for the payment row + Bale invoice_payload. 160-bit random
 * hex — unguessable, carries no user data, echoed back by Bale unchanged. */
function newPayload(): string {
  return randomBytes(20).toString('hex');
}

export async function POST(req: Request) {
  try {
    if (!getEnv().PAYMENTS_ENABLED) throw new AppError('NOT_FOUND', undefined, 404);
    const session = await getSession();
    if (!session) throw new AppError('UNAUTHORIZED', undefined, 401);
    const parsed = body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return fail('generic', 400);
    const plan = getPlan(parsed.data.plan);
    if (!plan.priceToman) return fail('generic', 400);

    const env = getEnv();
    const requested = parsed.data.provider;
    if (requested === 'zarinpal' && !env.ZARINPAL_MERCHANT_ID) return fail('ZARINPAL_NOT_CONFIGURED', 400);
    if (requested === 'bale' && !baleConfigured()) return fail('BALE_NOT_CONFIGURED', 400);

    // Resolve provider the same way the registry does, honoring an explicit
    // request when configured.
    const provider = ((): ReturnType<typeof getPaymentProvider> => {
      if (requested === 'bale') return bale;
      if (requested === 'zarinpal') {
         
        return getPaymentProvider().id === 'bale' && !env.ZARINPAL_MERCHANT_ID ? bale : getPaymentProvider();
      }
      return getPaymentProvider();
    })();

    if (provider.id === 'bale') {
      const link = await getLink(session.userId);
      if (!link) return fail('BALE_NOT_LINKED', 409);
      const payload = newPayload();
      const expiresAt = new Date(Date.now() + env.BALE_INVOICE_TTL_SEC * 1000);

      // Insert the internal row FIRST, then call Bale: a crash after sendInvoice
      // leaves a pending row + a delivered invoice the webhook can still settle.
      const [row] = await db
        .insert(schema.paymentTransactions)
        .values({
          userId: session.userId,
          provider: 'bale',
          amountToman: plan.priceToman,
          plan: plan.id,
          credits: plan.credits,
          status: 'pending',
          payload,
          payerChatId: link.chatId,
          expiresAt,
        })
        .returning();

      try {
        await bale.createPayment({
          amountToman: plan.priceToman,
          amountIrr: plan.priceToman * 10,
          description: `Unstampr ${plan.id}`,
          callbackUrl: '',
          userIdentifier: link.chatId,
          payload,
          expiresInSec: env.BALE_INVOICE_TTL_SEC,
        });
      } catch (e) {
        await db
          .update(schema.paymentTransactions)
          .set({ status: 'failed' })
          .where(eq(schema.paymentTransactions.id, row!.id));
        throw e;
      }

      return ok({ provider: 'bale', paymentId: row!.id, redirectToBale: true });
    }

    // ZarinPal / mock (existing behavior preserved).
    const result = await provider.createPayment({
      amountToman: plan.priceToman,
      description: `Unstampr ${plan.id}`,
      callbackUrl: `${env.ZARINPAL_CALLBACK_URL}?user=${session.userId}&plan=${plan.id}`,
      userIdentifier: session.userId,
    });

    await db.insert(schema.paymentTransactions).values({
      userId: session.userId,
      provider: provider.id,
      providerAuthority: result.authority,
      amountToman: plan.priceToman,
      plan: plan.id,
      credits: plan.credits,
      status: 'pending',
    });

    return ok({ provider: provider.id, redirectUrl: result.redirectUrl });
  } catch (e) {
    return handleError(e);
  }
}
