// E2E spike: poll getUpdates, persist+log pre_checkout_query, answer ok,
// capture successful_payment, probe inquireTransaction. Ctrl-C to stop.
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
if (!TOKEN) { console.error('BALE_BOT_TOKEN missing'); process.exit(1); }
const API = `https://tapi.bale.ai/bot${TOKEN}`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function call(method, body, attempt = 1) {
  try {
    const res = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { raw: text, status: res.status }; }
  } catch (e) {
    if (attempt < 5) { await sleep(2000 * attempt); return call(method, body, attempt + 1); }
    return { ok: false, error_code: 'NETWORK', description: String(e) };
  }
}

let offset = Number(process.argv[2] ?? 0) || 0;
let sawSuccess = false;

console.log(`polling from offset=${offset} (Ctrl-C to stop)`);

while (true) {
  const r = await call('getUpdates', { offset, timeout: 3 });
  if (!r.ok) { console.error('getUpdates error', JSON.stringify(r)); await sleep(2000); continue; }
  for (const u of r.result ?? []) {
    offset = u.update_id + 1;
    console.log(`\n===== UPDATE update_id=${u.update_id} =====`);
    console.log(JSON.stringify(u, null, 2));

    const q = u.pre_checkout_query;
    if (q) {
      console.log(`\n>>> PERSIST: provider_charge_id (PreCheckoutQuery.id) = "${q.id}"`);
      console.log(`>>> payload=${q.invoice_payload} currency=${q.currency} total_amount=${q.total_amount} from.id=${q.from?.id}`);
      const ans = await call('answerPreCheckoutQuery', { pre_checkout_query_id: q.id, ok: true });
      console.log(`>>> answerPreCheckoutQuery(ok=true) => ${JSON.stringify(ans)}`);
    }

    const sp = u.message?.successful_payment;
    if (sp) {
      sawSuccess = true;
      console.log('\n>>> SUCCESSFUL_PAYMENT captured:');
      console.log(`>>> invoice_payload            = "${sp.invoice_payload}"`);
      console.log(`>>> telegram_payment_charge_id = "${sp.telegram_payment_charge_id}"`);
      console.log(`>>> provider_payment_charge_id = "${sp.provider_payment_charge_id}"`);
      console.log(`>>> currency=${sp.currency} total_amount=${sp.total_amount}`);

      for (const label of ['telegram', 'provider']) {
        const id = label === 'telegram' ? sp.telegram_payment_charge_id : sp.provider_payment_charge_id;
        if (!id) { console.log(`>>> inquireTransaction(${label}) skipped: empty`); continue; }
        const inv = await call('inquireTransaction', { transaction_id: id });
        console.log(`>>> inquireTransaction(${label}: ${id}) => ${JSON.stringify(inv)}`);
      }
    }
  }
  if (sawSuccess) {
    console.log('\nE2E capture complete. Re-run getUpdates with offset if more needed.');
    break;
  }
}
