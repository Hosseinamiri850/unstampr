# Deployment

Unstampr is two runtimes behind one domain: a **Next.js** app and a **Python worker** with FFmpeg.
Everything else (Postgres, Redis, object storage) is a managed service.

## Target shape

- **Next.js** — Node 22 runtime (`node:22-alpine` in the image). Works on Vercel, Fly.io, Railway or
  any Node host behind nginx.
- **Worker** — long-running Python 3.13 process with FFmpeg (`worker/Dockerfile`). Scale with
  `WORKER_CONCURRENCY` or more replicas; it must reach Redis, Postgres and S3.
- **Postgres** — managed Postgres 16 (RDS, Supabase, Neon) with `drizzle/0000_init.sql` applied.
- **Redis** — managed Redis 7 (Upstash, ElastiCache) — queue + quota + rate limits.
- **S3** — real S3 or S3-compatible (Cloudflare R2, Backblaze B2, Wasabi).

v1 has **no payment provider dependency**: `PAYMENTS_ENABLED=false` means no ZarinPal/Bale
credentials or public callback URL are required to launch globally.

## Environment

Set at minimum: `NEXT_PUBLIC_APP_URL`, `SESSION_SECRET` (≥32 random bytes), `DATABASE_URL`,
`REDIS_URL`, the `S3_*` block, `FREE_DAILY_JOBS`, `FILE_RETENTION_HOURS`, `QUEUE_NAME`, and any
`NEXT_PUBLIC_DONATION_*` links you want to show. See [.env.example](../.env.example).

`NEXT_PUBLIC_*` values are inlined at build time — rebuild the web image after changing them.

## Geo-based locale (global launch)

The middleware reads the visitor's country from the first available header:

1. `x-vercel-ip-country` (Vercel)
2. `cf-ipcountry` (Cloudflare)
3. `x-geo-country` (nginx/Caddy — set it yourself from a GeoIP module)

If none is present the app falls back to the `NEXT_LOCALE` cookie and then `Accept-Language`, so a
host without geo headers still works. Country → locale mapping lives in
[`src/proxy.ts`](../src/proxy.ts); extend it as locales are added.

## Docker (single host)

```bash
SESSION_SECRET=$(openssl rand -hex 32) \
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` builds both images (`Dockerfile.web`, `worker/Dockerfile`) and wires
Postgres 16, Redis 7 and MinIO. Put TLS in front (Caddy/nginx/Cloudflare) and never expose the
worker port.

## Managed / split deployment

1. Deploy the web app (Vercel or container) with the env block above.
2. Deploy the worker container somewhere with CPU headroom and FFmpeg; give it the same
   `DATABASE_URL`, `REDIS_URL`, `S3_*`, `QUEUE_NAME`, `WORKER_CONCURRENCY`.
3. Point both at the same managed Postgres/Redis/S3. Worker and web may live in different regions,
   but keep the worker close to the bucket.
4. Keep one replica of the retention/cleanup job (see [processing.md](processing.md)).

## Pre-launch checklist

1. `SESSION_SECRET` generated and set; no dev defaults shipped.
2. `NEXT_PUBLIC_APP_URL` equals the public origin (OG tags, sitemap, presigned URLs unaffected).
3. Migrations applied to the production database.
4. Bucket CORS allows `PUT` from the app origin; presigned URL TTL is short.
5. Retention job scheduled (`FILE_RETENTION_HOURS`, default 24).
6. Worker behind a process manager with `restart=always`; logs shipped to your aggregator.
7. Geo header available at the edge (Vercel/Cloudflare) so first-visit locale detection works.
8. Backups enabled for Postgres; bucket lifecycle rule mirrors the retention window.
9. TLS + security headers (`next.config.mjs` already emits nosniff / frame / referrer /
   permissions-policy).
10. Smoke test in production: upload → process → download, in two locales, plus an over-quota
    attempt that must return `DAILY_QUOTA_EXCEEDED`.

## Observability

- Worker logs structured lines (`%(asctime)s %(levelname)s %(name)s: %(message)s`) — pipe to your log
  aggregator.
- Job failures surface `error_code` to clients; map unknowns to `PROCESSING_FAILED`.
- Queue health: alert on `LLEN pakino:jobs` growth and on jobs stuck in a non-terminal state. The
  reliability model (outbox, idempotent claims, heartbeats, bounded retries, recovery pass) is in
  [JOB_RELIABILITY_REPORT.md](JOB_RELIABILITY_REPORT.md).
- Optional: privacy-friendly analytics (Umami/Plausible) on the web app only.

## Scaling notes

- Web: stateless — scale horizontally behind a load balancer.
- Worker: CPU-bound (OpenCV/FFmpeg); scale by replicas or `WORKER_CONCURRENCY`, watching memory
  because video encoding is the peak cost.
- Postgres: the queue lives in Redis, so DB load is dominated by job status polling; add an index if
  `jobs(user_id, created_at)` becomes hot at scale.
