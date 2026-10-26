/**
 * Shared social-card metadata. `openGraph` is shallow-merged between segments —
 * a child that sets it replaces the parent's entirely — so every segment that
 * defines `openGraph` must include these images explicitly.
 */
export const OG_IMAGE = {
  url: '/og.png',
  width: 1200,
  height: 630,
  alt: 'Unstampr — keep the photo, lose the watermark',
} as const;
