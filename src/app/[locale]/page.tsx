import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getEnv } from '@/lib/env';
import { OG_IMAGE } from '@/lib/seo';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Providers } from '@/components/landing/providers';
import { BeforeAfter } from '@/components/landing/before-after';
import { PricingPreview } from '@/components/landing/pricing-preview';
import { Faq } from '@/components/landing/faq';
import { PrivacyBanner } from '@/components/landing/privacy-banner';
import { FinalCta } from '@/components/landing/final-cta';

type Props = { params: Promise<{ locale: string }> };

/** Open Graph locale tags (OG wants language_TERRITORY, not BCP-47). */
const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  fa: 'fa_IR',
  es: 'es_ES',
  zh: 'zh_CN',
  hi: 'hi_IN',
  ar: 'ar_AR',
  'pt-BR': 'pt_BR',
  ru: 'ru_RU',
  fr: 'fr_FR',
  de: 'de_DE',
  ja: 'ja_JP',
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Unstampr',
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Web',
            inLanguage: ['fa', 'en'],
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'IRR' },
          }),
        }}
      />
      <Hero />
      <Features />
      <HowItWorks />
      <Providers />
      <BeforeAfter />
      {getEnv().PAYMENTS_ENABLED && <PricingPreview />}
      <PrivacyBanner />
      <Faq />
      <FinalCta />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: `/${locale}` },
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      locale: OG_LOCALE[locale] ?? 'en_US',
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: t('ogTitle'),
      description: t('ogDescription'),
      images: [OG_IMAGE],
    },
  };
}
