-- Bale payment provider support.
-- Run: psql $DATABASE_URL -f drizzle/0003_payment_bale.sql
--
-- Identifier semantics (verified against live Bale API, spike 2026-09-03):
--
--   payload                  Pakino-generated opaque payment identifier (160-bit random
--                            hex). Sent as sendInvoice `payload`, echoed back by Bale as
--                            `invoice_payload` in PreCheckoutQuery and SuccessfulPayment.
--                            Used ONLY for correlation — never trusted as authorization.
--
--   provider_charge_id       Canonical Bale transaction ID: PreCheckoutQuery.id, which
--                            equals SuccessfulPayment.telegram_payment_charge_id (verified
--                            live: both carried the same value). This is the key accepted
--                            by inquireTransaction and the exactly-once settlement latch.
--
--   provider_wallet_tracking SuccessfulPayment.provider_payment_charge_id — user-visible
--                            wallet receipt/tracking number. Present only on real wallet
--                            payments; empty string with the test token, "0" in Transaction
--                            objects for non-wallet settlements. NEVER used as a DB key.
--
--   payer_chat_id            Bale payer/chat ID (PreCheckoutQuery.from.id — verified to
--                            equal the linked chat id for private-chat payments).
--
--   provider_invoice_id      createInvoiceLink result ("invoice_id=..."). Not a payment
--                            URL and not accepted by inquireTransaction — kept for
--                            debugging/audit only.
--
--   provider_ref_id          ZarinPal-specific (verify.json ref_id). Retained for the
--                            existing provider abstraction; Bale rows leave it NULL.
--
-- Payment lifecycle: 'pending' → 'verified' | 'failed' | 'expired'
--                    'pending' → 'pending_review' (webhook received but validation
--                    failed, or late/inconsistent payment awaiting manual review).
--                    'pending_review' is NOT terminal-blocking: settlePayment's guard
--                    is status='pending', so a review row can only be resolved by an
--                    explicit admin action, never auto-settled.

ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS payload TEXT,
  ADD COLUMN IF NOT EXISTS provider_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_wallet_tracking TEXT,
  ADD COLUMN IF NOT EXISTS provider_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS payer_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS precheckout_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settled_via TEXT;

-- payload: lookup key for webhook correlation (every Bale update carries it).
CREATE UNIQUE INDEX IF NOT EXISTS uq_pay_tx_payload
  ON payment_transactions (payload) WHERE payload IS NOT NULL;

-- provider_charge_id: canonical transaction id. UNIQUE makes one Bale payment
-- able to settle at most one internal payment row (replay/replay-mix guard).
CREATE UNIQUE INDEX IF NOT EXISTS uq_pay_tx_charge_id
  ON payment_transactions (provider_charge_id) WHERE provider_charge_id IS NOT NULL;

-- provider_ref_id: ZarinPal ref_id uniqueness (Bale leaves it NULL).
CREATE UNIQUE INDEX IF NOT EXISTS uq_pay_tx_ref_id
  ON payment_transactions (provider_ref_id) WHERE provider_ref_id IS NOT NULL;

-- Reconcile/review sweep: pending Bale payments that reached pre-checkout,
-- ordered by when their last pre-checkout arrived (recovery window candidates).
CREATE INDEX IF NOT EXISTS idx_pay_tx_bale_pending
  ON payment_transactions (precheckout_seen_at)
  WHERE provider = 'bale' AND status = 'pending' AND precheckout_seen_at IS NOT NULL;

-- Admin review queue: rows awaiting manual decision.
CREATE INDEX IF NOT EXISTS idx_pay_tx_review
  ON payment_transactions (created_at)
  WHERE status = 'pending_review';

-- Bot-account linking: sendInvoice requires a chat_id, so a Pakino user must
-- first message @pakino_bot (via a one-time ble.ir deep-link code) before Bale
-- payments are possible. One row per Pakino user; a Bale account (chat or user
-- id) may be linked to at most one Pakino user.
CREATE TABLE IF NOT EXISTS bale_links (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bale_chat_id TEXT NOT NULL,
  bale_user_id TEXT NOT NULL,
  username TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bale_links_chat
  ON bale_links (bale_chat_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bale_links_user
  ON bale_links (bale_user_id);
