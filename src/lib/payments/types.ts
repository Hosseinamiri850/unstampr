export interface CreatePaymentInput {
  amountToman: number;
  description: string;
  callbackUrl: string;
  userIdentifier?: string;
  /** Opaque correlation token echoed by the provider (Bale invoice_payload). */
  payload?: string;
  /** Provider-native amount in the provider's minor unit (Bale: integer IRR). */
  amountIrr?: number;
  /** Unix seconds when the payment request expires (Bale TTL hint). */
  expiresInSec?: number;
}

export interface CreatePaymentResult {
  authority: string;
  /** ZarinPal: gateway URL. Bale: null — invoice lands in the user's Bale app. */
  redirectUrl: string | null;
  chatId?: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  refId?: string;
  message?: string;
}

export interface PreCheckoutDecision {
  approved: boolean;
  errorMessage?: string;
}

export interface BaleInquireResult {
  id: string;
  status: 'pending' | 'paid' | 'failed' | 'rejected' | string;
  userID: number;
  amount: number;
}

export interface SuccessfulPaymentEvent {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id?: string;
}

export interface PaymentProvider {
  readonly id: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(authority: string, amountToman: number): Promise<VerifyPaymentResult>;
  // refundPayment optional (ZarinPal sandbox exposes limited refund)
  refundPayment?(_authority: string, _amountToman: number): Promise<{ ok: boolean; message?: string }>;

  // Bale-specific extensions (optional so ZarinPal/mock stay valid)
  answerPreCheckout?(queryId: string, ok: boolean, errorMessage?: string): Promise<void>;
  inquireTransaction?(transactionId: string): Promise<BaleInquireResult | null>;
  sendMessage?(chatId: string, text: string): Promise<void>;
  setWebhook?(url: string): Promise<void>;
}
