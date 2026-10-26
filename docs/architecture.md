# Architecture

## Components

1. **Next.js app** (`src/app`) — UI, Route Handler APIs (`/api/*`), auth, i18n routing (`src/i18n`,
   `src/proxy.ts`).
2. **Python worker** (`worker/`) — consumes `pakino:jobs` from Redis, processes media, writes results
   to S3 + Postgres.
3. **PostgreSQL** — `users`, `jobs`, `files`, `credit_transactions`, `subscriptions`,
   `payment_transactions` (`drizzle/0000_init.sql`).
4. **Redis** — job queue (cross-language `RPUSH`/`BRPOP` JSON list), daily-quota counters, rate-limit
   counters, cancel flags.
5. **S3-compatible storage** — MinIO locally; uploads/outputs keyed by UUID; presigned URLs only
   ever reach the browser.

Client-only presentation layer: motion primitives (`src/components/motion/*`, framer-motion) and the
Tailwind 4 token system in `src/app/globals.css` — see [ui.md](ui.md). Neither touches data flow.

## Data flow

```
upload:  POST /api/uploads  → files row (UPLOADING) + presigned PUT URL
upload:  PUT <presigned>     → object lands in S3
enqueue: POST /api/jobs      → v1: daily quota check   (PAYMENTS_ENABLED=false)
                             → v2: estimated credits deducted, then RPUSH JobMessage
worker:  BRPOP               → download → detect → remove → encode → upload
worker:  UPDATE jobs          → status/progress/provider/completed_at
client:  GET /api/jobs/:id    → poll until COMPLETED|FAILED|CANCELLED
```

## Boundaries

- No per-responsibility microservices. Worker is the only separate runtime process.
- Worker never runs user-video processing inside an HTTP request.
- DB access: Next.js via Drizzle (`postgres-js`), worker via `psycopg` — both target the same schema.
- Queue contract (`JobMessage`) is the cross-language boundary; keep `src/lib/queue/index.ts` and
  `worker/app/models.py` in sync.

## Redis keys

| Key | Owner | Purpose |
|-----|-------|---------|
| `pakino:jobs` (`QUEUE_NAME`) | API + worker | job list (`RPUSH` / `BRPOP`) |
| `quota:daily:{userId}:{YYYY-MM-DD}` | API | v1 free-tier daily counter (TTL until UTC midnight) |
| `pakino:rl:*` | API | auth + upload rate limiting |
| cancel flag per job | API + worker | requested cancellation |

## Quota vs credits (v1 / v2)

- **v1 (default):** `PAYMENTS_ENABLED=false`. `POST /api/jobs` calls
  `checkDailyQuota(userId, FREE_DAILY_JOBS)`; over the limit returns `DAILY_QUOTA_EXCEEDED` (HTTP
  429) with `used`/`limit`/`resetAt`. `jobs.credits_used` stays `0`, no ledger rows are written.
- **v2:** `PAYMENTS_ENABLED=true` restores the credit path:
  - `estimateCredits` (server-side config, not hardcoded): image flat rate; video
    `ceil(duration/10) * per_10s`.
  - Deducted at enqueue; **refunded on FAILED** (worker writes a `credit_transactions` row with
    `reason=refund`).
  - `NO_WATERMARK_DETECTED` completes without output — credits are not refunded (work was
    attempted); tune to taste.

## Internationalization layer

- `src/i18n/config.ts` — locale list, labels, RTL set, `dir()`.
- `src/i18n/routing.ts` — next-intl routing (`localePrefix: 'always'`).
- `src/proxy.ts` — middleware: next-intl negotiation plus geo-header → locale hint
  (`x-vercel-ip-country`, `cf-ipcountry`, `x-geo-country`), used only when the request has no
  `NEXT_LOCALE` cookie and no locale-prefixed path.
- Messages: `messages/{locale}.json`, always at key parity with `en`.
- `src/app/sitemap.ts` emits hreflang alternates for every locale × route.

## Security boundary

See [security.md](security.md). Inputs are validated at the API edge; storage keys are opaque UUIDs;
FFmpeg is invoked with arg lists only (`shell=False`); file retention is enforced by a cleanup job.
