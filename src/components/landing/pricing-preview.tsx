import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PLANS } from '@/lib/plans';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion/motion-primitives';

export async function PricingPreview() {
  const t = await getTranslations('pricing');
  const locale = await getLocale();

  const priceText = (plan: (typeof PLANS)[number]) =>
    locale === 'fa' || !plan.priceToman
      ? plan.priceLabel
      : `${new Intl.NumberFormat(locale).format(plan.priceToman)} ${t('toman')}`;

  return (
    <section className="border-t border-border/60 py-16 md:py-24">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
        </Reveal>

        <StaggerGroup className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const popular = plan.id === 'mvp';
            return (
              <StaggerItem key={plan.id}>
                <div
                  className={cn(
                    'relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift',
                    popular ? 'border-primary/45 shadow-lift md:-mt-3 md:mb-3' : 'border-border shadow-soft',
                  )}
                >
                  {popular && (
                    <span className="absolute end-5 top-5 rounded-full bg-primary px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-primary-foreground">
                      {t('mostPopular')}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold">{t(`plans.${plan.id}`)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`plans.${plan.id}Desc`)}</p>
                  <div className="mt-6 flex min-h-[3.9rem] flex-col justify-end">
                    {plan.priceToman ? (
                      <span className="text-2xl font-bold leading-tight tracking-tight">{priceText(plan)}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.credits.toLocaleString()} {t('credits')}
                  </p>
                  <div className="mt-auto pt-6">
                    <Button asChild className="w-full" variant={popular ? 'default' : 'outline'}>
                      <Link href="/pricing">{t('choose')}</Link>
                    </Button>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
