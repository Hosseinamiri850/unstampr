import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-[inset_0_1px_2px_hsl(var(--green-950)/0.04)] ring-offset-background transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground hover:border-primary/35 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
