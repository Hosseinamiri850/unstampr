'use client';

import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';

/**
 * Thin brand-green reading-progress bar pinned to the top of the viewport.
 * Decorative only (aria-hidden); hidden entirely under reduced motion.
 */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 160, damping: 30, restDelta: 0.001 });

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-primary via-primary to-warm-accent rtl:origin-right"
    />
  );
}
