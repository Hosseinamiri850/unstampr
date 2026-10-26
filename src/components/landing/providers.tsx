import { getTranslations } from 'next-intl/server';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion/motion-primitives';

const PROVIDERS = ['Hailuo', 'Veo', 'Kling', 'Sora', 'Seedance', 'Dola'] as const;

export async function Providers() {
  const t = await getTranslations('providers');

  return (
    <section className="py-14">
      <div className="container">
        <Reveal>
          <h2 className="text-center text-xl font-medium text-muted-foreground">{t('title')}</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground/70">{t('subtitle')}</p>
        </Reveal>
        <StaggerGroup className="mt-8 flex flex-wrap items-center justify-center gap-3" step={0.05}>
          {PROVIDERS.map((p) => (
            <StaggerItem key={p}>
              <span className="inline-block rounded-full border border-border bg-white px-5 py-2 text-sm font-medium tracking-tight shadow-soft transition-colors hover:border-primary/40 hover:text-primary dark:bg-card">
                {p}
              </span>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
