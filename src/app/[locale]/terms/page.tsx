import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Scale } from 'lucide-react';
import { Reveal } from '@/components/motion/motion-primitives';

type Props = { params: Promise<{ locale: string }> };

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const legal = await getTranslations({ locale, namespace: 'legal' });

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 gradient-radial opacity-70" />
      <div className="container max-w-3xl py-16 md:py-24">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-primary shadow-soft">
            <Scale className="h-3.5 w-3.5" />
            {legal('terms')}
          </span>
          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{legal('responsibleUse')}</h1>
        </Reveal>

        <Reveal delay={0.08} className="mt-8">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <p className="text-sm leading-7 text-muted-foreground">{legal('responsibleUseNotice')}</p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  return { title: t('terms'), alternates: { canonical: `/${locale}/terms` } };
}
