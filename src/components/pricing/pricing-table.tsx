import { getTranslations, getLocale } from 'next-intl/server';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLANS } from '@/lib/plans';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion/motion-primitives';
import { PurchaseButton } from './purchase-button';

export async function PricingTable() {
  const t = await getTranslations('pricing');
  const locale = await getLocale();

  const priceText = (plan: (typeof PLANS)[number]) =>
    locale === 'fa' || !plan.priceToman
      ? plan.priceLabel
      : `${new Intl.NumberFormat(locale).format(plan.priceToman)} ${t('toman')}`;

  return (
    <div>
      <Reveal className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
        <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
      </Reveal>

      <StaggerGroup className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3" step={0.08}>
        {PLANS.map((plan) => {
          const popular = plan.id === 'mvp';
          return (
            <StaggerItem key={plan.id}>
              <div
                className={cn(
                  'relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift',
                  popular
                    ? 'border-primary/45 shadow-lift md:-mt-3 md:mb-3'
                    : 'border-border shadow-soft hover:border-primary/25',
                )}
              >
                {popular && (
                  <>
                    <div aria-hidden className="pointer-events-none absolute inset-0 gradient-brand opacity-[0.035]" />
                    <span className="absolute end-5 top-5 rounded-full bg-primary px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-primary-foreground shadow-soft">
                      {t('mostPopular')}
                    </span>
                  </>
                )}

                <h2 className="relative text-lg font-semibold">{t(`plans.${plan.id}`)}</h2>
                <p className="relative mt-1 text-sm text-muted-foreground">{t(`plans.${plan.id}Desc`)}</p>

                {plan.priceToman ? (
                  <div className="relative mt-6">
                    <div className="text-3xl font-bold leading-tight tracking-tight">{priceText(plan)}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{t('perMonth')}</div>
                  </div>
                ) : (
                  <div className="relative mt-6 h-[3.9rem]" aria-hidden />
                )}

                <p className="relative mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  {plan.credits.toLocaleString()} {t('credits')}
                </p>

                <div className="relative mt-auto pt-6">
                  <PurchaseButton planId={plan.id} priceToman={plan.priceToman ?? 0} credits={plan.credits} />
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerGroup>
    </div>
  );
}
