'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

// Read env vars directly (not via dynamic keys) so Next.js inlines them into
// the client bundle; a dynamic process.env[key] access breaks SSR/CSR parity.
const options = [
  { key: 'BMAC', label: 'Buy Me a Coffee', url: process.env.NEXT_PUBLIC_DONATION_BMAC ?? '' },
  { key: 'KOFI', label: 'Ko-fi', url: process.env.NEXT_PUBLIC_DONATION_KOFI ?? '' },
  { key: 'GITHUB', label: 'GitHub Sponsors', url: process.env.NEXT_PUBLIC_DONATION_GITHUB ?? '' },
] as const;

export function DonationLinks({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('donate');
  const links = options.filter((o) => o.url);

  if (links.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Heart className="h-4 w-4 text-muted-foreground" />
        {links.map((l) => (
          <a
            key={l.key}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {l.label}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">{t('title')}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{t('desc')}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((l) => (
          <Button key={l.key} asChild variant="outline" size="sm">
            <a href={l.url} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
}
