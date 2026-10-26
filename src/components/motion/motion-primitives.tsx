'use client';

import { useRef } from 'react';
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { cn } from '@/lib/utils';

/** Soft springy entrance used by most blocks. */
export const easeOutSoft = [0.22, 0.61, 0.36, 1] as const;
export const easeSpring = [0.34, 1.3, 0.5, 1] as const;

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** vertical offset in px for the initial hidden state */
  y?: number;
  once?: boolean;
};

/** Fade+rise when the element scrolls into view. Honors prefers-reduced-motion. */
export function Reveal({ children, className, delay = 0, y = 16, once = true }: RevealProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '-60px' });

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      data-reveal
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: easeOutSoft, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Staggers direct children with a small delay between each. */
export function StaggerGroup({
  children,
  className,
  step = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  step?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      data-reveal
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: step } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOutSoft } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Scroll-linked horizontal drift for decorative layers. */
export function useParallaxY(distance = 40): { ref: React.RefObject<HTMLDivElement | null>; y: MotionValue<number> } {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  return { ref, y };
}

export function Parallax({
  children,
  className,
  distance = 40,
}: {
  children: React.ReactNode;
  className?: string;
  distance?: number;
}) {
  const reduce = useReducedMotion();
  const { ref, y } = useParallaxY(distance);
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div ref={ref} style={{ y }} className={cn('will-change-transform', className)}>
      {children}
    </motion.div>
  );
}
