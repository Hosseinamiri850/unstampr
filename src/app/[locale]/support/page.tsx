import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Heart, Clock, Sparkles } from 'lucide-react';
import { Reveal } from '@/components/motion/motion-primitives';
import { DonationLinks } from '@/components/layout/donation-links';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

type Props = { params: Promise<{ locale: string }> };

export default async function SupportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'donate' });
  const privacy = await getTranslations({ locale, namespace: 'privacy' });
  const common = await getTranslations({ locale, namespace: 'common' });

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 gradient-radial opacity-80" />
      <div className="container max-w-3xl py-16 md:py-24">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-primary shadow-soft">
            <Heart className="h-3.5 w-3.5" />
            {t('title')}
          </span>
          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
          <p className="mx-auto mt-3 max-w-xl text-balance text-muted-foreground">{t('desc')}</p>
        </Reveal>

        <Reveal className="mt-10" delay={0.08}>
          <DonationLinks />
        </Reveal>

        <Reveal className="mt-4" delay={0.14}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock className="h-4 w-4" />
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">{privacy('autoDelete')}</p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">{privacy('filesUsed')}</p>
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-10 text-center" delay={0.2}>
          <Button asChild variant="outline">
            <Link href="/remove">{common('processNew')}</Link>
          </Button>
        </Reveal>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'donate' });
  return { title: t('title'), description: t('desc'), alternates: { canonical: `/${locale}/support` } };
}
