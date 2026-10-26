# Roadmap & phase status

Living status of the global-launch plan (re-brand → free v1 → i18n → UI/UX → docs).
Percentages are honest self-assessments against the original scope, not effort spent.

_Last updated: 2026-10-27_

## Snapshot

| # | Phase | Weight (days) | Done | What is still open |
|---|-------|---------------|------|--------------------|
| 1 | Free v1 model (quota + donations, payments dormant) | 1.5 | **85%** | thank-you state after a successful job; optional `/support` page |
| 2 | Dependency + Docker refresh | 2.5 | **85%** | residual majors: `ioredis` 6, `zod` 4, `vitest` 4, `@hookform/resolvers` 6, `jsdom` 29, TypeScript 7 (evaluate) |
| 3 | Global re-brand (Unstampr) | 1.5 | **90%** | domain registration/DNS (owner action), branded OG image asset |
| 4 | Multi-language rollout | 2.5 | **50%** | 5 of 10 locales wired; `ar` translated but unwired; `pt-BR`/`ru`/`fr`/`de` skeletons; `ja` missing |
| 5 | UI/UX + motion design | 4.0 | **85%** | product demo video (30–45 s), social-proof band on the landing page |
| 6 | Documentation + release | 0.75 | **85%** | analytics (optional), production launch checklist run |

**Weighted overall: ≈ 79%** of the planned scope is shipped. Everything user-facing for a v1
free launch works end to end; what remains is breadth (locales), a promo asset (video) and a
small tail of dependency majors.

## Phase detail

### 1 — Free v1 model · 85%

Done:

- `PAYMENTS_ENABLED=false` (default) removes the purchase UI, `/pricing` (404), and credit
  deduction; `POST /api/payments/*` returns 404.
- Daily quota replaces credits: `FREE_DAILY_JOBS=5`, Redis counter per user per UTC day
  (`src/lib/api/quota.ts`), enforced before enqueueing in `POST /api/jobs`, surfaced in
  `/api/account` and the dashboard meter.
- Payment code intact and documented as v2 (`src/lib/payments/*` headers + `docs/billing.md`).
- Donations: `NEXT_PUBLIC_DONATION_BMAC|KOFI|GITHUB`, rendered in the footer and the dashboard.

Open:

- Thank-you/support nudge after a successful job (result view).
- Optional small `/support` page (the footer links already cover the need).

### 2 — Dependency + Docker refresh · 85%

Done: Next.js 16, Tailwind CSS 4 (CSS-first config), next-intl 4, Drizzle 0.45/kit 0.31,
React 19.3, jose 6, bcryptjs 3, AWS SDK v3 current, Radix current; worker pins
(`remove-ai-watermarks==0.45.1`, redis 8, psycopg 3.3, numpy 2.5, opencv 5); images
`node:22-alpine`, `python:3.13-slim`, `postgres:16-alpine`, `redis:7-alpine`; prod compose builds
both images.

Open: remaining majors (`ioredis` 6, `zod` 4, `vitest` 4, `@hookform/resolvers` 6, `jsdom` 29) and
an evaluation of TypeScript 7. Worker test suite should be run in a venv before the next worker
release.

### 3 — Global re-brand · 90%

Done: name, wordmark + icon, favicon, metadata/OpenGraph copy, schema.org payload, footer/nav
strings, message catalogs. The GitHub repository was renamed `pakino` → `unstampr` (old URL
redirects), and user-visible leftovers were renamed too: session cookie `unstampr_session`,
download filenames `unstampr-{jobId}.{ext}`, container user `unstampr`, log logger names
`unstampr.*`. Internal data identifiers (database `pakino`, S3 bucket, `pakino:jobs` queue,
`pakino:*` Redis prefixes, compose service names) intentionally stay as-is to avoid a risky data
migration — they are invisible to users and are documented here.

Open: domain purchase/DNS (owner action), a designed OG/social image. The local checkout folder can
also be renamed (`Pakino` → `unstampr`); it is a manual, out-of-repo step.

### 4 — Multi-language rollout · 50%

Done: `defaultLocale=en`; `en`, `fa` (RTL), `es`, `zh`, `hi` wired at full key parity;
geo-based locale detection (`x-vercel-ip-country` → `cf-ipcountry` → `x-geo-country` → cookie →
`Accept-Language`); hreflang alternates in `sitemap.xml`; RTL handled with logical CSS.

Open (tracked as waves):

| Locale | Status |
|--------|--------|
| `ar` | fully translated in `scripts/trans/ar.json`, **not wired** (needs `rtlLocales` + catalog build) |
| `pt-BR`, `ru`, `fr`, `de` | key-complete skeletons with empty strings — translation pending |
| `ja` | not started |

### 5 — UI/UX + motion design · 85%

Done: dark-green design tokens, rebuild of every route (landing, workspace, dashboard, history,
pricing, FAQ, auth, legal), asymmetric hero with an interactive before/after slider, scroll-driven
"how it works" storytelling, bento features, animated upload/processing/result states, micro
interactions, `prefers-reduced-motion` + `<noscript>` fallbacks, keyboard-accessible slider,
RTL-verified layouts. See [ui.md](ui.md).

Open: the 30–45 s product demo video (decision deferred to the release step) and a social-proof /
trust band for the global landing page.

### 6 — Documentation + release · 85%

Done: README rewrite, `docs/ui.md`, `docs/ROADMAP.md`, ADR for the free model, refreshed
architecture/development/deployment/processing docs, screenshot set in `docs/screenshots/`.

Open: privacy-friendly analytics (Umami/Plausible — optional), then run the production checklist in
[deployment.md](deployment.md) for the real domain.

## Locked decisions (from the planning round)

- **Name:** Unstampr — `.com/.app/.ai/.io/.dev/.co`, GitHub and npm clean at decision time.
- **Free tier:** 5 jobs/day per account. No hourly limit.
- **Payments:** implemented, dormant in v1; activated only for v2.
- **Donations:** all three providers (Buy Me a Coffee, Ko-fi, GitHub Sponsors) — whichever is
  configured shows up.
- **Locales:** 10 total including `fa`; IP-based default.
- **Demo video:** may be recorded by the team or captured from the running app — decided at the
  release step.

## Suggested next order

1. Wire `ar` (highest value: translated already) → 6 locales, second RTL locale.
2. Translate `pt-BR` → `ru` → `fr` → `de` from `scripts/trans/*.json`, then `ja`.
3. Dependency tail (`zod` 4, `vitest` 4, `ioredis` 6) as separate PRs with green CI.
4. Record the demo video + add the social-proof band.
5. Launch checklist: domain, `NEXT_PUBLIC_APP_URL`, geo headers (Vercel/Cloudflare), backups,
   retention job, monitoring.
