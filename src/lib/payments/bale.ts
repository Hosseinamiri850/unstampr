// v1: inactive (free-only launch). Activates with PAYMENTS_ENABLED=true in v2 — see docs/billing.md.
import { getEnv } from '@/lib/env';
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PreCheckoutDecision,
  SuccessfulPaymentEvent,
  BaleInquireResult,
  VerifyPaymentResult,
} from './types';

/** 1 Toman = 10 Rial (Iranian standard). Sole conversion point for Bale —
 * internal Unstampr pricing stays Toman; IRR exists only here. */
export function tomanToRial(toman: number): number {
  return toman * 10;
}

export function baleConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.BALE_BOT_TOKEN && env.BALE_PROVIDER_TOKEN);
}

function apiBase(): string {
  return `https://tapi.bale.ai/bot${getEnv().BALE_BOT_TOKEN}`;
}

/** Bot API call with timeout + bounded retries on network failure only.
 * Never retries non-2xx API errors (they carry the actual result). */
async function call<T>(method: string, body?: Record<string, unknown>, attempt = 1): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${apiBase()}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: boolean; result?: T; error_code?: number; description?: string }
      | null;
    if (!json || !json.ok) {
      throw new BaleApiError(json?.description ?? `Bale API ${method} failed`, json?.error_code ?? res.status);
    }
    return json.result as T;
  } catch (e) {
    if (e instanceof BaleApiError) throw e;
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return call<T>(method, body, attempt + 1);
    }
    throw new BaleApiError(`Bale API ${method} unreachable`, 'NETWORK');
  } finally {
    clearTimeout(timer);
  }
}

export class BaleApiError extends Error {
  code: string | number;
  constructor(message: string, code: string | number) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Wire types (subset verified live in the spike, 2026-09-04)

export interface BalePreCheckoutQuery {
  id: string;
  from: { id: number; username?: string; first_name?: string };
  currency: string;
  total_amount: number;
  invoice_payload: string;
}

export interface BaleSuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id?: string;
}

/** Strict parser — unknown shapes never reach settlement. */
export function parsePreCheckoutQuery(update: unknown): BalePreCheckoutQuery | null {
  const q = (update as { pre_checkout_query?: unknown })?.pre_checkout_query;
  if (typeof q !== 'object' || q === null) return null;
  const o = q as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.invoice_payload !== 'string') return null;
  if (typeof o.currency !== 'string' || typeof o.total_amount !== 'number') return null;
  const from = o.from as Record<string, unknown> | undefined;
  if (!from || typeof from.id !== 'number') return null;
  return {
    id: o.id,
    from: { id: from.id, username: typeof from.username === 'string' ? from.username : undefined },
    currency: o.currency,
    total_amount: o.total_amount,
    invoice_payload: o.invoice_payload,
  };
}

export function parseSuccessfulPayment(update: unknown): BaleSuccessfulPayment | null {
  const msg = (update as { message?: unknown })?.message;
  if (typeof msg !== 'object' || msg === null) return null;
  const sp = (msg as Record<string, unknown>).successful_payment;
  if (typeof sp !== 'object' || sp === null) return null;
  const o = sp as Record<string, unknown>;
  if (
    typeof o.currency !== 'string' ||
    typeof o.total_amount !== 'number' ||
    typeof o.invoice_payload !== 'string' ||
    typeof o.telegram_payment_charge_id !== 'string'
  ) {
    return null;
  }
  return {
    currency: o.currency,
    total_amount: o.total_amount,
    invoice_payload: o.invoice_payload,
    telegram_payment_charge_id: o.telegram_payment_charge_id,
    provider_payment_charge_id:
      typeof o.provider_payment_charge_id === 'string' ? o.provider_payment_charge_id : undefined,
  };
}

/** Extract "/start <code>" from a plain message; null otherwise. */
export function parseStartCommand(update: unknown): { chatId: string; fromId: string; code: string; username?: string } | null {
  const msg = (update as { message?: unknown })?.message;
  if (typeof msg !== 'object' || msg === null) return null;
  const m = msg as Record<string, unknown>;
  if (typeof m.text !== 'string' || !m.text.startsWith('/start')) return null;
  const chat = m.chat as Record<string, unknown> | undefined;
  const from = m.from as Record<string, unknown> | undefined;
  if (!chat || typeof chat.id !== 'number') return null;
  // Codes are bound to the account that requested them; private chats only.
  if (chat.type !== 'private') return null;
  const code = m.text.split(/\s+/)[1] ?? '';
  return {
    chatId: String(chat.id),
    fromId: String(from && typeof from.id === 'number' ? from.id : chat.id),
    code,
    username: from && typeof from.username === 'string' ? from.username : undefined,
  };
}

// ---------------------------------------------------------------------------

export const bale: PaymentProvider = {
  id: 'bale',

  // Pull-based verification doesn't exist on the Bale Bot API — settlement is
  // push-based (successful_payment webhook) with optional inquireTransaction
  // defense-in-depth. Present to satisfy the interface; never called.
  async verifyPayment(): Promise<VerifyPaymentResult> {
    return { verified: false, message: 'Bale does not support pull-based verification' };
  },

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const env = getEnv();
    if (!baleConfigured()) throw new BaleApiError('BALE_BOT_TOKEN/BALE_PROVIDER_TOKEN not set', 'BALE_NOT_CONFIGURED');
    if (!input.userIdentifier) throw new BaleApiError('Bale payments require a linked account', 'BALE_NOT_LINKED');
    if (!input.amountIrr) throw new BaleApiError('amountIrr missing (convert Toman→IRR before calling bale)', 'INVALID_AMOUNT');

    // sendInvoice requires a chat; redirectUrl is null — the invoice arrives in
    // the user's Bale app, there is no browser redirect flow.
    await call<{ message_id: number; chat: { id: number } }>('sendInvoice', {
      chat_id: Number(input.userIdentifier),
      title: input.description.slice(0, 32),
      description: input.description.slice(0, 255),
      payload: input.payload,
      provider_token: env.BALE_PROVIDER_TOKEN,
      currency: 'IRR',
      prices: [{ label: input.description.slice(0, 32), amount: input.amountIrr }],
    });
    return { authority: input.payload!, redirectUrl: null, chatId: String(input.userIdentifier) };
  },

  async answerPreCheckout(queryId: string, ok: boolean, errorMessage?: string): Promise<void> {
    const body: Record<string, unknown> = { pre_checkout_query_id: queryId, ok };
    if (!ok && errorMessage) body.error_message = errorMessage.slice(0, 200);
    await call('answerPreCheckoutQuery', body);
  },

  async inquireTransaction(transactionId: string): Promise<BaleInquireResult | null> {
    try {
      const r = await call<{
        id: string;
        status: string;
        userID: number;
        amount: number;
        provider_payment_charge_id?: string;
        createdAt: number;
      }>('inquireTransaction', { transaction_id: transactionId });
      return {
        id: r.id,
        status: r.status as BaleInquireResult['status'],
        userID: r.userID,
        amount: r.amount,
      };
    } catch (e) {
      if (e instanceof BaleApiError && String(e.code) === '404') return null; // unknown tx id
      throw e;
    }
  },

  async sendMessage(chatId: string, text: string): Promise<void> {
    await call('sendMessage', { chat_id: Number(chatId), text }).catch(() => undefined);
  },

  async setWebhook(url: string): Promise<void> {
    await call('setWebhook', { url });
  },
};

// ---- Pre-checkout / successful-payment validation helpers (pure, testable) ----

export interface PreCheckoutContext {
  provider: string | null;
  status: string;
  amountToman: number;
  payload: string | null;
  payerChatId: string | null;
  expiresAt: Date | null;
  linkedChatId: string | null;
  now?: Date;
}

/** Pure validation for a pre_checkout_query against the internal row.
 * Returns an error message for the user on rejection, null on approval. */
export function evaluatePreCheckout(
  payment: PreCheckoutContext | null,
  query: { invoice_payload: string; currency: string; total_amount: number },
  fromId: number,
): PreCheckoutDecision {
  if (!payment || payment.provider !== 'bale') {
    return { approved: false, errorMessage: 'این درخواست پرداخت معتبر نیست.' };
  }
  if (payment.status !== 'pending') {
    return { approved: false, errorMessage: 'این درخواست پرداخت قابل استفاده نیست.' };
  }
  if (!payment.payload || payment.payload !== query.invoice_payload) {
    return { approved: false, errorMessage: 'این درخواست پرداخت معتبر نیست.' };
  }
  if (query.currency !== 'IRR') {
    return { approved: false, errorMessage: 'واحد پول پشتیبانی نمی‌شود.' };
  }
  if (query.total_amount !== tomanToRial(payment.amountToman)) {
    return { approved: false, errorMessage: 'مبلغ با سفارش مطابقت ندارد.' };
  }
  const payer = String(fromId);
  if (payment.payerChatId && payment.payerChatId !== payer) {
    return { approved: false, errorMessage: 'این فاکتور متعلق به حساب بلهٔ دیگری است.' };
  }
  if (payment.linkedChatId && payment.linkedChatId !== payer) {
    return { approved: false, errorMessage: 'این فاکتور متعلق به حساب بلهٔ دیگری است.' };
  }
  const now = payment.now ?? new Date();
  if (payment.expiresAt && payment.expiresAt.getTime() < now.getTime()) {
    return { approved: false, errorMessage: 'مهلت پرداخت پایان یافته است.' };
  }
  return { approved: true };
}

export interface SuccessfulPaymentContext {
  provider: string | null;
  status: string;
  amountToman: number;
  payload: string | null;
  payerChatId: string | null;
  linkedChatId: string | null;
  existingChargeId: string | null;
  existingRefId: string | null;
}

export type SuccessfulPaymentCheck =
  | { ok: true }
  | { ok: false; reason: 'PAYLOAD_MISMATCH' | 'AMOUNT_MISMATCH' | 'CURRENCY_MISMATCH' | 'PAYER_MISMATCH' | 'PAYMENT_NOT_PENDING' | 'CHARGE_ID_CONFLICT' };

/** Pure validation of a successful_payment event against the internal row.
 * Settlement itself happens via settlePayment; this gates the call. */
export function evaluateSuccessfulPayment(
  payment: SuccessfulPaymentContext | null,
  event: BaleSuccessfulPayment,
  messageSenderId: string | null,
): SuccessfulPaymentCheck {
  if (!payment || payment.provider !== 'bale') return { ok: false, reason: 'PAYMENT_NOT_PENDING' };
  if (!payment.payload || payment.payload !== event.invoice_payload) return { ok: false, reason: 'PAYLOAD_MISMATCH' };
  if (event.currency !== 'IRR') return { ok: false, reason: 'CURRENCY_MISMATCH' };
  if (event.total_amount !== tomanToRial(payment.amountToman)) return { ok: false, reason: 'AMOUNT_MISMATCH' };
  const sender = messageSenderId ? String(messageSenderId) : null;
  if (payment.payerChatId && sender && payment.payerChatId !== sender) return { ok: false, reason: 'PAYER_MISMATCH' };
  if (payment.linkedChatId && sender && payment.linkedChatId !== sender) return { ok: false, reason: 'PAYER_MISMATCH' };
  if (payment.status === 'verified') {
    // Idempotent duplicate: same charge id is fine (settlePayment returns
    // already_settled); a different charge id is a conflict.
    if (payment.existingChargeId && payment.existingChargeId !== event.telegram_payment_charge_id) {
      return { ok: false, reason: 'CHARGE_ID_CONFLICT' };
    }
  } else if (payment.status !== 'pending') {
    return { ok: false, reason: 'PAYMENT_NOT_PENDING' };
  }
  return { ok: true };
}

export type { SuccessfulPaymentEvent };
