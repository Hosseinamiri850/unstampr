# UI, design system & motion

The interface is a **friendly, creative tool**, not a corporate dashboard: dark green as the brand
anchor, warm neutrals as the surface, and motion that explains the product (watermark goes away)
rather than decorating it.

## Tokens

All tokens are CSS variables in [`src/app/globals.css`](../src/app/globals.css) and are exposed to
Tailwind through `@theme inline`, so utilities like `bg-primary`, `text-muted-foreground`,
`border-border`, `shadow-soft` work everywhere.

### Color

| Token | Value | Use |
|-------|-------|-----|
| `--green-800` → `bg-primary` | `#174D3A` | primary buttons, active nav, key highlights |
| `--green-950` → `bg-brand-deep` | `#103A2C` | gradient ends, dark surfaces |
| `--green-700` → `brand` gradient stop | `#28664B` | secondary green, gradients |
| `--green-100` → `bg-brand-soft` | `#DCE8D9` | soft section tint, drop-target state |
| `--cream` → `bg-background` | `#F8F7F2` | page surface |
| `--ink` → `text-foreground` | `#202820` | main text |
| `--ink-soft` → `text-muted-foreground` | `#687269` | secondary text |
| `--sand` → `border-border` | `#E3E7DF` | borders/dividers |
| `--amber` → `text-warm-accent` | `#E7A66A` | sparse accent (glows, progress sweep) |

Rules of thumb: green is for **actions and state**, never for large text blocks; the amber accent
appears in small doses only (hero glow, detection sweep, 2 px scroll bar); avoid purple/neon AI
gradients entirely.

### Type

Inter (Latin) + IRANYekanX (Persian/Arabic), wired in
[`src/app/[locale]/layout.tsx`](../src/app/[locale]/layout.tsx). Headings are bold with tight
tracking and `text-balance`; body copy stays at `text-sm`/`text-base` with relaxed leading. Metadata
uses uppercase `tracking-widest` labels at `text-xs`.

### Shape, depth, spacing

- Radius: `--radius: 0.875rem` for cards (`rounded-2xl`), `rounded-full` for pills, `rounded-lg/xl`
  for controls. Do not apply one radius everywhere.
- Depth: `shadow-soft` for resting cards, `shadow-lift` for hover/emphasis. Never stack multiple
  borders and shadows on the same element.
- Section rhythm: `py-16 md:py-24`; page containers use `.container` (`max-width: 1280px`).

### Utilities

`bg-dots` (dotted field), `bg-grid`, `gradient-radial` (top glow), `gradient-brand` (green panel),
`shadow-soft`, `shadow-lift`, `shimmer` (loading), plus the base `container`.

## Motion system

`framer-motion` is the single motion library. Primitives live in
[`src/components/motion/`](../src/components/motion):

| Primitive | Purpose |
|-----------|---------|
| `Reveal` | fade + rise when the element scrolls into view (`once`) |
| `StaggerGroup` / `StaggerItem` | coordinated entrance for grids/lists |
| `Parallax` | small scroll-linked drift for decorative layers |
| `HeroMotion` | staged hero entrance with a delay per block |
| `ScrollProgress` | 2 px brand progress bar pinned to the top (hidden under reduced motion) |
| `CompareSlider` | draggable before/after comparison; arrow keys move the handle |

Timing tokens (also exported as CSS variables): `--duration-fast` 150 ms, `--duration-base` 250 ms,
`--duration-slow` 450 ms; easing `--ease-out-soft` `cubic-bezier(0.22, 0.61, 0.36, 1)` and
`--ease-spring` `cubic-bezier(0.34, 1.3, 0.5, 1)`.

Guidelines:

- Animate `transform` and `opacity` first; avoid animating layout properties except deliberate
  height changes (accordion) and progress width.
- Micro-interactions stay ≤ 200 ms; section entrances 400–600 ms; stagger steps 60–100 ms.
- Distance is small (8–18 px). No bounce below 0.5 s, no aggressive parallax, no scroll hijacking.

### Scroll storytelling

[`steps-showcase.tsx`](../src/components/landing/steps-showcase.tsx) is the reference pattern: the
demo card is `sticky`, an `IntersectionObserver` with `rootMargin: '-45% 0px -45% 0px'` decides which
step is active, and each step block reserves scroll room (`lg:min-h-[26vh]`) so the visual can stay
pinned. Reuse this instead of inventing another scroll listener.

### Reduced motion & no-JS

- Every motion primitive checks `useReducedMotion()` and renders plain markup when reduce is set.
- `[data-reveal]` elements carry a `<noscript>` rule in the layout that forces them visible, so
  content never depends on JavaScript.
- Global CSS also shortens animations/transitions under `prefers-reduced-motion: reduce`.

## RTL rules

Direction comes from the locale (`dir(locale)` in [`src/i18n/config.ts`](../src/i18n/config.ts)).
Write layouts with logical utilities only — `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`,
`text-start`, `text-end`. Icons that imply direction (arrows) flip via `rtl:rotate-180` or by
picking the opposite icon, as the hero does. `CompareSlider` inverts drag maths when the container
is RTL.

## Accessibility checklist

- Focus rings: `focus-visible:ring-2 ring-ring` with an offset — never remove outlines.
- The compare slider is a `role="slider"` with `aria-valuenow`, `tabIndex=0` and arrow-key support.
- Nav uses `aria-current="page"`; the mobile sheet exposes `aria-expanded`/`aria-controls`.
- Touch targets ≥ 36–44 px; buttons keep text labels where icons alone are ambiguous.
- Color is never the only signal (status badges also carry text).
- Compare-text contrast: `text-muted-foreground` on `bg-background`/`bg-card` only.

## Adding a landing section

1. Fetch copy with `getTranslations('<namespace>')` (server component).
2. Wrap the block in `Reveal` or `StaggerGroup`; use `StaggerItem` for grid children.
3. Use existing tokens/utilities — no new colors, no ad-hoc shadows.
4. Test at 1440 px, 768 px and 390 px, in `en` and `fa` (RTL), plus `prefers-reduced-motion`.
5. Add the copy to **every** `messages/*.json` catalog (parity is enforced by
   `scripts/build-catalog.py`).
