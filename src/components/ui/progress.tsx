import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const pct = Math.min(100, Math.max(0, value ?? 0));

  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={pct}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      {/* width-based fill keeps the bar growing from the inline-start edge in RTL too */}
      <ProgressPrimitive.Indicator
        className="h-full rounded-full bg-gradient-to-r from-brand-deep via-primary to-brand transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = 'Progress';

export { Progress };
