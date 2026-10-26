import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroUploader } from '@/components/uploader/hero-uploader';
import { HeroMotion } from '@/components/motion/hero-motion';
import { CompareSlider } from '@/components/motion/compare-slider';
import { DemoArt } from './demo-art';

export async function Hero() {
  const t = await getTranslations('hero');
  const tBeforeAfter = await getTranslations('beforeAfter');
  const locale = await getLocale();
  const Arrow = locale === 'fa' || locale === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <section className="relative overflow-hidden">
      {/* warm dotted field + soft brand glow */}
      <div className="absolute inset-0 -z-10 bg-dots opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
      <div className="absolute inset-0 -z-10 gradient-radial" />

      <div className="container grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-24">
        {/* ── copy column ─────────────────────────────────────────────── */}
        <div className="text-center lg:text-start">
          <HeroMotion>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3.5 py-1.5 text-xs font-medium text-primary shadow-soft backdrop-blur dark:bg-card/70">
              <Sparkles className="h-3.5 w-3.5" />
              {t('badge')}
            </span>
          </HeroMotion>

          <HeroMotion delay={0.08}>
            <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
              {t('title')}
            </h1>
          </HeroMotion>

          <HeroMotion delay={0.16}>
            <p className="mt-5 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0 mx-auto">
              {t('subtitle')}
            </p>
          </HeroMotion>

          <HeroMotion delay={0.24}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild size="lg" className="shadow-soft transition-transform duration-200 hover:-translate-y-0.5">
                <Link href="/remove">
                  {t('ctaPrimary')}
                  <Arrow className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#how-it-works">{t('ctaSecondary')}</Link>
              </Button>
            </div>
          </HeroMotion>

          <HeroMotion delay={0.32}>
            <p className="mt-5 text-xs font-medium tracking-wide text-muted-foreground/90">{t('trust')}</p>
          </HeroMotion>

          <HeroMotion delay={0.4} className="mt-8">
            <HeroUploader />
          </HeroMotion>
        </div>

        {/* ── demonstration column ────────────────────────────────────── */}
        <HeroMotion delay={0.2} className="relative">
          <div
            aria-hidden
            className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/12 via-transparent to-warm-accent/20 blur-2xl"
          />
          <CompareSlider
            beforeLabel={tBeforeAfter('before')}
            afterLabel={tBeforeAfter('after')}
            before={<DemoArt kind="before" label={tBeforeAfter('before')} />}
            after={<DemoArt kind="after" label={tBeforeAfter('after')} />}
            className="shadow-lift"
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">{t('demoCaption')}</p>
        </HeroMotion>
      </div>
    </section>
  );
}
