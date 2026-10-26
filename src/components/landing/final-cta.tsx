import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/motion-primitives';

export async function FinalCta() {
  const t = await getTranslations('finalCta');

  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl gradient-brand px-6 py-16 text-center shadow-lift md:py-20">
            <div className="absolute inset-0 bg-dots opacity-20" aria-hidden />
            <div className="relative">
              <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                {t('title')}
              </h2>
              <p className="mt-3 text-green-100/90">{t('subtitle')}</p>
              <Button
                asChild
                size="lg"
                className="mt-8 bg-white text-primary hover:bg-white/90 dark:bg-white dark:text-green-950 dark:hover:bg-white/90"
              >
                <Link href="/remove">{t('button')}</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
