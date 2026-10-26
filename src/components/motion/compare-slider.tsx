'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronsLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  before: React.ReactNode;
  after: React.ReactNode;
  beforeLabel: string;
  afterLabel: string;
  className?: string;
};

/**
 * Draggable before/after comparison slider. Keyboard accessible
 * (arrow keys move the handle), respects reduced motion.
 */
export function CompareSlider({ before, after, beforeLabel, afterLabel, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const reduce = useReducedMotion();

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const isRtl = getComputedStyle(el).direction === 'rtl';
    let ratio = (clientX - rect.left) / rect.width;
    if (isRtl) ratio = 1 - ratio;
    setPos(Math.min(100, Math.max(0, ratio * 100)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => updateFromClientX(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, updateFromClientX]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative aspect-video w-full select-none overflow-hidden rounded-2xl border border-border bg-card shadow-soft',
        className,
      )}
      onPointerDown={(e) => {
        setDragging(true);
        updateFromClientX(e.clientX);
      }}
    >
      {/* after layer (full) */}
      <div className="absolute inset-0">{after}</div>

      {/* before layer clipped from the start edge up to handle */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        aria-hidden
      >
        {before}
      </div>

      {/* handle line + knob */}
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${beforeLabel} / ${afterLabel}`}
        aria-valuenow={Math.round(pos)}
        aria-valuemin={0}
        aria-valuemax={100}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 3;
          if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - step));
          if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + step));
        }}
        className="absolute inset-y-0 cursor-ew-resize outline-none focus-visible:[&_.knob]:ring-2 focus-visible:[&_.knob]:ring-ring"
        style={{ left: `calc(${pos}% - 1px)` }}
      >
        <div className="absolute inset-y-0 w-0.5 bg-white/90 shadow" />
        <div
          className={cn(
            'knob absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-white p-2 text-primary shadow-lift',
            !reduce && 'transition-transform group-active:scale-110',
          )}
        >
          <ChevronsLeftRight className="h-4 w-4" />
        </div>
      </div>

      {/* labels */}
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-primary/85 px-2 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
        {afterLabel}
      </span>
    </div>
  );
}
