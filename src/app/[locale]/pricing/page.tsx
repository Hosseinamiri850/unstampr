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
    <div className="container py-16 md:py-24">
      <PricingTable />
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });
  return { title: t('title'), description: t('subtitle'), alternates: { canonical: `/${locale}/pricing` } };
}
