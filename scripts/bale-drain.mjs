#!/usr/bin/env node
/**
 * Bale webhook-outage recovery: drain pending Bot API updates via getUpdates
 * and feed each through the same processing pipeline the webhook uses, by
 * POSTing to the (authenticated) webhook endpoint. Restart-safe: offsets live
 * in the bale_drain_state table on the server side — the drain HTTP API owns
 * them. This CLI drives the drain endpoint.
 *
 * Usage:
 *   BALE_DRAIN_URL=http://localhost:3000/api/payments/bale/drain \
 *   BALE_DRAIN_TOKEN=<RECONCILE_TOKEN> node scripts/bale-drain.mjs
 */
const url = process.env.BALE_DRAIN_URL;
const token = process.env.BALE_DRAIN_TOKEN;
if (!url || !token) {
  console.error('BALE_DRAIN_URL and BALE_DRAIN_TOKEN required');
  process.exit(1);
}

const res = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-reconcile-token': token },
  body: JSON.stringify({ mode: 'drain' }),
});
const body = await res.text();
console.log(`HTTP ${res.status}: ${body}`);
