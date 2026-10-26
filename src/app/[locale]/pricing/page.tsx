import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PricingTable } from '@/components/pricing/pricing-table';
import { getEnv } from '@/lib/env';

type Props = { params: Promise<{ locale: string }> };

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!getEnv().PAYMENTS_ENABLED) notFound();
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 gradient-radial opacity-80" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-dots opacity-40 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]"
      />
      <div className="container py-16 md:py-24">
        <PricingTable />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });
  return { title: t('title'), description: t('subtitle'), alternates: { canonical: `/${locale}/pricing` } };
}
