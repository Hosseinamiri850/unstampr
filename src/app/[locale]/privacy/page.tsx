import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ShieldCheck, Clock, Trash2, CreditCard, FileLock } from 'lucide-react';
import { Reveal } from '@/components/motion/motion-primitives';

type Props = { params: Promise<{ locale: string }> };

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'privacy' });

  const items = [
    { key: 'filesUsed', icon: FileLock },
    { key: 'autoDelete', icon: Clock },
    { key: 'manualDelete', icon: Trash2 },
    { key: 'payment', icon: CreditCard },
  ] as const;

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 gradient-radial opacity-70" />
      <div className="container max-w-3xl py-16 md:py-24">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-primary shadow-soft">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('title')}
          </span>
          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('statement')}</h1>
        </Reveal>

        <Reveal delay={0.08} className="mt-10">
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow duration-300 hover:shadow-lift"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(key)}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.14} className="mt-4">
          <p className="rounded-2xl border border-dashed border-primary/30 bg-brand-soft/40 p-5 text-sm leading-relaxed text-foreground/80">
            {t('retention')}
          </p>
        </Reveal>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return { title: t('title'), alternates: { canonical: `/${locale}/privacy` } };
}
