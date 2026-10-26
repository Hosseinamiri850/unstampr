import { cn } from '@/lib/utils';

/**
 * Generated stand-in artwork for before/after demonstrations. Pure SVG so the
 * marketing pages need no binary assets; the "before" frame carries a fake
 * watermark chip that the "after" frame drops.
 */
export function DemoArt({
  kind,
  className,
  label,
}: {
  kind: 'before' | 'after';
  className?: string;
  label?: string;
}) {
  const marked = kind === 'before';

  return (
    <svg
      viewBox="0 0 800 500"
      role="img"
      aria-label={label}
      className={cn('h-full w-full object-cover', className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`sky-${kind}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={marked ? 'hsl(160 18% 78%)' : 'hsl(158 26% 88%)'} />
          <stop offset="1" stopColor={marked ? 'hsl(48 18% 84%)' : 'hsl(46 32% 92%)'} />
        </linearGradient>
        <linearGradient id={`sea-${kind}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={marked ? 'hsl(158 22% 46%)' : 'hsl(160 30% 40%)'} />
          <stop offset="1" stopColor={marked ? 'hsl(160 30% 26%)' : 'hsl(158 40% 24%)'} />
        </linearGradient>
        <linearGradient id={`hill-${kind}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={marked ? 'hsl(150 18% 34%)' : 'hsl(152 26% 30%)'} />
          <stop offset="1" stopColor={marked ? 'hsl(158 24% 22%)' : 'hsl(156 34% 20%)'} />
        </linearGradient>
        <radialGradient id={`sun-${kind}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={marked ? 'hsl(40 40% 88%)' : 'hsl(38 92% 82%)'} />
          <stop offset="1" stopColor={marked ? 'hsl(40 30% 82%)' : 'hsl(34 85% 68%)'} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sky + sun */}
      <rect width="800" height="500" fill={`url(#sky-${kind})`} />
      <circle cx="592" cy="132" r="74" fill={`url(#sun-${kind})`} />
      <circle cx="592" cy="132" r="34" fill={marked ? 'hsl(42 34% 90%)' : 'hsl(40 88% 74%)'} />

      {/* distant hills */}
      <path
        d="M0 268 L118 200 L214 250 L318 176 L432 252 L536 208 L648 258 L800 196 L800 300 L0 300 Z"
        fill={`url(#hill-${kind})`}
        opacity="0.55"
      />

      {/* sea */}
      <rect y="296" width="800" height="204" fill={`url(#sea-${kind})`} />
      <g opacity={marked ? 0.18 : 0.3} stroke="white" strokeLinecap="round" fill="none">
        <path d="M60 350h96M210 372h120M420 340h90M560 386h110M120 420h150M360 442h120M600 436h120" strokeWidth="3" />
      </g>

      {/* sailboat, so the frame reads as a photograph and not a chart */}
      <g transform="translate(196 236)">
        <path d="M22 6 L22 62 L-16 62 Z" fill="hsl(0 0% 100%)" fillOpacity={marked ? 0.55 : 0.82} />
        <path d="M26 14 L26 62 L52 62 Z" fill="hsl(0 0% 100%)" fillOpacity={marked ? 0.35 : 0.6} />
        <path d="M-22 62 L58 62 L48 76 L-12 76 Z" fill={marked ? 'hsl(158 22% 26%)' : 'hsl(160 34% 22%)'} />
        <path d="M-18 82 h70" stroke="hsl(0 0% 100%)" strokeOpacity="0.25" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* foreground shore */}
      <path d="M0 500 L0 432 C120 404 232 452 344 448 C452 444 540 410 640 426 C712 438 764 462 800 470 L800 500 Z" fill={`url(#hill-${kind})`} />

      {/* gentle vignette so the frame reads as a photo */}
      <rect width="800" height="500" fill="url(#sun-${kind})" opacity="0.06" />

      {marked && (
        <g>
          <rect
            x="56"
            y="352"
            width="268"
            height="66"
            rx="12"
            fill="hsl(0 0% 100%)"
            fillOpacity="0.14"
            stroke="hsl(0 0% 100%)"
            strokeOpacity="0.75"
            strokeWidth="2.5"
            strokeDasharray="9 7"
          />
          <text
            x="190"
            y="380"
            textAnchor="middle"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontSize="21"
            fontWeight="700"
            letterSpacing="1.5"
            fill="hsl(0 0% 100%)"
            fillOpacity="0.92"
          >
            AI GENERATED
          </text>
          <text
            x="190"
            y="404"
            textAnchor="middle"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontSize="13"
            letterSpacing="2.4"
            fill="hsl(0 0% 100%)"
            fillOpacity="0.7"
          >
            WATERMARK · DEMO
          </text>
        </g>
      )}
    </svg>
  );
}
