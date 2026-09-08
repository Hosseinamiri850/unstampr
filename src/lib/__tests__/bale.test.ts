/**
 * Bale provider unit tests — pure logic (conversion, parsing, validation).
 * No network, no DB.
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  tomanToRial,
  parsePreCheckoutQuery,
  parseSuccessfulPayment,
  parseStartCommand,
  evaluatePreCheckout,
  evaluateSuccessfulPayment,
} from '@/lib/payments/bale';

describe('tomanToRial', () => {
  it('converts ×10 and stays integral', () => {
    expect(tomanToRial(99000)).toBe(990000);
    expect(tomanToRial(1)).toBe(10);
    expect(Number.isInteger(tomanToRial(12345))).toBe(true);
  });
});

describe('parsePreCheckoutQuery', () => {
  const valid = {
    update_id: 1,
    pre_checkout_query: {
      id: '6807267843853683805',
      from: { id: 1666471893, username: 'tester' },
      currency: 'IRR',
      total_amount: 990000,
      invoice_payload: 'abc123',
    },
  };

  it('accepts a spike-verified shape', () => {
    const q = parsePreCheckoutQuery(valid);
    expect(q).toMatchObject({ id: '6807267843853683805', currency: 'IRR', total_amount: 990000, invoice_payload: 'abc123' });
    expect(q!.from.id).toBe(1666471893);
  });

  it.each([
    ['missing query', {}],
    ['null query', { pre_checkout_query: null }],
    ['id not string', { pre_checkout_query: { ...valid.pre_checkout_query, id: 5 } }],
    ['payload missing', { pre_checkout_query: { ...valid.pre_checkout_query, invoice_payload: undefined } }],
    ['amount not number', { pre_checkout_query: { ...valid.pre_checkout_query, total_amount: '990000' } }],
    ['from missing', { pre_checkout_query: { ...valid.pre_checkout_query, from: undefined } }],
  ])('rejects: %s', (_name, update) => {
    expect(parsePreCheckoutQuery(update)).toBeNull();
  });
});

describe('parseSuccessfulPayment', () => {
  const valid = {
    update_id: 2,
    message: {
      message_id: 0,
      from: { id: 1666471893 },
      chat: { id: 1666471893, type: 'private' },
      successful_payment: {
        currency: 'IRR',
        total_amount: 990000,
        invoice_payload: 'abc123',
        telegram_payment_charge_id: '6807267843853683805',
        provider_payment_charge_id: '',
      },
    },
  };

  it('accepts a spike-verified shape (empty wallet tracking)', () => {
    const sp = parseSuccessfulPayment(valid);
    expect(sp).toMatchObject({ currency: 'IRR', total_amount: 990000, telegram_payment_charge_id: '6807267843853683805' });
    expect(sp!.provider_payment_charge_id).toBe('');
  });

  it.each([
    ['no message', {}],
    ['no successful_payment', { message: {} }],
    ['missing charge id', { message: { successful_payment: { currency: 'IRR', total_amount: 1, invoice_payload: 'x' } } }],
    ['currency not string', { message: { successful_payment: { currency: 7, total_amount: 1, invoice_payload: 'x', telegram_payment_charge_id: 'c' } } }],
  ])('rejects: %s', (_name, update) => {
    expect(parseSuccessfulPayment(update)).toBeNull();
  });
});

describe('parseStartCommand', () => {
  it('extracts code from private /start', () => {
    const r = parseStartCommand({
      message: { text: '/start deadbeef00', chat: { id: 1666471893, type: 'private' }, from: { id: 1666471893, username: 'tester' } },
    });
    expect(r).toMatchObject({ chatId: '1666471893', fromId: '1666471893', code: 'deadbeef00', username: 'tester' });
  });

  it('rejects group chats', () => {
    expect(parseStartCommand({ message: { text: '/start c', chat: { id: -100, type: 'group' } } })).toBeNull();
  });

  it('rejects non-start messages', () => {
    expect(parseStartCommand({ message: { text: 'hello', chat: { id: 1, type: 'private' } } })).toBeNull();
  });
});

describe('evaluatePreCheckout', () => {
  const basePayment = {
    provider: 'bale',
    status: 'pending',
    amountToman: 99000,
    payload: 'tok-1',
    payerChatId: null,
    expiresAt: null,
    linkedChatId: null,
  };
  const baseQuery = { invoice_payload: 'tok-1', currency: 'IRR', total_amount: 990000 };

  it('approves a valid payment', () => {
    expect(evaluatePreCheckout(basePayment, baseQuery, 1666471893)).toEqual({ approved: true });
  });

  it('rejects missing payment / wrong provider', () => {
    expect(evaluatePreCheckout(null, baseQuery, 1).approved).toBe(false);
    expect(evaluatePreCheckout({ ...basePayment, provider: 'zarinpal' }, baseQuery, 1).approved).toBe(false);
  });

  it('rejects non-pending status', () => {
    for (const status of ['verified', 'failed', 'expired', 'pending_review']) {
      expect(evaluatePreCheckout({ ...basePayment, status }, baseQuery, 1).approved).toBe(false);
    }
  });

  it('rejects payload mismatch', () => {
    expect(evaluatePreCheckout(basePayment, { ...baseQuery, invoice_payload: 'other' }, 1).approved).toBe(false);
  });

  it('rejects wrong currency and wrong amount', () => {
    expect(evaluatePreCheckout(basePayment, { ...baseQuery, currency: 'USD' }, 1).approved).toBe(false);
    expect(evaluatePreCheckout(basePayment, { ...baseQuery, total_amount: 99000 }, 1).approved).toBe(false); // toman not rial
  });

  it('rejects expired payment', () => {
    const past = new Date(Date.now() - 1000);
    expect(evaluatePreCheckout({ ...basePayment, expiresAt: past }, baseQuery, 1).approved).toBe(false);
  });

  it('rejects payer not matching linked chat or stored payer', () => {
    expect(evaluatePreCheckout({ ...basePayment, linkedChatId: '111' }, baseQuery, 222).approved).toBe(false);
    expect(evaluatePreCheckout({ ...basePayment, payerChatId: '111' }, baseQuery, 222).approved).toBe(false);
  });

  it('accepts multiple independent pre_checkout ids for same payload (each answered separately upstream)', () => {
    expect(evaluatePreCheckout(basePayment, baseQuery, 1).approved).toBe(true);
    expect(evaluatePreCheckout(basePayment, baseQuery, 1).approved).toBe(true);
  });
});

describe('evaluateSuccessfulPayment', () => {
  const baseCtx = {
    provider: 'bale' as const,
    status: 'pending',
    amountToman: 99000,
    payload: 'tok-1',
    payerChatId: null,
    linkedChatId: null,
    existingChargeId: null,
    existingRefId: null,
  };
  const baseEvent = {
    currency: 'IRR',
    total_amount: 990000,
    invoice_payload: 'tok-1',
    telegram_payment_charge_id: 'CH1',
    provider_payment_charge_id: '',
  };

  it('accepts a valid event', () => {
    expect(evaluateSuccessfulPayment(baseCtx, baseEvent, null)).toEqual({ ok: true });
  });

  it.each([
    ['PAYLOAD_MISMATCH', { ...baseEvent, invoice_payload: 'other' }],
    ['CURRENCY_MISMATCH', { ...baseEvent, currency: 'USD' }],
    ['AMOUNT_MISMATCH', { ...baseEvent, total_amount: 99000 }],
  ] as const)('rejects %s', (reason, event) => {
    expect(evaluateSuccessfulPayment(baseCtx, event, null)).toEqual({ ok: false, reason });
  });

  it('rejects payer mismatch (sender vs stored payer/linked chat)', () => {
    expect(evaluateSuccessfulPayment({ ...baseCtx, payerChatId: '111' }, baseEvent, '222')).toEqual({ ok: false, reason: 'PAYER_MISMATCH' });
    expect(evaluateSuccessfulPayment({ ...baseCtx, linkedChatId: '111' }, baseEvent, '222')).toEqual({ ok: false, reason: 'PAYER_MISMATCH' });
  });

  it('duplicate delivery with same charge id on verified row → ok (settlePayment returns already_settled)', () => {
    expect(evaluateSuccessfulPayment({ ...baseCtx, status: 'verified', existingChargeId: 'CH1' }, baseEvent, null)).toEqual({ ok: true });
  });

  it('conflicting charge id on verified row → CHARGE_ID_CONFLICT', () => {
    expect(evaluateSuccessfulPayment({ ...baseCtx, status: 'verified', existingChargeId: 'CH1' }, { ...baseEvent, telegram_payment_charge_id: 'CH2' }, null)).toEqual({
      ok: false,
      reason: 'CHARGE_ID_CONFLICT',
    });
  });

  it('failed/expired/pending_review rows rejected', () => {
    for (const status of ['failed', 'expired', 'pending_review']) {
      expect(evaluateSuccessfulPayment({ ...baseCtx, status }, baseEvent, null).ok).toBe(false);
    }
  });
});

describe('bale provider fetch behavior', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env.BALE_BOT_TOKEN = 'testbottoken';
    process.env.BALE_PROVIDER_TOKEN = 'WALLET-TEST-1111111111111111';
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.BALE_BOT_TOKEN = originalEnv.BALE_BOT_TOKEN;
    process.env.BALE_PROVIDER_TOKEN = originalEnv.BALE_PROVIDER_TOKEN;
  });

  it('createPayment sends provider_token (not bot token) and integer IRR amount', async () => {
    const { bale } = await import('@/lib/payments/bale');
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1, chat: { id: 5 } } }), { status: 200 });
    }) as unknown as typeof fetch;

    await bale.createPayment({
      amountToman: 99000,
      amountIrr: 990000,
      description: 'Pakino mvp',
      callbackUrl: '',
      userIdentifier: '555',
      payload: 'tok',
    });

    expect(calls[0]!.url).toContain('/bot' + 'testbottoken' + '/sendInvoice');
    expect(calls[0]!.body.provider_token).toBe('WALLET-TEST-1111111111111111');
    expect(calls[0]!.body.currency).toBe('IRR');
    expect((calls[0]!.body.prices as { amount: number }[])[0]!.amount).toBe(990000);
    expect(Number.isInteger((calls[0]!.body.prices as { amount: number }[])[0]!.amount)).toBe(true);
    expect(JSON.stringify(calls[0]!.body)).not.toContain('testbottoken');
  });

  it('surfaces Bale API errors as BaleApiError without retry', async () => {
    const { bale, BaleApiError } = await import('@/lib/payments/bale');
    let fetchCount = 0;
    globalThis.fetch = vi.fn(async () => {
      fetchCount += 1;
      return new Response(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: chat not found' }), { status: 400 });
    }) as unknown as typeof fetch;

    await expect(
      bale.createPayment({ amountToman: 1000, amountIrr: 10000, description: 'x', callbackUrl: '', userIdentifier: '1', payload: 'p' }),
    ).rejects.toBeInstanceOf(BaleApiError);
    expect(fetchCount).toBe(1); // API errors never retried
  });

  it('retries transient network failures up to 3 attempts', async () => {
    const { bale, BaleApiError } = await import('@/lib/payments/bale');
    let fetchCount = 0;
    globalThis.fetch = vi.fn(async () => {
      fetchCount += 1;
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;

    await expect(
      bale.createPayment({ amountToman: 1000, amountIrr: 10000, description: 'x', callbackUrl: '', userIdentifier: '1', payload: 'p' }),
    ).rejects.toBeInstanceOf(BaleApiError);
    expect(fetchCount).toBe(3);
  }, 15000);

  it('createPayment refuses without configuration', async () => {
    process.env.BALE_BOT_TOKEN = '';
    vi.resetModules(); // getEnv() caches — drop the cached config
    const { bale } = await import('@/lib/payments/bale');
    await expect(
      bale.createPayment({ amountToman: 1000, amountIrr: 10000, description: 'x', callbackUrl: '', userIdentifier: '1', payload: 'p' }),
    ).rejects.toMatchObject({ code: 'BALE_NOT_CONFIGURED' });
  });
});
