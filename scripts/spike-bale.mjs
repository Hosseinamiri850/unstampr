// Bale API spike probes. Reads BALE_BOT_TOKEN from .env (gitignored).
// Usage: node scripts/spike-bale.mjs <probe>
// Probes: getme | createinvoicelink | sendinvoice | help

import { readFileSync } from 'node:fs';

function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch { /* no .env */ }
}
loadEnv();

const TOKEN = process.env.BALE_BOT_TOKEN;
if (!TOKEN) {
  console.error('BALE_BOT_TOKEN missing (bot auth token from @botfather, format 123456789:abc...).');
  console.error('WALLET-TEST-... is the PAYMENT provider_token — it goes in sendInvoice/createInvoiceLink body, NOT the URL.');
  process.exit(1);
}
const PROVIDER_TOKEN = process.env.BALE_PROVIDER_TOKEN ?? 'WALLET-TEST-1111111111111111';
const API = `https://tapi.bale.ai/bot${TOKEN}`;

async function call(method, body) {
  const t0 = Date.now();
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const ms = Date.now() - t0;
  let json;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  console.log(`\n=== ${method} === HTTP ${res.status} (${ms}ms)`);
  console.log(JSON.stringify(json, null, 2));
  return { status: res.status, json };
}

const probe = process.argv[2] ?? 'help';

if (probe === 'getme') {
  await call('getMe');
} else if (probe === 'createinvoicelink') {
  // 99000 Toman MVP plan = 990000 IRR
  await call('createInvoiceLink', {
    title: 'Pakino MVP Plan',
    description: '1000 credits for Pakino watermark removal',
    payload: `spike-${Date.now()}`,
    provider_token: PROVIDER_TOKEN,
    currency: 'IRR',
    prices: [{ label: 'Pakino MVP', amount: 990000 }],
  });
} else if (probe === 'sendinvoice') {
  // requires chat_id: get one by sending /start to the bot first, then getUpdates
  const chatId = process.argv[3];
  if (!chatId) { console.error('usage: node scripts/spike-bale.mjs sendinvoice <chat_id>'); process.exit(1); }
  await call('sendInvoice', {
    chat_id: Number(chatId),
    title: 'Pakino MVP Plan',
    description: '1000 credits for Pakino watermark removal',
    payload: `spike-${Date.now()}`,
    provider_token: PROVIDER_TOKEN,
    currency: 'IRR',
    prices: [{ label: 'Pakino MVP', amount: 990000 }],
  });
} else if (probe === 'getupdates') {
  const offset = process.argv[3] ? Number(process.argv[3]) : undefined;
  await call('getUpdates', offset !== undefined ? { offset, timeout: 0 } : { timeout: 0 });
} else if (probe === 'inquire') {
  const txId = process.argv[3];
  if (!txId) { console.error('usage: node scripts/spike-bale.mjs inquire <transaction_id>'); process.exit(1); }
  await call('inquireTransaction', { transaction_id: txId });
} else if (probe === 'answerprecheckout') {
  const [qId, ok, err] = [process.argv[3], process.argv[4] === 'true', process.argv[5]];
  if (!qId) { console.error('usage: node scripts/spike-bale.mjs answerprecheckout <query_id> <true|false> [error_message]'); process.exit(1); }
  await call('answerPreCheckoutQuery', { pre_checkout_query_id: qId, ok, error_message: err });
} else if (probe === 'getwebhookinfo') {
  await call('getWebhookInfo');
} else if (probe === 'deletewebhook') {
  await call('deleteWebhook');
} else {
  console.log(`probes: getme | createinvoicelink | sendinvoice <chat_id> | getupdates [offset]
  | inquire <transaction_id> | answerprecheckout <query_id> <true|false> [error_message]
  | getwebhookinfo | deletewebhook`);
}
