# Development

## First run

```bash
docker compose up -d          # postgres (host :5433) + redis + minio
cp .env.example .env
npm install
npm run dev                   # http://localhost:3000 → /en (default locale)
```

Worker (separate terminal):

```bash
python -m venv .venv
.venv\Scripts\activate         # Windows   (source .venv/bin/activate on *nix)
pip install -r worker/requirements.txt
python -m worker
```

## MinIO console

http://localhost:9001 — login `pakino` / `pakino12345`. The `pakino` bucket is created automatically
by the `createbucket` compose service.

Postgres in compose listens on **host port 5433**; containers use `postgres:5432`.

## Seed a user

```bash
psql postgres://pakino:pakino@localhost:5433/pakino -c \
"INSERT INTO users (email, password_hash) VALUES ('me@test.com','\$2a\$12\$...');"
```

Or use `/en/register` in the browser.

## Tests & checks

```bash
npm run typecheck                  # tsc --noEmit
npm run lint                       # eslint src/**
npm test                           # vitest — DB-backed suites skip without Postgres
python -m pytest worker/tests -q   # worker (needs the venv above)
```

Before pushing a UI change, also:

```bash
npm run build                      # production build, all locales prerendered
```

The frontend suite is 52 tests; the four integration suites (credits, settlement, zarinpal callback,
bale) require a reachable Postgres and skip otherwise.

## Working with messages (i18n)

- Catalogs live in `messages/{locale}.json`; `en` is the source of truth for keys.
- Every catalog must keep **key parity** with `en`. `scripts/build-catalog.py` rebuilds a nested
  catalog from a flat `scripts/trans/<locale>.json` and refuses to write if keys are missing/extra.
- `scripts/gen-catalogs.py` holds the canonical `catalog(...)` factory (structure + non-English
  copy) used to regenerate catalogs.
- Wired locales: `en`, `fa`, `ar` (both RTL), `es`, `zh`, `hi`, `pt-BR`, `ru`, `fr`, `de`, `ja`.
- `scripts/trans/` holds one flat file per locale plus `_template.json` (all 221 keys, empty
  values). When a nested catalog changes, regenerate the flat source from it so both stay in sync.
- To surface a new locale end to end: add the catalog (`messages/<locale>.json` + flat source),
  register it in `src/i18n/config.ts` (`locales`, `localeLabels`, `rtlLocales`,
  `usesArabicScript`), optionally map countries in `src/proxy.ts`, then run
  `npm run typecheck && npm run build`.

## UI conventions

See [ui.md](ui.md) for tokens, motion primitives and RTL/a11y rules. In short: logical CSS
properties, `Reveal`/`StaggerGroup` for entrances, no new colors outside the token set.

## Common issues

- **Worker can't import `remove_ai_watermarks`** — install the extras:
  `pip install -r worker/requirements.txt` (pins `remove-ai-watermarks[visible,video]`). On Python
  3.14 some wheels may lag — use 3.12/3.13 if installs fail (the container ships 3.13).
- **`MISSING_MESSAGE` warnings during `next build`** — a translation key is referenced but absent from
  one of `messages/*.json`. Add it to **every** catalog.
- **CSS changes appear ignored** — this project is on Tailwind 4: configuration lives in
  `src/app/globals.css` (`@theme`, `@utility`), not `tailwind.config.ts`. There is no
  `autoprefixer`/PostCSS plugin chain to debug.
- **`next build` fails with `ERR_SWC_NATIVE_CACHE` (Windows)** — the native binding cannot use the
  default cache directory. Point it somewhere user-owned:
  `$env:SWC_NATIVE_BINDING_CACHE='C:\Users\<you>\swc-safe'` (persist it in your shell profile or CI
  env).
- **`EPERM` when running `vitest` in a restricted sandbox** — Vitest spawns an esbuild service over
  piped stdio; run it outside the sandbox or allow process spawning.

## Windows notes

- Use Git Bash / WSL for the `python -m venv` activation snippets above.
- FFmpeg: `winget install Gyan.FFmpeg` or a build from gyan.dev added to `PATH`.
- If port 5432 is taken by a native PostgreSQL install, keep the compose mapping at 5433 and use
  `postgres://pakino:pakino@localhost:5433/pakino` in `.env`.
