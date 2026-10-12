# Bale Payments

Bale Bot API wallet payments as a second payment provider next to ZarinPal.
Implemented from live-verified API behavior (spike 2026-09-04 against
`tapi.bale.ai` with the test provider token) — not from Telegram parity.

## Settlement boundary (authoritative)

```
successful_payment webhook event
  → parse (strict)                       src/lib/payments/bale.ts
  → evaluateSuccessfulPayment            payload/amount/currency/payer/charge checks
  → optional inquireTransaction          defense-in-depth, NEVER authoritative
  → settlePayment()                      src/lib/payments/settlement.ts — the ONLY
                                         credit-granting path (atomic latch)
```

No code outside `settlePayment()` grants credits. Amount/credits/plan always
come from the internal `payment_transactions` row; webhook payloads never
supply them.

## Identifier semantics

| Column / concept | Bale source | Notes |
|---|---|---|
| `payload` | Unstampr-generated 160-bit random hex, echoed as `invoice_payload` | correlation only, never auth |
| `provider_charge_id` | `PreCheckoutQuery.id` ≡ `SuccessfulPayment.telegram_payment_charge_id` | canonical tx id; key for `inquireTransaction`; UNIQUE index |
| `provider_wallet_tracking` | `provider_payment_charge_id` | user-visible receipt number; never a DB key |
| `provider_invoice_id` | `createInvoiceLink` result | audit only (unused in web checkout) |
| `provider_ref_id` | ZarinPal `ref_id` only | Bale rows leave NULL |
| `payer_chat_id` | `PreCheckoutQuery.from.id` / linked chat | payer-binding cross-check |

## Flow

1. **Link** — user asks Unstampr for a one-time code (`POST /api/payments/bale/link`).
   Code = 160-bit random, stored SHA-256-hashed, single-use, 15-min TTL.
   User sends `/start <code>` to the bot → webhook links `bale_links(user_id,
   bale_chat_id, bale_user_id)`. One Bale chat ↔ one Unstampr user (unique indexes
   both directions). Relinking rotates the user's binding.
2. **Create** — `POST /api/payments/create {plan, provider:'bale'}`: requires a
   link, inserts the payment row FIRST (pending, payload, `payer_chat_id`,
   `expires_at` = 30-min TTL), then calls `sendInvoice` with
   `provider_token` + integer IRR (`tomanToRial = ×10`, sole conversion point).
   Invoice lands in the user's Bale app. `sendInvoice` failure marks the row
   `failed`. `createInvoiceLink` is NOT used (returns a mini-app invoice id,
   not a web URL — spike-verified).
3. **Pre-checkout** — webhook validates payload/status/provider/currency IRR/
   amount/payer/expiry; persists `provider_charge_id` + `precheckout_seen_at`
   BEFORE answering; answers each `query.id` independently (Bale sends
   superseding queries with new ids — no global answered flag). Rejection
   message is user-safe Persian text, no internals.
4. **Successful payment** — strict parse → validation (see boundary above) →
   `settlePayment({source:'bale', providerChargeId: telegram_payment_charge_id,
   providerWalletTracking, payload, settledVia:'webhook'})` → best-effort
   receipt `sendMessage`.

Duplicate `successful_payment` (same charge id) → `already_settled`, zero
additional credits. Different charge id on the same row → `CHARGE_ID_CONFLICT`
→ routed to `pending_review`. Amount/currency/payer mismatch → `pending_review`
(never auto-settled, never silently dropped).

## Webhook

`POST /api/payments/bale/webhook/<BALE_WEBHOOK_SECRET>`

- Bale's `setWebhook` has NO `secret_token` param (docs + spike). Auth = secret
  path segment, compared with `timingSafeEqual`. Wrong secret → 404.
- Registration (once, after deploy):
  ```bash
  curl -X POST "https://tapi.bale.ai/bot$BALE_BOT_TOKEN/setWebhook" \
       -H 'Content-Type: application/json' \
       -d "{\"url\":\"https://<host>/api/payments/bale/webhook/$BALE_WEBHOOK_SECRET\"}"
  ```
  Verify with `getWebhookInfo`. Ports 443/88 only. HTTPS required.
- All handlers are idempotent; malformed/unknown updates get HTTP 200 so Bale
  never retry-storms. A handler crash is logged and still returns 200 — the
  reconcile sweep recovers.

## Reconciliation

Two layers, neither auto-settles uncertainty:

1. **Sweep** (`POST /api/payments/reconcile`, header `x-reconcile-token`):
   pending Bale rows with `precheckout_seen_at` older than 15 min →
   `inquireTransaction(provider_charge_id)`: `paid` → settle (same latch);
   `failed/rejected` → mark failed; anything else left pending. Payer/amount
   cross-checked. A lost `successful_payment` after an approved pre-checkout is
   recovered here because the charge id was persisted at pre-checkout.
2. **Drain** (`POST /api/payments/bale/drain`, same token; CLI
   `scripts/bale-drain.mjs`): webhook-outage fallback. `getUpdates` with
   persisted offset (`bale_drain_state`, single row, advanced after EACH
   update → restart-safe; settle latch makes re-processing idempotent). Bale
   retains the last 2000 updates / 24 h — the drain window ceiling. Ambiguous
   updates go to `pending_review`, never guessed to paid.

If a pre-checkout was never seen, no charge id exists and payment could not
have finalized (finalization requires our ok-answer) — such rows are void;
sweep ignores them; they age out via admin review.

## Rial/Toman

Internal model (DB, plans, UI) stays **Toman**. Conversion `×10` exists only in
`src/lib/payments/bale.ts` (`tomanToRial`), unit-tested. ZarinPal flow untouched.

## Environment variables

| Var | Purpose |
|---|---|
| `BALE_BOT_TOKEN` | bot auth token (URL path: `bot<TOKEN>`), from @botfather |
| `BALE_PROVIDER_TOKEN` | payment `provider_token` (wallet), separate credential |
| `BALE_WEBHOOK_SECRET` | webhook path secret, 32+ random bytes |
| `BALE_WEBHOOK_ENABLED` | reserved feature flag (webhook auth is always-on when secret set) |
| `BALE_BOT_USERNAME` | deep-link username for linking UI (default `pakino_bot`) |
| `BALE_INVOICE_TTL_SEC` | invoice/payment validity (default 1800) |
| `BALE_LINK_CODE_TTL_SEC` | linking code TTL (default 900) |
| `PAYMENT_DEFAULT_PROVIDER` | `zarinpal` \| `bale` when create omits provider |
| `RECONCILE_TOKEN` | guards reconcile + drain endpoints |

Never log bot/provider tokens, webhook secret, or raw linking codes.

## Tests

```bash
DATABASE_URL="postgres://pakino:pakino@localhost:5433/pakino" npm test
```

DB-backed suites (settlement, zarinpal-callback, bale-integration, credits)
need the compose Postgres on host port 5433; they skip when unreachable.
Coverage: linking matrix (single-use, expiry, chat-collision, relink,
cross-user binding), pre-checkout matrix incl. two-query-ids-per-payload,
settlement exactly-once under 8-way concurrency, charge conflicts, inquire
outage/contradiction, webhook dispatch, migration constraint firing.

## Staging E2E results (2026-09-05, re-validated 2026-09-09)

Environment: local staging on port 3200, real bot `@pakino_bot`, test provider
token, compose Postgres 5433 + Redis. Real wallet token NOT yet activated with
Bale (failed post-pre-checkout with `status:"failed"` during the spike) —
test-token behavior verified, real-wallet behavior pending activation.

| Area | Result |
|---|---|
| Webhook auth | wrong secret → 404; valid → 200 (verified) |
| Malformed/unknown/empty-body updates | 200, ignored, no retry storm (verified) |
| Drain (`getUpdates`) | fetched real update, processed through shared `processUpdate`, offset persisted, rerun = 0 processed (verified) |
| Drain auth | missing/wrong `x-reconcile-token` → 401 (verified) |
| Reconcile auth | missing/wrong token → 401; empty sweep → 200 (verified) |
| Reconcile sweep with real charge id | `paid` → settled (`settled_via='inquire'`), exactly 1000 credits + 1 ledger row; rerun → no double grant (verified) |
| Unknown/invented charge ids in sweep | `unknown-transaction-left-pending` (verified) |
| No-precheckout rows | structurally void, sweep ignores (verified) |
| Duplicate `successful_payment` ×3 | 1 grant, `already_settled` ×2, wallet tracking persisted (verified) |
| Conflicting charge id | `CHARGE_ID_CONFLICT routed to pending_review`, no grant (verified) |
| Replay of the spike's real paid charge id | `already_settled` (verified) |
| DB-down mid-webhook (plain + payment update) | HTTP 200 fast, no crash, no partial state; recovery after restart (verified) |
| Pre-checkout on settled payment / invalid id / stale id | rejected or answered-false; latency ~5 s worst case incl. real API call, inside Bale's 10 s window (verified) |
| Secrets in logs | no token/secret/raw-code logging found (audited) |
| `next build` | OK (first attempt hit a transient Windows `spawn UNKNOWN` during static gen — retried clean) |
| Docker web image | builds (long npm ci; verified in an earlier session, re-run as time permits) |

## Step 6 production-readiness validation (2026-09-09)

Re-run of the full staging E2E on a fresh boot of the production compose stack
(pakino-web 266 MB image, pakino-worker 1.23 GB, Postgres/Redis/MinIO healthy),
staging web on port 4020, real bot `@pakino_bot`, test provider token.

### Verified this pass

| Area | Result |
|---|---|
| Bot API connectivity | `getMe` OK (`@pakino_bot`, id 1731551715); `getWebhookInfo` clean (`url:""`, 0 pending) |
| Webhook auth | wrong secret → 404; valid secret → 200 (verified) |
| Malformed/unknown/empty-body updates | 200 in <40 ms, ignored, no retry storm (verified) |
| `/start` without code through real webhook | handler runs, replies via real `sendMessage`, 200 (verified) |
| Link: valid code | link row created with chat id + bale user id + username (verified) |
| Link: code reuse | rejected `INVALID_CODE`, single-use latch held (verified) |
| Link: chat collision | second user's code on a bound chat → `CHAT_ALREADY_LINKED`, binding unchanged (verified) |
| Link: revoke/relink | delete + new code → fresh binding rotated (verified) |
| Pre-checkout: valid amounts/payer | row persisted `provider_charge_id` + `precheckout_seen_at` + `payer_chat_id` BEFORE answering (verified) |
| Pre-checkout: invented query ids | real Bale API rejects with "query is too old"; handler degrades to fallback rejection, still 200 fast (verified) |
| Pre-checkout: amount/payer/payload mismatch + unknown payload | all rejected before any answer attempt (verified) |
| Pre-checkout: two superseding query ids, one payload | both processed independently, first charge id wins via COALESCE, no global answered state (verified) |
| successful_payment → settle | `settled +1000`; row `verified`, charge/wallet/payload identifiers stored, credits granted, exactly 1 ledger row (verified) |
| Replay ×3 same charge id | `already_settled` ×3, credits + ledger unchanged (verified) |
| Conflicting charge id | `CHARGE_ID_CONFLICT routed to pending_review`, no grant, original charge id preserved (verified) |
| `inquireTransaction` (live) | invented/unknown ids → 404 "transaction not found"; mapping confirmed (`transaction_id` = `telegram_payment_charge_id`) |
| Reconcile sweep | only `pending` + `precheckout_seen` rows scanned; unknown charge id → `unknown-transaction-left-pending`; second sweep identical (idempotent); verified/failed/expired/pending_review rows excluded (verified) |
| Drain | token-guarded; empty queue → `processed:0`, offset unchanged (verified) |
| DB-down mid-webhook | 200 in 538 ms, no partial state; after restart, replayed update ignored (no phantom settlement) (verified) |
| Redis-down | worker logs connection error, process survives; auto-reconnects (verified) |
| Secrets | none in logs/errors/health responses; bot API error bodies carry no token echo; script output token-free (audited) |

### Worker-loop decision (implemented)

Payment reconciliation is now wired into the worker loop as a **trigger-only
hook** (`payment_reconcile_pass` in `worker/main.py`):

- stdlib `urllib` POST to the web service's `/api/payments/reconcile` with the
  `x-reconcile-token` header — all payment logic and auth stay in the web app
- off by default; enabled by setting `PAYMENT_RECONCILE_URL`
  (e.g. `http://web:3000/api/payments/reconcile`) + `RECONCILE_TOKEN` in the
  worker environment (already plumbed in `docker-compose.prod.yml`)
- bounded: 60 s HTTP timeout, runs on the housekeeping interval
  (`PAYMENT_RECONCILE_INTERVAL_SECONDS`, default 900 s), never blocks job
  processing, every failure logged and swallowed
- verified: no-op when unset, non-fatal on unreachable web, HTTP 200 sweep
  trigger against live staging web

The drain (`/api/payments/bale/drain`) stays a manual/webhook-outage endpoint,
NOT wired into the loop — it must never run concurrently with an active webhook.

### Not verified this pass (needs a real phone/app interaction)

- A REAL invoice paid in the Bale app (test provider token): pre-checkout with
  a Bale-issued query id, then the real `successful_payment` update. The
  settlement path itself is fully verified with webhook-shaped updates; the
  only unproven link is Bale delivering a real invoice/paid update to
  `@pakino_bot` in this staging run.
- `inquireTransaction` against a REAL paid transaction (needs the above).
- Real wallet provider token activation (see blockers below).

## Operational runbook

- **Webhook setup**: needs a public HTTPS host (ports 443/88). One-time
  `setWebhook` curl (docs above), verify via `getWebhookInfo`. Localhost
  staging cannot receive webhooks (Bale requires https) — the drain endpoint
  covers update delivery in that mode.
- **Linking procedure**: dashboard → Connect Bale → one-time code →
  `/start <code>` in Bale app → bot confirmation message.
- **Test payment**: staging purchase → invoice in Bale app → pay (test token:
  no money moves) → webhook (or drain) settles → dashboard credits update.
- **Drain procedure** (webhook outage): `POST /api/payments/bale/drain` with
  `x-reconcile-token`; or `node scripts/bale-drain.mjs`. Restart-safe.
- **Reconciliation**: call `POST /api/payments/reconcile` (token-guarded) on a
  schedule, or set `PAYMENT_RECONCILE_URL` + `RECONCILE_TOKEN` in the worker
  environment to have the worker loop trigger it every
  `PAYMENT_RECONCILE_INTERVAL_SECONDS` (default 15 min). Never auto-settles
  uncertain rows.
- **Real provider activation**: obtain/activate the wallet provider token via
  [@botfather](https://ble.ir/botfather) (payments menu) — the spike showed a
  non-activated wallet token fails AFTER pre-checkout with
  `inquireTransaction.status = "failed"`; the implementation treats that
  correctly (no grant). Re-run the staging payment once activated.
