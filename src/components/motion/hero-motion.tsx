'use client';

import { useReducedMotion, motion } from 'framer-motion';
import { easeOutSoft } from './motion-primitives';

/**
 * Staged hero entrance: each child (badge, headline, CTAs, uploader)
 * fades/rises in sequence on mount. No-op under reduced motion.
 */
export function HeroMotion({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: easeOutSoft, delay }}
    >
      {children}
    </motion.div>
  );
}
