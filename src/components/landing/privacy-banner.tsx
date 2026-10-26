import { getTranslations } from 'next-intl/server';
import { ShieldCheck } from 'lucide-react';
import { Reveal } from '@/components/motion/motion-primitives';

export async function PrivacyBanner() {
  const t = await getTranslations('privacy');

  return (
    <section className="py-12 md:py-16">
      <div className="container">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-brand-soft/70 px-6 py-6 dark:bg-accent/40">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-dots opacity-30 [mask-image:linear-gradient(to_right,black,transparent)]"
            />
            <div className="relative flex flex-col items-center gap-3 text-center sm:flex-row sm:text-start">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <p className="max-w-xl text-balance text-sm leading-relaxed text-foreground/80">{t('autoDelete')}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
