# Unstampr

**Keep the photo. Lose the watermark.**
Free, automatic removal of AI-generation watermarks from images and videos — no signup wall, no
settings to learn.

Built on [remove-ai-watermarks](https://github.com/wiltodelta/remove-ai-watermarks) + FFmpeg, with a
Next.js 16 web app and a Python worker consuming a Redis queue.

> Unstampr removes watermarks from AI-generated content and assumes you own the content or have
> permission to modify it. It is **not** a way around commercial or stock-licensing watermarks.
>
> Unstampr برای حذف واترمارک محتوای تولیدشده با هوش مصنوعی طراحی شده و فرض بر این است که شما مالک
> محتوا یا مجوز تغییر آن را دارید. این سرویس برای دور زدن لایسنس محتوای تجاری یا استوک پولی نیست.

![Landing hero](docs/screenshots/landing-hero.png)

## Status — v1 (free launch)

| Area | State |
|------|-------|
| Watermark removal (image + video) | ✅ live — visible marks from Hailuo, Veo, Kling, Sora, Seedance, Dola |
| Account, quota, history, dashboard | ✅ live — free daily quota (`FREE_DAILY_JOBS`, default 5/day) |
| Payments / subscriptions | ⏸ implemented but **dormant** behind `PAYMENTS_ENABLED=false` (v2) |
| Donations | ✅ Buy Me a Coffee / Ko-fi / GitHub Sponsors (footer + dashboard) |
| Languages | ✅ en · fa (RTL) · es · zh · hi — IP/locale detection, hreflang in sitemap |
| UI/UX + motion design | ✅ dark-green design system, scroll-driven storytelling, interactive compare slider |
| Product demo video | ⏳ pending (recording deferred to the release step) |

Full phase-by-phase status: [docs/ROADMAP.md](docs/ROADMAP.md).

## Stack

- **Frontend:** Next.js 16 (App Router, Turbopack) · TypeScript strict · Tailwind CSS 4 ·
  shadcn/ui (Radix) · next-intl 4 (5 locales) · framer-motion
- **Backend API:** Next.js Route Handlers · Drizzle ORM + PostgreSQL · Redis (queue, quota, rate
  limits) · JWT sessions (`jose` + `bcryptjs`)
- **Worker:** Python 3.13 · `remove-ai-watermarks[visible,video]` · FFmpeg · psycopg · boto3
- **Storage:** S3-compatible (MinIO locally) — presigned URLs only, no filesystem paths reach the
  browser
- **Payments (v2):** ZarinPal / Bale providers implemented and dormant (`PAYMENTS_ENABLED=false`)

## Architecture

```
Browser → Next.js (UI + API) → PostgreSQL → Redis queue → Python worker
        → remove-ai-watermarks + FFmpeg → Object storage → result → Next.js → Browser
```

Two runtime processes (Next.js + Python worker), three infra services (Postgres, Redis, S3).
No per-responsibility microservices. Details: [docs/architecture.md](docs/architecture.md).

## Free-tier model (v1)

- Every signed-in account gets `FREE_DAILY_JOBS` (default **5**) jobs per UTC day.
- The counter lives in Redis (`quota:daily:{userId}:{YYYY-MM-DD}`) and is checked in
  `POST /api/jobs` *before* a job is enqueued; exceeding it returns `DAILY_QUOTA_EXCEEDED`.
- Credits, plans and payment providers are still in the codebase, but `PAYMENTS_ENABLED=false`
  makes `POST /api/jobs` use the quota instead of deducting credits. See
  [docs/billing.md](docs/billing.md).
- Donations never gate features — they are plain links from env vars.

## Quick start (local)

### Prerequisites

- Node.js ≥ 22, npm
- Python ≥ 3.11 (the container uses 3.13)
- FFmpeg (Windows: `winget install Gyan.FFmpeg`, or see [gyan.dev](https://www.gyan.dev/ffmpeg/builds/))
- Docker (optional, for infra)

### 1. Infrastructure

```bash
docker compose up -d
```

This starts Postgres, Redis and MinIO, applies everything in `drizzle/` on first boot and creates
the `pakino` bucket. The compose Postgres maps to **host port 5433** (`localhost:5433`) because a
native Windows PostgreSQL usually owns 5432; containers still use `postgres:5432`.

Without Docker, install PostgreSQL 16 + Redis 7 + MinIO and run:

```bash
psql "$DATABASE_URL" -f drizzle/0000_init.sql
```

### 2. Environment

```bash
cp .env.example .env       # defaults match docker-compose
```

### 3. Web app

```bash
npm install
npm run dev                # http://localhost:3000 → redirects to /en
```

### 4. Worker

```bash
python -m venv .venv
.venv\Scripts\activate            # Windows   (source .venv/bin/activate on *nix)
pip install -r worker/requirements.txt
python -m worker                  # consumes pakino:jobs
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` / `npm start` | production build / serve |
| `npm run lint` | ESLint over `src/**` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest — 52 tests; DB-backed suites skip when Postgres is unreachable |
| `python -m pytest worker/tests -q` | worker tests (needs the venv from step 4) |

> **Windows + `next build`:** if the build fails with `ERR_SWC_NATIVE_CACHE`, point the native
> binding cache at a user-owned directory:
> `$env:SWC_NATIVE_BINDING_CACHE='C:\Users\<you>\swc-safe'`.

## Production (Docker)

```bash
SESSION_SECRET=$(openssl rand -hex 32) \
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

docker compose ps
docker compose logs -f worker
```

Images: `node:22-alpine` (web), `python:3.13-slim` + FFmpeg (worker), `postgres:16-alpine`,
`redis:7-alpine`, MinIO. Never use `npm run dev` in production. See
[docs/deployment.md](docs/deployment.md) for global-hosting notes (Vercel/Fly/Railway + managed
Postgres/Redis/S3) and [docs/JOB_RELIABILITY_REPORT.md](docs/JOB_RELIABILITY_REPORT.md) for the
queue reliability model.

## Configuration

All tunables live in `.env` (see [.env.example](.env.example)):

| Var | Default | Purpose |
|-----|---------|---------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | public origin (OG, sitemap, callbacks) |
| `DATABASE_URL` | `postgres://pakino:pakino@localhost:5432/pakino` | Postgres |
| `REDIS_URL` | `redis://localhost:6379` | queue, quota, rate limits |
| `S3_*` | MinIO local | object storage |
| `MAX_IMAGE_SIZE` / `MAX_VIDEO_SIZE` / `MAX_VIDEO_DURATION` | 10 MB / 500 MB / 300 s | per-file limits |
| `FREE_DAILY_JOBS` | `5` | v1 free-tier daily quota per account |
| `FILE_RETENTION_HOURS` | `24` | auto-delete input + output |
| `NEXT_PUBLIC_DONATION_BMAC` / `_KOFI` / `_GITHUB` | _empty_ | donation links (footer + dashboard) |
| `NEXT_PUBLIC_PAYMENTS_ENABLED` | `false` | v2 switch: purchase UI, `/pricing`, credit deduction |
| `SESSION_SECRET` | dev-only | JWT signing secret — **32+ random bytes in prod** |
| `ZARINPAL_*` / `BALE_*` | _empty_ | v2 payment providers (see [docs/bale.md](docs/bale.md)) |

## Workflow

1. Upload → presigned `PUT` to S3 → job row `UPLOADING`
2. `POST /api/jobs` → daily quota checked (v1) or credits deducted (v2) → message `RPUSH`ed to Redis (`pakino:jobs`)
3. Worker `BRPOP`s → `ANALYZING → DETECTING → PROCESSING → ENCODING → COMPLETED`
4. The UI polls `GET /api/jobs/:id`, then renders the before/after comparison + download

When no supported watermark is found the job completes with `errorCode: NO_WATERMARK_DETECTED`,
produces no output, and the UI says so.

## Internationalization

Five locales ship today: `en` (default), `fa` (RTL), `es`, `zh`, `hi` — routed under `/{locale}/**`
with `localePrefix: 'always'`. Messages live in `messages/{locale}.json` and every catalog is kept at
key parity with `en`.

- **Locale resolution:** `NEXT_LOCALE` cookie → explicit `/{locale}/` path → geo header
  (`x-vercel-ip-country`, `cf-ipcountry`, `x-geo-country`) → `Accept-Language`. Country→locale
  mapping lives in [src/proxy.ts](src/proxy.ts).
- **RTL:** `dir` is derived from the locale; components use logical utilities (`ms`/`me`, `ps`/`pe`,
  `start`/`end`) so there is one implementation, not two.
- **SEO:** `sitemap.xml` emits hreflang alternates for every locale × route.
- **Adding a locale:** add `messages/<locale>.json` (same keys as `en`), register it in
  [src/i18n/config.ts](src/i18n/config.ts) (`locales`, `localeLabels`, `rtlLocales`), optionally add
  a country mapping in `src/proxy.ts`, then `npm run typecheck && npm run build`.
  `scripts/build-catalog.py` rebuilds a nested catalog from a flat `scripts/trans/<locale>.json`.

## UI & motion

- **Design system:** dark-green brand ramp + warm neutrals as CSS variables in
  [src/app/globals.css](src/app/globals.css), exposed as Tailwind theme tokens (`bg-primary`,
  `bg-brand-soft`, `shadow-soft`, `shadow-lift`, `gradient-brand`, `bg-dots`).
- **Motion:** `framer-motion` primitives in [src/components/motion](src/components/motion) —
  `Reveal`, `StaggerGroup`, `Parallax`, `HeroMotion`, `ScrollProgress` and the draggable,
  keyboard-accessible `CompareSlider`.
- **Scroll storytelling:** the "how it works" band pins a demo card and advances it as each step
  enters the viewport.
- **Accessibility:** visible focus rings, keyboard-driven slider, `aria-current` navigation, and a
  full `prefers-reduced-motion` path (animations collapse to static content — no information is
  lost). Reveal animations also carry a `<noscript>` fallback.

![Scroll storytelling](docs/screenshots/landing-steps.png)

RTL check: ![Persian mobile hero](docs/screenshots/rtl-mobile.png)

## Payments & donations (v1)

`PaymentProvider` (`createPayment` / `verifyPayment` / `refundPayment`) plus credits, plans and
ledger are implemented, tested and **dormant** behind `PAYMENTS_ENABLED=false`. Flip it to `true` in
v2 to bring back `/pricing`, purchase UI and credit deduction. Details:
[docs/billing.md](docs/billing.md).

## Limitations / next up

- Visible watermarks only. The invisible path of `remove-ai-watermarks` needs CUDA and is
  intentionally not wired in.
- Job status uses long-polling; WebSockets are optional.
- Remaining locales (`ar`, `pt-BR`, `ru`, `fr`, `de`, `ja`) and the product demo video are tracked in
  [docs/ROADMAP.md](docs/ROADMAP.md).

## Documentation

- [docs/ROADMAP.md](docs/ROADMAP.md) — phase status, what's done, what's left
- [docs/architecture.md](docs/architecture.md) — components, data flow, boundaries
- [docs/development.md](docs/development.md) — local dev, catalogs, common issues
- [docs/deployment.md](docs/deployment.md) — production + global hosting
- [docs/ui.md](docs/ui.md) — design tokens, motion conventions, a11y rules
- [docs/processing.md](docs/processing.md) — worker + FFmpeg internals
- [docs/security.md](docs/security.md) — threat model + hardening
- [docs/billing.md](docs/billing.md) — v1 free model; credits, plans, ZarinPal (v2)
- [docs/bale.md](docs/bale.md) — Bale wallet payments (v2)
- [docs/adr/0001-free-v1-daily-quota.md](docs/adr/0001-free-v1-daily-quota.md) — why v1 is free + quota
- [docs/JOB_RELIABILITY_REPORT.md](docs/JOB_RELIABILITY_REPORT.md) — queue reliability model

## License

Apache-2.0 (inherits `remove-ai-watermarks`). Code © Unstampr contributors.
