'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Download, FileImage, ScanEye, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';
import { easeOutSoft } from '@/components/motion/motion-primitives';
import { DemoArt } from './demo-art';

const ICONS = [FileImage, ScanEye, Eraser, Download];

/**
 * Scroll-storytelling for the "how it works" section: the demo card is sticky
 * and its state follows whichever step is currently centred in the viewport.
 */
export function StepsShowcase({ steps }: { steps: { key: string; label: string; desc: string }[] }) {
  const tBefore = useTranslations('beforeAfter');
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const nodes = stepRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.index ?? 0);
            setActive(index);
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
      {/* ── sticky visual ───────────────────────────────────────────── */}
      <div className="order-2 lg:order-1">
        <div className="lg:sticky lg:top-[calc(50vh-11rem)]">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-secondary shadow-lift">
            <motion.div
              className="absolute inset-0"
              animate={{ opacity: active >= 2 ? 0 : 1 }}
              transition={{ duration: reduce ? 0 : 0.5, ease: easeOutSoft }}
            >
              <DemoArt kind="before" label={tBefore('before')} />
            </motion.div>
            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: active >= 2 ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.5, ease: easeOutSoft }}
            >
              <DemoArt kind="after" label={tBefore('after')} />
            </motion.div>

            {/* detection scan sweep */}
            {active === 1 && !reduce && (
              <motion.div
                aria-hidden
                initial={{ y: '-20%' }}
                animate={{ y: '120%' }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-warm-accent/45 to-transparent"
              />
            )}

            {/* uploaded-file chip */}
            <motion.div
              initial={false}
              animate={{ opacity: active === 0 ? 1 : 0, y: active === 0 ? 0 : -8 }}
              transition={{ duration: reduce ? 0 : 0.35, ease: easeOutSoft }}
              className="absolute bottom-4 start-4 flex items-center gap-2 rounded-xl bg-black/55 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm"
            >
              <FileImage className="h-3.5 w-3.5" />
              photo.png · 2.4 MB
            </motion.div>

            {/* done chip */}
            <motion.div
              initial={false}
              animate={{ opacity: active === 3 ? 1 : 0, scale: active === 3 ? 1 : 0.94 }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 24 }}
              className="absolute bottom-4 start-4 flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-lift"
            >
              <Check className="h-3.5 w-3.5" />
              clean.png
            </motion.div>
          </div>

          {/* stage dots (mobile: inline progress) */}
          <div className="mt-4 flex items-center justify-center gap-1.5 lg:justify-start">
            {steps.map((step, i) => (
              <motion.span
                key={step.key}
                className={cn('h-1.5 rounded-full', i === active ? 'bg-primary' : 'bg-border')}
                animate={{ width: i === active ? 28 : 10 }}
                transition={reduce ? { duration: 0 } : { duration: 0.35, ease: easeOutSoft }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── steps ───────────────────────────────────────────────────── */}
      <div className="order-1 lg:order-2">
        <div className="relative">
          <div aria-hidden className="absolute inset-y-2 start-[1.375rem] w-px bg-border" />
          <motion.div
            aria-hidden
            className="absolute start-[1.375rem] top-2 w-px origin-top bg-primary"
            animate={{ height: `${((active + 1) / steps.length) * 100}%` }}
            transition={reduce ? { duration: 0 } : { duration: 0.5, ease: easeOutSoft }}
          />
          <div className="space-y-2">
            {steps.map((step, i) => {
              const Icon = ICONS[i] ?? FileImage;
              const isActive = i === active;
              return (
                <div
                  key={step.key}
                  data-index={i}
                  ref={(el) => {
                    stepRefs.current[i] = el;
                  }}
                  className="relative ps-16 lg:flex lg:min-h-[26vh] lg:flex-col lg:justify-center"
                >
                  <motion.span
                    animate={
                      isActive
                        ? { backgroundColor: '#174D3A', color: '#F8F7F2', borderColor: '#174D3A' }
                        : { backgroundColor: '#FFFFFF', color: '#174D3A', borderColor: '#E3E7DF' }
                    }
                    transition={{ duration: reduce ? 0 : 0.3 }}
                    className="absolute start-0 top-1 flex h-11 w-11 items-center justify-center rounded-xl border shadow-soft lg:top-1/2 lg:-translate-y-1/2"
                  >
                    <Icon className="h-5 w-5" />
                  </motion.span>
                  <div className="max-w-sm py-4 lg:py-0">
                    <span className="text-xs font-semibold tracking-[0.2em] text-primary/70">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className={cn('mt-1 text-lg font-semibold transition-colors', isActive && 'text-primary')}>
                      {step.label}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
