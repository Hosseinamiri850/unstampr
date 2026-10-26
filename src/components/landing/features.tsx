import { getTranslations } from 'next-intl/server';
import { Zap, Image as ImageIcon, ScanEye, ShieldCheck, Sparkles, Gauge } from 'lucide-react';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion/motion-primitives';
import { cn } from '@/lib/utils';

export async function Features() {
  const t = await getTranslations('features');
  const items = [
    { key: 'auto', icon: Zap, wide: true },
    { key: 'imageVideo', icon: ImageIcon, wide: true },
    { key: 'detect', icon: ScanEye, wide: false },
    { key: 'private', icon: ShieldCheck, wide: false },
    { key: 'quality', icon: Sparkles, wide: false },
    { key: 'fast', icon: Gauge, wide: false },
  ];

  return (
    <section className="border-t border-border/60 bg-white/60 py-16 md:py-24 dark:bg-transparent">
      <div className="container">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h2>
        </Reveal>

        {/* asymmetric bento — two wide leads, four compact supports */}
        <StaggerGroup className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ key, icon: Icon, wide }) => (
            <StaggerItem key={key} className={cn(wide && 'sm:col-span-1 lg:col-span-2')}>
              <div
                className={cn(
                  'group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift',
                  wide && 'sm:p-8',
                )}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full bg-primary/[0.06] blur-2xl transition-opacity duration-300 group-hover:bg-warm-accent/20"
                />
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:-rotate-6 group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className={cn('mt-4 font-semibold', wide ? 'text-lg' : 'text-base')}>{t(key)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`${key}Desc`)}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
