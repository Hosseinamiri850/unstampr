import { getTranslations } from 'next-intl/server';
import { CompareSlider } from '@/components/motion/compare-slider';
import { Reveal } from '@/components/motion/motion-primitives';
import { DemoArt } from './demo-art';

export async function BeforeAfter() {
  const t = await getTranslations('beforeAfter');

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
        </Reveal>

        <Reveal className="mx-auto mt-10 max-w-4xl" delay={0.1}>
          <CompareSlider
            beforeLabel={t('before')}
            afterLabel={t('after')}
            before={<DemoArt kind="before" label={t('before')} />}
            after={<DemoArt kind="after" label={t('after')} />}
            className="shadow-lift"
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">{t('dragHint')}</p>
        </Reveal>
      </div>
    </section>
  );
}
