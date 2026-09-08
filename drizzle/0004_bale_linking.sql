-- Bale account-linking codes + webhook-outage drain state.
-- Run: psql $DATABASE_URL -f drizzle/0004_bale_linking.sql
--
-- Linking: the user asks Pakino for a one-time code, then sends "/start <code>"
-- to the Pakino bot in Bale. Codes are stored HASHED (sha256) — the raw code
-- exists only in the API response shown once to the requesting user and is
-- never logged. Single-use + short-TTL enforced by guarded UPDATE.
-- bale_links itself (created in 0003) holds the durable user<->chat binding.

CREATE TABLE IF NOT EXISTS bale_link_codes (
  code_hash TEXT PRIMARY KEY,          -- sha256 hex of the raw one-time code
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bale_link_codes_user ON bale_link_codes (user_id);

-- getUpdates drain progress (webhook-outage recovery). Single row; offset is
-- the last processed update_id + 1. Persisted AFTER each processed update so a
-- restart re-fetches at most one update (which settlePayment makes idempotent).
CREATE TABLE IF NOT EXISTS bale_drain_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_offset BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
