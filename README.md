# Unstampr

Remove AI watermarks from images and videos — fast, automatic, free.
Built on [remove-ai-watermarks](https://github.com/wiltodelta/remove-ai-watermarks)
and FFmpeg, with a Next.js 16 frontend and a Python worker consuming a Redis queue.

> Unstampr برای حذف واترمارک محتوای تولیدشده با هوش مصنوعی طراحی شده و فرض بر این
> است که شما مالک محتوا یا مجوز تغییر آن را دارید. این سرویس برای دور زدن لایسنس
> محتوای تجاری یا استوک پولی نیست.

## Stack

- **Frontend:** Next.js 16 (App Router, Turbopack) · TypeScript strict · Tailwind CSS 4 · shadcn/ui · next-intl (fa/en)
- **Backend API:** Next.js Route Handlers · Drizzle ORM + PostgreSQL · Redis (job queue + rate limit)
- **Worker:** Python · `remove-ai-watermarks[visible,video]` · FFmpeg · psycopg · boto3
- **Storage:** S3-compatible (MinIO locally) — presigned URLs, no filesystem paths exposed to the browser
- **Payments (v2):** ZarinPal / Bale providers implemented and kept dormant behind `PAYMENTS_ENABLED=false` — v1 is free-only

## Architecture

```
Browser → Next.js (UI + API) → PostgreSQL → Redis queue → Python worker
        → remove-ai-watermarks + FFmpeg → Object storage → result → Next.js → Browser
```

Two runtime processes (Next.js + Python worker), three infra services (Postgres, Redis, S3).
No per-responsibility microservices.

## Quick start (local)

### Prerequisites

- Node.js ≥ 22, npm
- Python ≥ 3.11 (3.13/3.14 tested)
- FFmpeg (on Windows: `winget install Gyan.FFmpeg` or see [gyan.dev](https://www.gyan.dev/ffmpeg/builds/))
- Docker (optional, for infra)

### 1. Infrastructure

Spin up Postgres + Redis + MinIO:

```bash
docker compose up -d
```

This also runs everything in `drizzle/` against Postgres on first boot (init +
migrations), and creates the `pakino` bucket in MinIO. Note: the compose
Postgres maps to **host port 5433** (`localhost:5433`) — a native Windows
PostgreSQL commonly owns 5432. Containers inside compose use `postgres:5432`.

Without Docker: install PostgreSQL 16, Redis 7, MinIO locally and run:

```bash
psql "$DATABASE_URL" -f drizzle/0000_init.sql
```

### 2. Environment

```bash
cp .env.example .env
# review values; defaults match docker-compose
```

### 3. Frontend

```bash
npm install
npm run dev          # http://localhost:3000  → redirects to /fa
```

Useful scripts:

```bash
npm run build        # production build
npm run lint
npm run typecheck    # tsc --noEmit
npm test             # vitest
```

### 4. Worker

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r worker/requirements.txt
python -m worker        # consumes pakino:jobs
# or: python worker/main.py
```

Worker tests:

```bash
pip install pytest
DATABASE_URL=postgres://pakino:pakino@localhost:5433/pakino \
REDIS_URL=redis://localhost:6379/1 \
python -m pytest worker/tests -q
```

Integration suites (credit ledger + job reliability) run against real
PostgreSQL/Redis when reachable and skip otherwise.

## Production (Docker)

Full stack — Next.js, worker, Redis, Postgres, MinIO:

```bash
SESSION_SECRET=$(openssl rand -hex 32) \
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

docker compose ps
docker compose logs -f worker
docker compose down
```

Never use `npm run dev` in production. See docs/JOB_RELIABILITY_REPORT.md for
the reliability model and operational notes.

## Configuration

All tunables live in `.env` (see `.env.example`):

| Var | Default | Purpose |
|-----|---------|---------|
| `DATABASE_URL` | `postgres://pakino:pakino@localhost:5432/pakino` | Postgres |
| `REDIS_URL` | `redis://localhost:6379` | queue + rate limit |
| `S3_*` | MinIO local | object storage |
| `MAX_IMAGE_SIZE` / `MAX_VIDEO_SIZE` / `MAX_VIDEO_DURATION` | 10MB / 500MB / 300s | per-file limits |
| `FREE_DAILY_JOBS` | 5 | v1 free-tier daily quota per account |
| `PAYMENTS_ENABLED` | `false` | v1 free-only; `true` switches credit/plan billing on (v2) |
| `NEXT_PUBLIC_DONATION_BMAC` / `_KOFI` / `_GITHUB` | _empty_ | donation links (footer + dashboard card) |
| `FILE_RETENTION_HOURS` | 24 | auto-delete input + output |
| `WORKER_CONCURRENCY` | 2 | worker loop count |
| `ZARINPAL_MERCHANT_ID` | _empty_ | when empty, mock payment provider is used (v2) |
| `BALE_BOT_TOKEN` / `BALE_PROVIDER_TOKEN` / `BALE_WEBHOOK_SECRET` | _empty_ | Bale wallet payments (see docs/bale.md) |
| `SESSION_SECRET` | dev-only | JWT signing secret — **set to 32+ random bytes in prod** |

## Workflow

1. Upload → presigned PUT to S3 → job row `UPLOADING`
2. `POST /api/jobs` → daily quota checked (v1) or credits deducted (v2) → message enqueued to Redis (`pakino:jobs`)
3. Worker `BRPOP`s the job → `ANALYZING → DETECTING → PROCESSING → ENCODING → COMPLETED`
4. Frontend polls `GET /api/jobs/:id` until terminal state, then renders before/after + download

If no supported watermark is detected, the job completes with `errorCode: NO_WATERMARK_DETECTED`
and produces no output — the UI tells the user clearly.

## Internationalization

`fa` (RTL) and `en` (LTR), routed under `/{locale}/**`. Components use logical CSS
(`ms`/`me`, `ps`/`pe`, `start`/`end`) — no duplicated RTL/LTR variants. Messages live in
`messages/{fa,en}.json`.

## Payments

`PaymentProvider` interface (`createPayment` / `verifyPayment` / `refundPayment`).
**v1 runs free-only** with a daily quota; the full payments stack (ZarinPal, Bale,
credits, plans) is implemented, tested, and dormant behind `PAYMENTS_ENABLED=false`.
See [docs/billing.md](docs/billing.md) for the deferral note and v2 activation path.

## Limitations / roadmap

- Visible watermarks only (Hailuo, Veo, Kling, Sora, Seedance, Dola). The
  `remove-ai-watermarks` invisible path needs CUDA and is intentionally not wired into the
  MVP worker.
- MVP uses long-polling for job status; WebSockets are optional.
- Batch processing and Stripe are future work (plan UI is present but gated).

## Documentation

- [docs/architecture.md](docs/architecture.md) — system architecture
- [docs/development.md](docs/development.md) — local dev detail
- [docs/deployment.md](docs/deployment.md) — production deployment
- [docs/processing.md](docs/processing.md) — worker + FFmpeg internals
- [docs/security.md](docs/security.md) — threat model + hardening
- [docs/billing.md](docs/billing.md) — v1 free model; credits, plans, ZarinPal (v2)
- [docs/bale.md](docs/bale.md) — Bale wallet payments (provider, linking, webhook, reconciliation)

## License

Apache-2.0 (inherits `remove-ai-watermarks`). Code © Unstampr contributors.
