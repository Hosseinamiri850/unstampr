'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { locales, localeLabels, type Locale } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const t = useTranslations('language');
  const current = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onChoose(next: Locale) {
    if (next === current) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('switch')} disabled={isPending}>
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        {locales.map((l) => (
          <DropdownMenuItem key={l} onClick={() => onChoose(l)} className="justify-between">
            <span>{localeLabels[l]}</span>
            <Check className={cn('h-4 w-4', l === current ? 'opacity-100' : 'opacity-0')} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
