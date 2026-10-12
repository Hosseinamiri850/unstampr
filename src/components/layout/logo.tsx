import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden className="shrink-0">
        <rect width="28" height="28" rx="7" fill="url(#us-grad)" />
        {/* watermark mark being wiped: dashed remnant + solid erase swoosh */}
        <path
          d="M8 10.5h6.5M8 14h4"
          stroke="white"
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M7 19.5c4.5 0 9.5-6 14-8.5"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M17.5 18.5l2 2 4-4.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="us-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="hsl(217 91% 60%)" />
            <stop offset="1" stopColor="hsl(225 76% 48%)" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-base font-semibold tracking-tight">Unstampr</span>
    </span>
  );
}
