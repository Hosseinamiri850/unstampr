# Unstampr

**Keep the photo. Lose the watermark.**
Free, automatic removal of AI-generation watermarks from images and videos.

[![CI](https://github.com/Hosseinamiri850/unstampr/actions/workflows/ci.yml/badge.svg)](https://github.com/Hosseinamiri850/unstampr/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)
![next-intl](https://img.shields.io/badge/i18n-5_locales-174D3A)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)

**Read in:** [English](#english) · [فارسی](#فارسی)

![Unstampr landing hero](docs/screenshots/landing-hero.png)

---

## English

### What it is

Unstampr removes the visible watermarks that AI video/image generators stamp onto their output —
Hailuo, Veo, Kling, Sora, Seedance, Dola. You drop a file, it comes back clean. No settings, no
manual brushing, no signup wall.

- **Web app:** Next.js 16 (App Router) + Tailwind CSS 4 + next-intl (5 locales) + framer-motion
- **API:** Route Handlers, Drizzle ORM + PostgreSQL, Redis (queue · quota · rate limits)
- **Worker:** Python 3.13, [`remove-ai-watermarks`](https://github.com/wiltodelta/remove-ai-watermarks) + FFmpeg
- **Storage:** S3-compatible, presigned URLs only

> Unstampr removes watermarks from AI-generated content and assumes you own the content or have
> permission to modify it. It is **not** a way around commercial or stock-licensing watermarks.

### Status — v1 free launch

| Area | State |
|------|-------|
| Image + video watermark removal | ✅ live |
| Account, daily quota, history, dashboard | ✅ live — `FREE_DAILY_JOBS` (default 5/day) |
| Payments / subscriptions | ⏸ implemented, dormant behind `PAYMENTS_ENABLED=false` (v2) |
| Donations | ✅ Buy Me a Coffee · Ko-fi · GitHub Sponsors |
| Languages | ✅ en · fa (RTL) · es · zh · hi, with IP-based detection |
| UI/UX + motion | ✅ design system, scroll storytelling, interactive compare slider |
| Product demo video | ⏳ planned |

Full status: [docs/ROADMAP.md](docs/ROADMAP.md) · Design system: [docs/ui.md](docs/ui.md)

### How it works — scroll storytelling

The "how it works" band pins a demo card and advances it as each step scrolls into view.

![Scroll storytelling](docs/screenshots/landing-steps.png)

### Before / after, draggable

The comparison is a real slider: drag it, or focus it and press ← →.

![Before and after comparison](docs/screenshots/landing-compare.png)

### Why Unstampr

![Feature grid](docs/screenshots/landing-features.png)

### The workspace

Empty state → file selected. Same screen handles images and video, validates type and size at the
edge, and streams the upload with live progress.

<table>
<tr>
<td width="50%"><img src="docs/screenshots/workspace-idle.png" alt="Workspace empty state"></td>
<td width="50%"><img src="docs/screenshots/workspace-selected.png" alt="Workspace with a file selected"></td>
</tr>
</table>

### Mobile

Designed at 390 px, not compressed from desktop.

<table>
<tr>
<td width="33%"><img src="docs/screenshots/mobile-landing.png" alt="Mobile landing"></td>
<td width="33%"><img src="docs/screenshots/mobile-workspace.png" alt="Mobile workspace"></td>
<td width="33%"><img src="docs/screenshots/mobile-menu.png" alt="Mobile navigation"></td>
</tr>
</table>

### RTL (Persian)

One implementation, not two: logical CSS (`ms/me`, `ps/pe`, `start/end`) plus a direction-aware
compare slider.

<table>
<tr>
<td width="50%"><img src="docs/screenshots/rtl-workspace.png" alt="Persian workspace (RTL)"></td>
<td width="50%"><img src="docs/screenshots/rtl-mobile.png" alt="Persian mobile hero (RTL)"></td>
</tr>
</table>

### Other screens

<table>
<tr>
<td width="50%"><img src="docs/screenshots/pricing.png" alt="Pricing (v2 preview)"></td>
<td width="50%"><img src="docs/screenshots/faq.png" alt="FAQ"></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/login.png" alt="Log in"></td>
<td width="50%"><img src="docs/screenshots/landing-cta.png" alt="Closing call to action"></td>
</tr>
</table>

### Architecture

```
Browser → Next.js (UI + API) → PostgreSQL → Redis queue → Python worker
        → remove-ai-watermarks + FFmpeg → Object storage → result → Next.js → Browser
```

Two runtime processes (Next.js + Python worker), three infra services (Postgres, Redis, S3). No
microservices. Details: [docs/architecture.md](docs/architecture.md).

### Free tier (v1)

- `FREE_DAILY_JOBS` (default **5**) jobs per signed-in account per UTC day.
- Redis counter `quota:daily:{userId}:{date}`, checked in `POST /api/jobs` **before** enqueueing;
  over-limit returns `DAILY_QUOTA_EXCEEDED` with `used`/`limit`/`resetAt`.
- Credits and payment providers stay in the code but are dormant while
  `PAYMENTS_ENABLED=false`. See [docs/adr/0001-free-v1-daily-quota.md](docs/adr/0001-free-v1-daily-quota.md).
- Donations never gate a feature.

### Quick start

```bash
git clone https://github.com/Hosseinamiri850/unstampr.git
cd unstampr

docker compose up -d          # postgres (host :5433) + redis + minio
cp .env.example .env
npm install
npm run dev                   # http://localhost:3000 → /en
```

Worker, in a second terminal:

```bash
python -m venv .venv
.venv\Scripts\activate            # Windows   (source .venv/bin/activate on *nix)
pip install -r worker/requirements.txt
python -m worker                  # consumes pakino:jobs
```

Prerequisites: Node ≥ 22 · Python ≥ 3.11 (container uses 3.13) · FFmpeg · Docker (optional).

### Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | dev server (Turbopack) |
| `npm run build` / `npm start` | production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `src/**` |
| `npm test` | Vitest — 52 tests (DB suites skip without Postgres) |
| `python -m pytest worker/tests -q` | worker tests |

CI runs all of the above **plus** `npm run build` on every push and PR.

### Production

```bash
SESSION_SECRET=$(openssl rand -hex 32) \
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Images: `node:22-alpine`, `python:3.13-slim` (+ FFmpeg), `postgres:16-alpine`, `redis:7-alpine`,
MinIO. Global hosting notes, geo headers and the launch checklist:
[docs/deployment.md](docs/deployment.md).

### Configuration

| Var | Default | Purpose |
|-----|---------|---------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | public origin (OG, sitemap) |
| `DATABASE_URL` | `postgres://pakino:pakino@localhost:5432/pakino` | Postgres |
| `REDIS_URL` | `redis://localhost:6379` | queue, quota, rate limits |
| `S3_*` | MinIO local | object storage |
| `MAX_IMAGE_SIZE` / `MAX_VIDEO_SIZE` / `MAX_VIDEO_DURATION` | 10 MB / 500 MB / 300 s | per-file limits |
| `FREE_DAILY_JOBS` | `5` | daily free quota |
| `FILE_RETENTION_HOURS` | `24` | auto-delete input + output |
| `NEXT_PUBLIC_DONATION_BMAC` / `_KOFI` / `_GITHUB` | _empty_ | donation links |
| `NEXT_PUBLIC_PAYMENTS_ENABLED` | `false` | v2 switch for plans + credits |
| `SESSION_SECRET` | dev-only | JWT signing secret — 32+ random bytes in prod |

### Workflow

1. Upload → presigned `PUT` to S3 → job row `UPLOADING`
2. `POST /api/jobs` → quota checked (v1) or credits deducted (v2) → message pushed to Redis
3. Worker `BRPOP`s → `ANALYZING → DETECTING → PROCESSING → ENCODING → COMPLETED`
4. UI polls `GET /api/jobs/:id` → before/after comparison + download

If no supported watermark is detected the job completes with `NO_WATERMARK_DETECTED` and no output —
the UI says so instead of pretending it worked.

### Internationalization

Five locales ship today (`en` default, `fa` RTL, `es`, `zh`, `hi`) under `/{locale}/**`. Locale
resolution: `NEXT_LOCALE` cookie → explicit path → geo header (`x-vercel-ip-country`,
`cf-ipcountry`, `x-geo-country`) → `Accept-Language`. `sitemap.xml` emits hreflang for every
locale × route. Adding a locale: [docs/development.md](docs/development.md#working-with-messages-i18n).

### Documentation

[docs/ROADMAP.md](docs/ROADMAP.md) · [architecture](docs/architecture.md) ·
[development](docs/development.md) · [deployment](docs/deployment.md) · [ui](docs/ui.md) ·
[processing](docs/processing.md) · [security](docs/security.md) · [billing](docs/billing.md) ·
[bale](docs/bale.md) · [job reliability](docs/JOB_RELIABILITY_REPORT.md)

**License:** Apache-2.0 (inherits `remove-ai-watermarks`). Code © Unstampr contributors.

---

## فارسی

### این پروژه چیست

**Unstampr** همان کاری را می‌کند که اسمش می‌گوید: واترمارکِ ابزارهای تولید محتوای هوش مصنوعی را از
تصویر و ویدیو برمی‌دارد — Hailuo، Veo، Kling، Sora، Seedance، Dola. فایل را می‌دهی، تمیز تحویل
می‌گیری. بدون تنظیم، بدون قلم‌موی دستی، بدون دیوار ثبت‌نام.

- **وب‌اپ:** Next.js 16 + Tailwind CSS 4 + next-intl (۵ زبان) + framer-motion
- **API:** Route Handlers، Drizzle ORM + PostgreSQL، Redis (صف · سهمیه · محدودیت نرخ)
- **ورکر:** Python 3.13، [`remove-ai-watermarks`](https://github.com/wiltodelta/remove-ai-watermarks) + FFmpeg
- **ذخیره‌سازی:** S3-compatible، فقط با URL امضاشده

> Unstampr برای حذف واترمارک محتوای تولیدشده با هوش مصنوعی است و فرض می‌کند شما مالک محتوا یا مجاز به
> تغییر آن هستید. این سرویس برای دور زدن لایسنس محتوای تجاری یا استوک پولی نیست.

### وضعیت — نسخه ۱ (رایگان)

| بخش | وضعیت |
|------|-------|
| حذف واترمارک تصویر و ویدیو | ✅ فعال |
| حساب، سهمیه روزانه، تاریخچه، داشبورد | ✅ فعال — `FREE_DAILY_JOBS` (پیش‌فرض ۵ در روز) |
| پرداخت / اشتراک | ⏸ کدها کامل، ولی خاموش پشت `PAYMENTS_ENABLED=false` (نسخه ۲) |
| حمایت مالی | ✅ Buy Me a Coffee · Ko-fi · GitHub Sponsors |
| زبان‌ها | ✅ en · fa (RTL) · es · zh · hi با تشخیص از روی IP |
| UI/UX و موشن | ✅ سیستم طراحی، اسکرول‌استوری، اسلایدر مقایسه تعاملی |
| ویدیو دموی محصول | ⏳ در برنامه |

وضعیت کامل فازها: [docs/ROADMAP.md](docs/ROADMAP.md) · سیستم طراحی: [docs/ui.md](docs/ui.md)

### نحوه کار — روایت اسکرولی

بخش «چطور کار می‌کند» یک کارت دمو را سنجاق می‌کند و با ورود هر مرحله به دید کاربر، همان مرحله را
نشان می‌دهد.

![اسکرول استوری](docs/screenshots/landing-steps.png)

### قبل و بعد، کشیدنی

مقایسه واقعی است: با ماوس بکش، یا فوکوس کن و با کلیدهای ← → جابه‌جا شو.

![مقایسه قبل و بعد](docs/screenshots/landing-compare.png)

### چرا Unstampr

![ویژگی‌ها](docs/screenshots/landing-features.png)

### محیط کار (Workspace)

از حالت خالی تا انتخاب فایل؛ همان صفحه هم تصویر و هم ویدیو را می‌گیرد، نوع و حجم را در لبه API
اعتبارسنجی می‌کند و آپلود را با پیشرفت زنده نشان می‌دهد.

<table>
<tr>
<td width="50%"><img src="docs/screenshots/workspace-idle.png" alt="محیط کار — حالت خالی"></td>
<td width="50%"><img src="docs/screenshots/workspace-selected.png" alt="محیط کار — فایل انتخاب‌شده"></td>
</tr>
</table>

### موبایل

برای ۳۹۰ پیکسل طراحی شده، نه فشرده‌شده از دسکتاپ.

<table>
<tr>
<td width="33%"><img src="docs/screenshots/mobile-landing.png" alt="لندینگ موبایل"></td>
<td width="33%"><img src="docs/screenshots/mobile-workspace.png" alt="محیط کار موبایل"></td>
<td width="33%"><img src="docs/screenshots/mobile-menu.png" alt="منوی موبایل"></td>
</tr>
</table>

### راست‌به‌چپ

یک پیاده‌سازی، نه دو تا: CSS منطقی (`ms/me`، `ps/pe`، `start/end`) و اسلایدر مقایسه‌ی
جهت‌آگاه.

<table>
<tr>
<td width="50%"><img src="docs/screenshots/rtl-workspace.png" alt="محیط کار فارسی (RTL)"></td>
<td width="50%"><img src="docs/screenshots/rtl-mobile.png" alt="هدر موبایل فارسی (RTL)"></td>
</tr>
</table>

### صفحه‌های دیگر

<table>
<tr>
<td width="50%"><img src="docs/screenshots/pricing.png" alt="قیمت‌ها (پیش‌نمایش نسخه ۲)"></td>
<td width="50%"><img src="docs/screenshots/faq.png" alt="سؤالات متداول"></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/login.png" alt="ورود"></td>
<td width="50%"><img src="docs/screenshots/landing-cta.png" alt="دعوت پایانی"></td>
</tr>
</table>

### معماری

```
مرورگر → Next.js (UI + API) → PostgreSQL → صف Redis → ورکر پایتون
        → remove-ai-watermarks + FFmpeg → آبجکت استوریج → نتیجه → Next.js → مرورگر
```

دو فرآیند اجرایی (Next.js و ورکر پایتون) و سه سرویس زیرساخت (Postgres، Redis، S3). بدون
میکروسرویس. جزئیات: [docs/architecture.md](docs/architecture.md).

### مدل رایگان (نسخه ۱)

- `FREE_DAILY_JOBS` (پیش‌فرض **۵**) کار در روز، برای هر حساب، بر مبنای روز UTC.
- شمارنده در Redis (`quota:daily:{userId}:{date}`) و بررسی در `POST /api/jobs` **قبل از** صف‌شدن؛
  عبور از سهمیه → `DAILY_QUOTA_EXCEEDED` همراه `used`/`limit`/`resetAt`.
- کردیت و درگاه‌ها در کد می‌مانند ولی تا وقتی `PAYMENTS_ENABLED=false` است خاموش‌اند. دلیل و مسیر
  فعال‌سازی: [docs/adr/0001-free-v1-daily-quota.md](docs/adr/0001-free-v1-daily-quota.md).
- حمایت مالی هیچ قابلیتی را قفل نمی‌کند.

### شروع سریع

```bash
git clone https://github.com/Hosseinamiri850/unstampr.git
cd unstampr

docker compose up -d          # postgres (پورت میزبان 5433) + redis + minio
cp .env.example .env
npm install
npm run dev                   # http://localhost:3000 → /en
```

ورکر در ترمینال دوم:

```bash
python -m venv .venv
.venv\Scripts\activate            # ویندوز   (روی لینوکس: source .venv/bin/activate)
pip install -r worker/requirements.txt
python -m worker                  # مصرف صف pakino:jobs
```

پیش‌نیازها: Node ≥ ۲۲ · Python ≥ ۳٫۱۱ (کانتینر ۳٫۱۳) · FFmpeg · Docker (اختیاری).

### اسکریپت‌ها

| دستور | کار |
|------|-----|
| `npm run dev` | سرور توسعه (Turbopack) |
| `npm run build` / `npm start` | بیلد تولیدی / اجرا |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint روی `src/**` |
| `npm test` | Vitest — ۵۲ تست (سوئیت‌های DB بدون Postgres رد می‌شوند) |
| `python -m pytest worker/tests -q` | تست‌های ورکر |

CI همه‌ی این‌ها **به‌همراه** `npm run build` را روی هر push و PR اجرا می‌کند.

### اجرای تولیدی

```bash
SESSION_SECRET=$(openssl rand -hex 32) \
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

ایمیج‌ها: `node:22-alpine`، `python:3.13-slim` (+ FFmpeg)، `postgres:16-alpine`، `redis:7-alpine`،
MinIO. میزبانی جهانی، هدرهای geo و چک‌لیست لانچ: [docs/deployment.md](docs/deployment.md).

### تنظیمات

| متغیر | پیش‌فرض | کاربرد |
|-------|---------|--------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | دامنه عمومی (OG، sitemap) |
| `DATABASE_URL` | `postgres://pakino:pakino@localhost:5432/pakino` | Postgres |
| `REDIS_URL` | `redis://localhost:6379` | صف، سهمیه، محدودیت نرخ |
| `S3_*` | MinIO محلی | ذخیره‌سازی آبجکت |
| `MAX_IMAGE_SIZE` / `MAX_VIDEO_SIZE` / `MAX_VIDEO_DURATION` | ۱۰MB / ۵۰۰MB / ۳۰۰s | محدودیت هر فایل |
| `FREE_DAILY_JOBS` | `5` | سهمیه روزانه رایگان |
| `FILE_RETENTION_HOURS` | `24` | حذف خودکار ورودی و خروجی |
| `NEXT_PUBLIC_DONATION_BMAC` / `_KOFI` / `_GITHUB` | _خالی_ | لینک‌های حمایت مالی |
| `NEXT_PUBLIC_PAYMENTS_ENABLED` | `false` | کلید نسخه ۲ برای پلن و کردیت |
| `SESSION_SECRET` | فقط توسعه | کلید امضای JWT — در تولید ۳۲ بایت تصادفی |

### جریان کار

۱. آپلود → `PUT` امضاشده به S3 → ردیف job با وضعیت `UPLOADING`
۲. `POST /api/jobs` → بررسی سهمیه (نسخه ۱) یا کسر کردیت (نسخه ۲) → پیام به Redis
۳. ورکر `BRPOP` → `ANALYZING → DETECTING → PROCESSING → ENCODING → COMPLETED`
۴. UI روی `GET /api/jobs/:id` نظرسنجی می‌کند → مقایسه قبل/بعد + دانلود

اگر واترمارک پشتیبانی‌شده‌ای پیدا نشود، کار با `NO_WATERMARK_DETECTED` و بدون خروجی تمام می‌شود و
UI همین را صادقانه می‌گوید.

### چندزبانه

پنج زبان فعال است (`en` پیش‌فرض، `fa` راست‌به‌چپ، `es`، `zh`، `hi`) زیر `/{locale}/**`. ترتیب تشخیص
زبان: کوکی `NEXT_LOCALE` → مسیر صریح → هدر geo (`x-vercel-ip-country`، `cf-ipcountry`،
`x-geo-country`) → `Accept-Language`. `sitemap.xml` برای هر زبان × مسیر، hreflang می‌دهد. روش
افزودن زبان: [docs/development.md](docs/development.md#working-with-messages-i18n).

### مستندات

[docs/ROADMAP.md](docs/ROADMAP.md) · [معماری](docs/architecture.md) ·
[توسعه](docs/development.md) · [استقرار](docs/deployment.md) · [UI](docs/ui.md) ·
[پردازش](docs/processing.md) · [امنیت](docs/security.md) · [صورتحساب](docs/billing.md) ·
[بله](docs/bale.md) · [پایداری صف](docs/JOB_RELIABILITY_REPORT.md)

**لایسنس:** Apache-2.0 (وارث `remove-ai-watermarks`). کد © مشارکت‌کنندگان Unstampr.
