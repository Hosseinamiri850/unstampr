import { db, schema } from '@/lib/db/client';
import { eq, sql } from 'drizzle-orm';
import { settlePayment } from './settlement';
import {
  bale,
  parsePreCheckoutQuery,
  parseSuccessfulPayment,
  parseStartCommand,
  evaluatePreCheckout,
  evaluateSuccessfulPayment,
  type BalePreCheckoutQuery,
  type BaleSuccessfulPayment,
} from './bale';
import { consumeLinkCode } from './bale-linking';

export interface WebhookOutcome {
  handled: boolean;
  note?: string;
}

// ---------------------------------------------------------------------------
// Pre-checkout: validate + persist precheckout_seen_at/charge id, then answer.
// Persist happens BEFORE answering (spike-verified ordering); every query.id is
// answered independently — no process-wide flag.

export async function handlePreCheckout(query: BalePreCheckoutQuery): Promise<WebhookOutcome> {
  try {
    const [payment] = await db
      .select()
      .from(schema.paymentTransactions)
      .where(eq(schema.paymentTransactions.payload, query.invoice_payload))
      .limit(1);

    const [link] = payment
      ? await db.select().from(schema.baleLinks).where(eq(schema.baleLinks.userId, payment.userId)).limit(1)
      : [];

    const decision = evaluatePreCheckout(
      payment
        ? {
            provider: payment.provider,
            status: payment.status,
            amountToman: payment.amountToman,
            payload: payment.payload,
            payerChatId: payment.payerChatId,
            expiresAt: payment.expiresAt,
            linkedChatId: link?.baleChatId ?? null,
          }
        : null,
      { invoice_payload: query.invoice_payload, currency: query.currency, total_amount: query.total_amount },
      query.from.id,
    );

    if (payment && decision.approved) {
      await db
        .update(schema.paymentTransactions)
        .set({
          precheckoutSeenAt: new Date(),
          payerChatId: String(query.from.id),
          // PreCheckoutQuery.id == telegram_payment_charge_id (spike-verified).
          // Stored opportunistically so the reconcile sweep holds an inquirable
          // id even if the successful_payment update is lost.
          providerChargeId: sql`COALESCE(${schema.paymentTransactions.providerChargeId}, ${query.id})`,
        })
        .where(and2(payment.id, 'pending'));
    }

    await bale.answerPreCheckout!(query.id, decision.approved, decision.errorMessage);
    return { handled: true, note: decision.approved ? 'approved' : `rejected: ${decision.errorMessage ?? 'invalid'}` };
  } catch (e) {
    // Never let answer failures loop: attempt a rejection so the user's
    // payment cancels cleanly instead of hanging past Bale's 10s window.
    await bale.answerPreCheckout!(query.id, false, 'خطای موقت، لطفاً دوباره تلاش کنید.').catch(() => undefined);
    return { handled: false, note: `pre_checkout error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
}

// Small local helper to keep the guarded-update shape readable.
function and2(paymentId: string, status: string) {
  return sql`${schema.paymentTransactions.id} = ${paymentId} AND ${schema.paymentTransactions.status} = ${status}`;
}

// ---------------------------------------------------------------------------
// Successful payment: validate → settlePayment (the ONLY grant boundary).

export async function handleSuccessfulPayment(event: BaleSuccessfulPayment, messageSenderId: number | null): Promise<WebhookOutcome> {
  const [payment] = await db
    .select()
    .from(schema.paymentTransactions)
    .where(eq(schema.paymentTransactions.payload, event.invoice_payload))
    .limit(1);
  if (!payment) return { handled: true, note: 'successful_payment for unknown payload ignored' };

  const [link] = await db.select().from(schema.baleLinks).where(eq(schema.baleLinks.userId, payment.userId)).limit(1);

  const check = evaluateSuccessfulPayment(
    {
      provider: payment.provider,
      status: payment.status,
      amountToman: payment.amountToman,
      payload: payment.payload,
      payerChatId: payment.payerChatId,
      linkedChatId: link?.baleChatId ?? null,
      existingChargeId: payment.providerChargeId,
      existingRefId: payment.providerRefId,
    },
    event,
    messageSenderId === null ? null : String(messageSenderId),
  );

  if (!check.ok) {
    if (check.reason === 'CHARGE_ID_CONFLICT') {
      // Conflicting evidence: never grant, route to review.
      await db.update(schema.paymentTransactions).set({ status: 'pending_review' }).where(eq(schema.paymentTransactions.id, payment.id));
      return { handled: true, note: 'CHARGE_ID_CONFLICT routed to pending_review' };
    }
    if (check.reason === 'AMOUNT_MISMATCH' || check.reason === 'CURRENCY_MISMATCH' || check.reason === 'PAYER_MISMATCH') {
      await db.update(schema.paymentTransactions).set({ status: 'pending_review' }).where(eq(schema.paymentTransactions.id, payment.id));
      return { handled: true, note: `${check.reason} routed to pending_review` };
    }
    return { handled: true, note: `successful_payment rejected: ${check.reason}` };
  }

  // Defense-in-depth (optional, never authoritative): inquire the transaction.
  // Inquiry unavailability does NOT block settlement — the webhook event is the
  // primary signal; an outage would only add latency, not certainty.
  let inquireOk: boolean | null = null;
  try {
    const info = await bale.inquireTransaction!(event.telegram_payment_charge_id);
    if (info) {
      inquireOk =
        info.status === 'paid' &&
        info.amount === event.total_amount &&
        info.id === event.telegram_payment_charge_id &&
        (payment.payerChatId ? String(info.userID) === payment.payerChatId : true);
    }
  } catch {
    inquireOk = null; // inquiry unavailable — proceed on webhook signal
  }
  if (inquireOk === false) {
    await db.update(schema.paymentTransactions).set({ status: 'pending_review' }).where(eq(schema.paymentTransactions.id, payment.id));
    return { handled: true, note: 'inquireTransaction contradicts event → pending_review' };
  }

  const result = await settlePayment({
    paymentId: payment.id,
    source: 'bale',
    providerChargeId: event.telegram_payment_charge_id,
    providerWalletTracking: event.provider_payment_charge_id,
    payload: event.invoice_payload,
    settledVia: 'webhook',
  });

  if (result.outcome === 'settled' && link && bale.sendMessage) {
    // Best-effort receipt message; failures never affect settlement.
    await bale.sendMessage(link.baleChatId, `پرداخت شما تأیید شد. ${result.creditsGranted} اعتبار اضافه شد. با تشکر!`);
  }
  return {
    handled: true,
    note: result.outcome === 'settled' ? `settled +${result.creditsGranted}` : 'already_settled',
  };
}

// ---------------------------------------------------------------------------
// /start <code> linking handler.

export async function handleStartCommand(msg: { chatId: string; fromId: string; code: string; username?: string }): Promise<WebhookOutcome> {
  if (!msg.code) {
    await bale.sendMessage?.(msg.chatId, 'برای اتصال حساب، از داشبورد پاکینو کد اتصال بگیرید و همین‌جا بفرستید: /start CODE');
    return { handled: true, note: 'start without code' };
  }
  const result = await consumeLinkCode(msg.code, msg.chatId, msg.fromId, msg.username);
  if (result.ok) {
    await bale.sendMessage?.(msg.chatId, 'حساب شما با موفقیت به پاکینو متصل شد. حالا می‌توانید از داشبورد خرید کنید.');
    return { handled: true, note: `linked user=${result.userId}${result.relinked ? ' (relinked)' : ''}` };
  }
  const messages: Record<string, string> = {
    INVALID_CODE: 'کد اتصال نامعتبر است. از داشبورد پاکینو کد جدید بگیرید.',
    EXPIRED_CODE: 'کد اتصال منقضی شده است. از داشبورد پاکینو کد جدید بگیرید.',
    CHAT_ALREADY_LINKED: 'این حساب بله قبلاً به یک کاربر پاکینو متصل است.',
    CODE_BOUND_TO_OTHER_USER: 'کد اتصال نامعتبر است.',
  };
  await bale.sendMessage?.(msg.chatId, messages[result.reason] ?? messages.INVALID_CODE!);
  return { handled: true, note: `link rejected: ${result.reason}` };
}

// ---------------------------------------------------------------------------
// Update dispatcher — shared by webhook route and the getUpdates drain.

export async function processUpdate(update: unknown): Promise<WebhookOutcome> {
  if (typeof update !== 'object' || update === null) return { handled: false, note: 'malformed update' };

  const pre = parsePreCheckoutQuery(update);
  if (pre) return handlePreCheckout(pre);

  const sp = parseSuccessfulPayment(update);
  if (sp) {
    const senderId = extractMessageSenderId(update);
    return handleSuccessfulPayment(sp, senderId);
  }

  const start = parseStartCommand(update);
  if (start) return handleStartCommand(start);

  return { handled: false, note: 'unknown update type ignored' };
}

function extractMessageSenderId(update: unknown): number | null {
  const msg = (update as { message?: { from?: { id?: unknown }; chat?: { id?: unknown } } }).message;
  const id = msg?.from?.id ?? msg?.chat?.id;
  return typeof id === 'number' ? id : null;
}
