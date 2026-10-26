import { getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/motion/motion-primitives';
import { StepsShowcase } from './steps-showcase';

export async function HowItWorks() {
  const t = await getTranslations('howItWorks');
  const steps = [1, 2, 3, 4].map((n) => ({
    key: `step${n}`,
    label: t(`step${n}`),
    desc: t(`step${n}Desc`),
  }));

  return (
    <section id="how-it-works" className="scroll-mt-24 border-t border-border/60 py-16 md:py-24">
      <div className="container">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h2>
        </Reveal>
        <StepsShowcase steps={steps} />
      </div>
    </section>
  );
}
