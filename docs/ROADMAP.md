# Roadmap & phase status

Living status of the global-launch plan (re-brand → free v1 → i18n → UI/UX → docs).
Percentages are honest self-assessments against the original scope, not effort spent.

_Last updated: 2026-10-27_

## Snapshot

| # | Phase | Weight (days) | Done | What is still open |
|---|-------|---------------|------|--------------------|
| 1 | Free v1 model (quota + donations, payments dormant) | 1.5 | **100%** | — |
| 2 | Dependency + Docker refresh | 2.5 | **100%** | — (TypeScript 7 deliberately deferred) |
| 3 | Global re-brand (Unstampr) | 1.5 | **95%** | domain registration/DNS (owner action) |
| 4 | Multi-language rollout | 2.5 | **100%** | — |
| 5 | UI/UX + motion design | 4.0 | **95%** | social-proof band (deliberately waits for real users) |
| 6 | Documentation + release | 0.75 | **90%** | analytics (decision), production launch checklist |

**Weighted overall: ≈ 97%.** Everything in the codebase is done; the remainder is owner-side
(domain, launch) or requires real users (testimonials).

## Phase detail

### 1 — Free v1 model · 100%

- `PAYMENTS_ENABLED=false` (default) removes the purchase UI, `/pricing` (404) and credit
  deduction; `POST /api/payments/*` returns 404.
- Daily quota replaces credits: `FREE_DAILY_JOBS=5`, Redis counter per user per UTC day
  (`src/lib/api/quota.ts`), enforced before enqueueing in `POST /api/jobs`, surfaced in
  `/api/account` and the dashboard meter.
- Payment code intact and documented as v2 (`src/lib/payments/*` headers + [billing.md](billing.md)).
- Donations: `NEXT_PUBLIC_DONATION_BMAC|KOFI|GITHUB` in the footer, the dashboard card, a dedicated
  [`/support` page](../src/app/[locale]/support/page.tsx) and a subtle nudge on the result screen.

### 2 — Dependency + Docker refresh · 100%

Next.js 16, Tailwind CSS 4 (CSS-first config), next-intl 4, Drizzle 0.45/kit 0.31, React 19.3,
zod 4, `@hookform/resolvers` 5, ioredis 6, jose 6, bcryptjs 3, Vitest 4, jsdom 29,
`@testing-library/jest-dom` 7, AWS SDK v3 current, Radix current. Worker pins:
`remove-ai-watermarks==0.45.1`, redis 8, psycopg 3.3, numpy 2.5, opencv 5. Images:
`node:22-alpine`, `python:3.13-slim`, `postgres:16-alpine`, `redis:7-alpine`; prod compose builds
both images.

Deliberate exception: **TypeScript 7** is not adopted yet — it is a new compiler line and the
project gains nothing from a migration before the launch; revisit after v1 traffic.

### 3 — Global re-brand · 95%

Name, wordmark + icon, favicon, metadata/OpenGraph copy, a generated 1200×630 social card
(`public/og.png`, wired into `openGraph`/`twitter` with `metadataBase` from `NEXT_PUBLIC_APP_URL`),
schema.org payload, footer/nav strings, message catalogs. The GitHub repository was renamed
`pakino` → `unstampr` (old URL redirects), and user-visible leftovers were renamed: session cookie
`unstampr_session`, download filenames `unstampr-{jobId}.{ext}`, container user `unstampr`, log
logger names `unstampr.*`. Internal data identifiers (database `pakino`, S3 bucket, `pakino:jobs`
queue, `pakino:*` Redis prefixes, compose service names) intentionally stay to avoid a risky data
migration.

Open: domain purchase/DNS (owner action). The local checkout folder can also be renamed
(`Pakino` → `unstampr`); it is a manual, out-of-repo step.

### 4 — Multi-language rollout · 100%

Eleven locales ship: `en` (default), `fa` (RTL), `ar` (RTL), `es`, `zh`, `hi`, `pt-BR`, `ru`, `fr`,
`de`, `ja` — every catalog at 221-key parity with `en`. Locale resolution: `NEXT_LOCALE` cookie →
explicit `/{locale}/` path → geo header (`x-vercel-ip-country` → `cf-ipcountry` → `x-geo-country`)
→ `Accept-Language`. `sitemap.xml` emits hreflang for every locale × route; `dir` and the
Arabic-script font stack follow the locale. Flat translation sources and the template live in
`scripts/trans/` and are regenerated from the nested catalogs.

Next wave (optional): `tr`, `id`, `ko`, `it` — repeat the same recipe.

### 5 — UI/UX + motion design · 95%

Dark-green design tokens, rebuild of every route, asymmetric hero with an interactive before/after
slider, scroll-driven "how it works" storytelling, bento features, animated upload/processing/result
states, micro interactions, `prefers-reduced-motion` + `<noscript>` fallbacks, keyboard-accessible
slider, RTL-verified layouts, plus a **17-second product demo video** (`docs/media/demo.mp4`)
recorded from the running app. See [ui.md](ui.md).

Open: the social-proof band. There are no real users yet, so shipping testimonials or logo walls
would mean fabricating them — it waits until there is something true to show.

### 6 — Documentation + release · 90%

README (bilingual, with the screenshot gallery and demo video), [ui.md](ui.md), this roadmap, the
free-model ADR, refreshed architecture/development/deployment/processing docs, screenshots in
`docs/screenshots/`.

Open: privacy-friendly analytics (owner decision — Umami/Plausible), then the production checklist
in [deployment.md](deployment.md) for the real domain.

## Locked decisions (from the planning round)

- **Name:** Unstampr — `.com/.app/.ai/.io/.dev/.co`, GitHub and npm clean at decision time.
- **Free tier:** 5 jobs/day per account. No hourly limit.
- **Payments:** implemented, dormant in v1; activated only for v2.
- **Donations:** all three providers — whichever is configured shows up.
- **Locales:** 11 wired, IP-based first-visit detection.
- **Demo video:** recorded from the app itself (frame capture + ffmpeg), not a mockup.

## Suggested next order

1. Buy the domain, point `NEXT_PUBLIC_APP_URL` + geo headers at it (Vercel/Cloudflare).
2. Run the launch checklist in [deployment.md](deployment.md); enable backups + the retention job.
3. Decide on analytics (optional) and add the social-proof band once real usage exists.
4. Optional locale wave 2 (`tr`, `id`, `ko`, `it`).
5. v2: flip `PAYMENTS_ENABLED=true` when subscriptions are actually wanted.
