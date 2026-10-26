import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RemoveClient } from '@/components/uploader/remove-client';
import { Reveal } from '@/components/motion/motion-primitives';
import { getEnv } from '@/lib/env';

type Props = { params: Promise<{ locale: string }> };

export default async function RemovePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'workspace' });

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 gradient-radial opacity-80"
      />
      <div className="container max-w-3xl py-12 md:py-16">
        <Reveal className="text-center">
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
          <p className="mx-auto mt-3 max-w-lg text-balance text-muted-foreground">{t('subtitle')}</p>
          <ol className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
            {[t('step1'), t('step2'), t('step3')].map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 shadow-soft">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/12 text-[0.6rem] font-bold text-primary">
                    {i + 1}
                  </span>
                  {step}
                </span>
                {i < 2 && (
                  <span aria-hidden className="text-border">
                    —
                  </span>
                )}
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="mt-10" delay={0.1}>
          <RemoveClient maxImage={getEnv().MAX_IMAGE_SIZE} maxVideo={getEnv().MAX_VIDEO_SIZE} />
        </Reveal>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const nav = await getTranslations({ locale, namespace: 'nav' });
  return { title: nav('remove'), description: t('description'), alternates: { canonical: `/${locale}/remove` } };
}
