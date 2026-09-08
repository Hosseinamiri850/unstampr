import { getEnv } from '@/lib/env';
import { zarinpal } from './zarinpal';
import { mockPayment } from './mock';
import { bale, baleConfigured } from './bale';
import type { PaymentProvider } from './types';

/** Resolve the active provider: explicit PAYMENT_DEFAULT_PROVIDER wins, then
 * configuration presence (zarinpal → bale), else mock. */
export function getPaymentProvider(): PaymentProvider {
  const env = getEnv();
  const requested = process.env.PAYMENT_DEFAULT_PROVIDER;
  if (requested === 'zarinpal' && env.ZARINPAL_MERCHANT_ID) return zarinpal;
  if (requested === 'bale' && baleConfigured()) return bale;
  if (env.ZARINPAL_MERCHANT_ID) return zarinpal;
  if (baleConfigured()) return bale;
  return mockPayment;
}

export { bale, baleConfigured };
