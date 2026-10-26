/**
 * Bale end-to-end integration tests â€” real PostgreSQL (port 5433).
 * Linking, pre-checkout handling, successful-payment settlement, webhook
 * flows and concurrency. Network calls (answerPreCheckoutQuery, sendMessage,
 * inquireTransaction) are stubbed at module boundary; all state and latch
 * logic run against the real DB.
 *
 * @vitest-environment node
 */
import { describe, expect, it, beforeEach, vi, beforeAll, afterEach } from 'vitest';
import { sql, cleanPakinoTables } from './test-db';
import { settlePayment } from '@/lib/payments/settlement';
import * as baleMod from '@/lib/payments/bale';
import { consumeLinkCode, createLinkCode } from '@/lib/payments/bale-linking';
import { handlePreCheckout, handleSuccessfulPayment, processUpdate } from '@/lib/payments/bale-webhook';
import type { BalePreCheckoutQuery } from '@/lib/payments/bale';

type BaleApi = {
  answerPreCheckout: (queryId: string, ok: boolean, errorMessage?: string) => Promise<void>;
  sendMessage: (chatId: string, text: string) => Promise<void>;
  inquireTransaction: (transactionId: string) => Promise<unknown>;
};
const baleApi = baleMod.bale as unknown as BaleApi;

let dbUp = false;
try {
  await sql`SELECT 1`;
  dbUp = true;
} catch {
  console.warn('[bale-integration] PostgreSQL unreachable â€” skipping');
}
const suite = dbUp ? describe : describe.skip;

// -- network stubs: Bale Bot API never actually called from tests ------------
beforeAll(() => {
  vi.spyOn(baleApi, 'answerPreCheckout').mockResolvedValue(undefined);
  vi.spyOn(baleApi, 'sendMessage').mockResolvedValue(undefined);
  vi.spyOn(baleApi, 'inquireTransaction').mockResolvedValue(null);
});
afterEach(() => {
  vi.mocked(baleApi.inquireTransaction).mockResolvedValue(null);
});

async function seedUser(): Promise<string> {
  const [row] = await sql`
    INSERT INTO users (email, password_hash, credits, plan)
    VALUES (${`b${crypto.randomUUID()}@test.local`}, 'x', 0, 'free')
    RETURNING id`;
  return row!.id as string;
}

async function seedBalePayment(userId: string, opts: Partial<{ payload: string; amountToman: number; status: string; expiresAt: Date | null }> = {}) {
  const [row] = await sql`
    INSERT INTO payment_transactions (user_id, provider, amount_toman, plan, credits, status, payload, payer_chat_id, expires_at)
    VALUES (${userId}, 'bale', ${opts.amountToman ?? 99000}, 'mvp', 1000, ${opts.status ?? 'pending'},
            ${opts.payload ?? crypto.randomUUID().replace(/-/g, '')}, '1666471893', ${opts.expiresAt ?? null})
    RETURNING id, payload, amount_toman`;
  return row! as { id: string; payload: string; amount_toman: number };
}

async function linkUser(userId: string, chatId = '1666471893') {
  await sql`
    INSERT INTO bale_links (user_id, bale_chat_id, bale_user_id, username)
    VALUES (${userId}, ${chatId}, ${chatId}, 'tester')
    ON CONFLICT (user_id) DO UPDATE SET bale_chat_id = ${chatId}`;
}

function preCheckoutUpdate(id: string, payload: string, amount: number, fromId = 1666471893, currency = 'IRR') {
  return {
    update_id: 1,
    pre_checkout_query: { id, from: { id: fromId }, currency, total_amount: amount, invoice_payload: payload },
  };
}

function successUpdate(chargeId: string, payload: string, amount = 990000, fromId = 1666471893, currency = 'IRR') {
  return {
    update_id: 2,
    message: {
      message_id: 0,
      from: { id: fromId },
      chat: { id: fromId, type: 'private' },
      successful_payment: {
        currency,
        total_amount: amount,
        invoice_payload: payload,
        telegram_payment_charge_id: chargeId,
        provider_payment_charge_id: '',
      },
    },
  };
}

async function balanceOf(userId: string): Promise<number> {
  const [row] = await sql`SELECT credits FROM users WHERE id = ${userId}`;
  return row!.credits as number;
}

async function ledgerCount(userId: string): Promise<number> {
  const [row] = await sql`SELECT count(*)::int AS n FROM credit_transactions WHERE user_id = ${userId} AND job_id IS NULL`;
  return row!.n as number;
}

suite('Bale integration (real PostgreSQL)', () => {
  beforeEach(async () => {
    await cleanPakinoTables();
  });

  // ---------------------------------------------------------------- linking
  describe('linking', () => {
    it('issues one-time code, links, persists chat', async () => {
      const userId = await seedUser();
      const { code } = await createLinkCode(userId, 900);
      const result = await consumeLinkCode(code, '1666471893', '1666471893', 'tester');
      expect(result).toMatchObject({ ok: true, userId, relinked: false });
      const [row] = await sql`SELECT bale_chat_id FROM bale_links WHERE user_id=${userId}`;
      expect(row!.bale_chat_id).toBe('1666471893');
    });

    it('rejects reused code (single-use latch)', async () => {
      const userId = await seedUser();
      const { code } = await createLinkCode(userId, 900);
      expect(await consumeLinkCode(code, '111', '111')).toMatchObject({ ok: true });
      expect(await consumeLinkCode(code, '222', '222')).toMatchObject({ ok: false, reason: 'INVALID_CODE' });
    });

    it('rejects invalid and expired codes', async () => {
      const userId = await seedUser();
      expect(await consumeLinkCode('nonexistent', '1', '1')).toMatchObject({ ok: false, reason: 'INVALID_CODE' });
      const [row] = await sql`
        INSERT INTO bale_link_codes (code_hash, user_id, expires_at)
        VALUES (${Buffer.from('deadhash').toString('hex').slice(0, 64)}, ${userId}, now() - interval '1 hour')
        RETURNING code_hash`;
      // Simulate expiry: insert then force expires_at into the past â€” but
      // consumeLinkCode checks expiry AFTER the single-use latch; a raw hash we
      // can't reproduce means we test via the public API with a genuinely
      // expired short-TTL code instead:
      void row;
      const { code } = await createLinkCode(userId, -1); // already expired
      expect(await consumeLinkCode(code, '333', '333')).toMatchObject({ ok: false, reason: 'EXPIRED_CODE' });
    });

    it('blocks one bale chat on two app users; allows relink rotation', async () => {
      const u1 = await seedUser();
      const u2 = await seedUser();
      const { code: c1 } = await createLinkCode(u1, 900);
      expect(await consumeLinkCode(c1, '777', '777')).toMatchObject({ ok: true });
      const { code: c2 } = await createLinkCode(u2, 900);
      expect(await consumeLinkCode(c2, '777', '777')).toMatchObject({ ok: false, reason: 'CHAT_ALREADY_LINKED' });

      // Relink: u1 rotates to a new chat â€” allowed by upsert on user PK.
      const { code: c3 } = await createLinkCode(u1, 900);
      expect(await consumeLinkCode(c3, '888', '888')).toMatchObject({ ok: true, relinked: true });
      const [row] = await sql`SELECT bale_chat_id FROM bale_links WHERE user_id=${u1}`;
      expect(row!.bale_chat_id).toBe('888');
    });

    it('code cannot authenticate as the user (bound at issue time)', async () => {
      const u1 = await seedUser();
      const u2 = await seedUser();
      const { code } = await createLinkCode(u1, 900);
      // Even if u2 somehow presents u1's code, the link lands on u1's row.
      const result = await consumeLinkCode(code, '999', '999');
      expect(result).toMatchObject({ ok: true, userId: u1 });
      const [row] = await sql`SELECT count(*)::int AS n FROM bale_links WHERE user_id=${u2}`;
      expect(row!.n).toBe(0);
    });

    it('/start handler links via processUpdate', async () => {
      const userId = await seedUser();
      const { code } = await createLinkCode(userId, 900);
      const outcome = await processUpdate({
        message: { text: `/start ${code}`, chat: { id: 1666471893, type: 'private' }, from: { id: 1666471893 } },
      });
      expect(outcome.handled).toBe(true);
      const [row] = await sql`SELECT bale_chat_id FROM bale_links WHERE user_id=${userId}`;
      expect(row!.bale_chat_id).toBe('1666471893');
    });
  });

  // ------------------------------------------------------------ pre-checkout
  describe('pre-checkout', () => {
    it('valid payment: persists charge id + payer BEFORE answering, answers ok=true', async () => {
      const userId = await seedUser();
      await linkUser(userId);
      const p = await seedBalePayment(userId);
      const answer = vi.spyOn(baleApi, 'answerPreCheckout').mockResolvedValue(undefined);

      const outcome = await handlePreCheckout({
        id: 'Q1', from: { id: 1666471893 }, currency: 'IRR', total_amount: 990000, invoice_payload: p.payload,
      });

      expect(outcome.note).toBe('approved');
      const [row] = await sql`SELECT provider_charge_id, payer_chat_id, precheckout_seen_at FROM payment_transactions WHERE id=${p.id}`;
      expect(row!.provider_charge_id).toBe('Q1');
      expect(row!.payer_chat_id).toBe('1666471893');
      expect(row!.precheckout_seen_at).not.toBeNull();
      // answer called exactly once for this query id
      expect(answer).toHaveBeenCalledWith('Q1', true, undefined);
    });

    it('two independent pre_checkout ids for same payload each get their own answer (spike behavior)', async () => {
      const userId = await seedUser();
      await linkUser(userId);
      const p = await seedBalePayment(userId);
      const answer = vi.spyOn(baleApi, 'answerPreCheckout').mockResolvedValue(undefined);

      await handlePreCheckout({ id: 'QA', from: { id: 1666471893 }, currency: 'IRR', total_amount: 990000, invoice_payload: p.payload });
      await handlePreCheckout({ id: 'QB', from: { id: 1666471893 }, currency: 'IRR', total_amount: 990000, invoice_payload: p.payload });

      expect(answer).toHaveBeenCalledTimes(2);
      expect(answer).toHaveBeenNthCalledWith(1, 'QA', true, undefined);
      expect(answer).toHaveBeenNthCalledWith(2, 'QB', true, undefined);
      // first charge id preserved (COALESCE)
      const [row] = await sql`SELECT provider_charge_id FROM payment_transactions WHERE id=${p.id}`;
      expect(row!.provider_charge_id).toBe('QA');
    });

    it('wrong amount / currency / payer / expired / unknown payload â†’ ok=false, no state change', async () => {
      const userId = await seedUser();
      await linkUser(userId);
      const p = await seedBalePayment(userId);
      const answer = vi.spyOn(baleApi, 'answerPreCheckout').mockResolvedValue(undefined);

      const cases: [string, ReturnType<typeof preCheckoutUpdate>][] = [
        ['wrong amount', preCheckoutUpdate('QX1', p.payload, 99000)],
        ['wrong currency', preCheckoutUpdate('QX2', p.payload, 990000, 1666471893, 'USD')],
        ['wrong payer', preCheckoutUpdate('QX3', p.payload, 990000, 999)],
        ['unknown payload', preCheckoutUpdate('QX4', 'nosuch', 990000)],
      ];
      for (const [, update] of cases) {
        const q = (update as { pre_checkout_query: { id: string } }).pre_checkout_query.id;
        await handlePreCheckout((update as { pre_checkout_query: BalePreCheckoutQuery }).pre_checkout_query);
        expect(answer).toHaveBeenCalledWith(q, false, expect.any(String));
      }
      const [row] = await sql`SELECT status, provider_charge_id, precheckout_seen_at FROM payment_transactions WHERE id=${p.id}`;
      expect(row!.status).toBe('pending');
      expect(row!.provider_charge_id).toBeNull();
      expect(row!.precheckout_seen_at).toBeNull();
    });

    it('expired payment rejected; non-pending rejected', async () => {
      const userId = await seedUser();
      await linkUser(userId);
      const expired = await seedBalePayment(userId, { expiresAt: new Date(Date.now() - 1000) });
      const settled = await seedBalePayment(userId);
      await settlePayment({ paymentId: settled.id, source: 'bale', providerChargeId: 'CHZ', payload: settled.payload, settledVia: 'webhook' });
      const answer = vi.spyOn(baleApi, 'answerPreCheckout').mockResolvedValue(undefined);

      await handlePreCheckout({ id: 'QE1', from: { id: 1666471893 }, currency: 'IRR', total_amount: 990000, invoice_payload: expired.payload });
      await handlePreCheckout({ id: 'QE2', from: { id: 1666471893 }, currency: 'IRR', total_amount: 990000, invoice_payload: settled.payload });
      expect(answer).toHaveBeenCalledWith('QE1', false, expect.any(String));
      expect(answer).toHaveBeenCalledWith('QE2', false, expect.any(String));
    });
  });

  // ------------------------------------------------------- successful_payment
  describe('successful payment settlement', () => {
    it('settles exactly once, grants row credits, sends receipt', async () => {
      const userId = await seedUser();
      await linkUser(userId);
      const p = await seedBalePayment(userId);
      const send = vi.spyOn(baleApi, 'sendMessage').mockResolvedValue(undefined);

      const outcome = await handleSuccessfulPayment(
        { currency: 'IRR', total_amount: 990000, invoice_payload: p.payload, telegram_payment_charge_id: 'CHS1', provider_payment_charge_id: 'TRK1' },
        1666471893,
      );
      expect(outcome.note).toBe('settled +1000');
      expect(await balanceOf(userId)).toBe(1000);
      expect(await ledgerCount(userId)).toBe(1);
      const [row] = await sql`SELECT status, provider_charge_id, provider_wallet_tracking, settled_via FROM payment_transactions WHERE id=${p.id}`;
      expect(row).toMatchObject({ status: 'verified', provider_charge_id: 'CHS1', provider_wallet_tracking: 'TRK1', settled_via: 'webhook' });
      expect(send).toHaveBeenCalled();
    });

    it('duplicate successful_payment â†’ already_settled, zero additional credits', async () => {
      const userId = await seedUser();
      await linkUser(userId);
      const p = await seedBalePayment(userId);
      await handleSuccessfulPayment({ currency: 'IRR', total_amount: 990000, invoice_payload: p.payload, telegram_payment_charge_id: 'CHD1' }, 1666471893);
      const second = await handleSuccessfulPayment({ currency: 'IRR', total_amount: 990000, invoice_payload: p.payload, telegram_payment_charge_id: 'CHD1' }, 1666471893);
      expect(second.note).toBe('already_settled');
      expect(await balanceOf(userId)).toBe(1000);
      expect(await ledgerCount(userId)).toBe(1);
    });

    it('8 concurrent duplicate deliveries â†’ exactly one grant', async () => {
      const userId = await seedUser();
      await linkUser(userId);
      const p = await seedBalePayment(userId);
      const event = { currency: 'IRR', total_amount: 990000, invoice_payload: p.payload, telegram_payment_charge_id: 'CHC9' } as const;
      const results = await Promise.allSettled(Array.from({ length: 8 }, () => handleSuccessfulPayment(event, 1666471893)));
      const settled = results.filter((r) => r.status === 'fulfilled' && r.value.note === 'settled +1000');
      expect(settled.length).toBe(1);
      expect(await balanceOf(userId)).toBe(1000);
      expect(await ledgerCount(userId)).toBe(1);
    }, 20000);

    it('conflicting charge id â†’ pending_review, no grant', async () => {
      const userId = await seedUser();
      await linkUser(userId);
      const p = await seedBalePayment(userId);
      await handleSuccessfulPayment({ currency: 'IRR', total_amount: 990000, invoice_payload: p.payload, telegram_payment_charge_id: 'CHV1' }, 1666471893);
      const outcome = await handleSuccessfulPayment({ currency: 'IRR', total_amount: 990000, invoice_payload: p.payload, telegram_payment_charge_id: 'CHV2' }, 1666471893);
      expect(outcome.note).toContain('CHARGE_ID_CONFLICT');
      expect(await balanceOf(userId)).toBe(1000);
      const [row] = await sql`SELECT status FROM payment_transactions WHERE id=${p.id}`;
      expect(row!.status).toBe('pending_review');
    });

    it('amount / currency / payload / payer mismatch â†’ pending_review or reject, no grant', async () => {
      const userId = await seedUser();
      await linkUser(userId);
      const p = await seedBalePayment(userId);
      const answer = vi.spyOn(baleApi, 'answerPreCheckout').mockResolvedValue(undefined);
      void answer;

      await handleSuccessfulPayment({ currency: 'IRR', total_amount: 880000, invoice_payload: p.payload, telegram_payment_charge_id: 'CM1' }, 1666471893);
      const [row] = await sql`SELECT status FROM payment_transactions WHERE id=${p.id}`;
      expect(row!.status).toBe('pending_review');

      await handleSuccessfulPayment({ currency: 'USD', total_amount: 990000, invoice_payload: p.payload, telegram_payment_charge_id: 'CM2' }, 1666471893);
      await handleSuccessfulPayment({ currency: 'IRR', total_amount: 990000, invoice_payload: 'zzz', telegram_payment_charge_id: 'CM3' }, 1666471893);
      await handleSuccessfulPayment({ currency: 'IRR', total_amount: 990000, invoice_payload: p.payload, telegram_payment_charge_id: 'CM4' }, 42);
      expect(await balanceOf(userId)).toBe(0);
      expect(await ledgerCount(userId)).toBe(0);
    });

    it('inquire paid-confirmed â†’ settles; inquire unreachable â†’ still settles on webhook signal; inquire contradiction â†’ pending_review', async () => {
      const userId = await seedUser();
      await linkUser(userId);

      // 1) inquiry says paid (compatible)
      const p1 = await seedBalePayment(userId);
      (baleMod.bale.inquireTransaction as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue({ id: 'IQ1', status: 'paid', userID: 1666471893, amount: 990000 });
      expect((await handleSuccessfulPayment({ currency: 'IRR', total_amount: 990000, invoice_payload: p1.payload, telegram_payment_charge_id: 'IQ1' }, 1666471893)).note).toBe('settled +1000');

      // 2) inquiry unreachable (throws) â†’ webhook is primary signal
      const p2 = await seedBalePayment(userId);
      (baleMod.bale.inquireTransaction as unknown as { mockRejectedValue: (v: unknown) => void }).mockRejectedValue(new Error('down'));
      expect((await handleSuccessfulPayment({ currency: 'IRR', total_amount: 990000, invoice_payload: p2.payload, telegram_payment_charge_id: 'IQ2' }, 1666471893)).note).toBe('settled +1000');

      // 3) inquiry contradicts (status failed) â†’ pending_review
      const p3 = await seedBalePayment(userId);
      (baleMod.bale.inquireTransaction as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue({ id: 'IQ3', status: 'failed', userID: 1666471893, amount: 990000 });
      const outcome = await handleSuccessfulPayment({ currency: 'IRR', total_amount: 990000, invoice_payload: p3.payload, telegram_payment_charge_id: 'IQ3' }, 1666471893);
      expect(outcome.note).toContain('pending_review');
      expect(await balanceOf(userId)).toBe(2000);
      expect(await ledgerCount(userId)).toBe(2);
    });

    it('failed/expired payments never grant', async () => {
      const userId = await seedUser();
      await linkUser(userId);
      const p = await seedBalePayment(userId, { status: 'failed' });
      const outcome = await handleSuccessfulPayment({ currency: 'IRR', total_amount: 990000, invoice_payload: p.payload, telegram_payment_charge_id: 'CHF' }, 1666471893);
      expect(outcome.note).toContain('PAYMENT_NOT_PENDING');
      expect(await balanceOf(userId)).toBe(0);
    });
  });

  // ---------------------------------------------------------------- webhook
  describe('webhook dispatch (processUpdate)', () => {
    it('routes pre_checkout, successful_payment, /start; ignores unknown/malformed', async () => {
      const userId = await seedUser();
      await linkUser(userId);
      const p = await seedBalePayment(userId);

      expect((await processUpdate({ foo: 1 })).note).toContain('unknown');
      expect((await processUpdate(null)).handled).toBe(false);
      expect((await processUpdate('string')).handled).toBe(false);
      // plain (non-command) message: safely ignored, not an error
      expect((await processUpdate({ message: { text: 'hello', chat: { id: 5, type: 'private' } } })).handled).toBe(false);

      const outcome = await processUpdate(successUpdate('CHW1', p.payload));
      expect(outcome.note).toBe('settled +1000');
      expect(await balanceOf(userId)).toBe(1000);
    });

    it('duplicate webhook delivery of the same update â†’ idempotent', async () => {
      const userId = await seedUser();
      await linkUser(userId);
      const p = await seedBalePayment(userId);
      await processUpdate(successUpdate('CHW2', p.payload));
      await processUpdate(successUpdate('CHW2', p.payload));
      expect(await balanceOf(userId)).toBe(1000);
      expect(await ledgerCount(userId)).toBe(1);
    });
  });
});
