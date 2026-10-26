import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Reveal } from '@/components/motion/motion-primitives';
import { HelpCircle } from 'lucide-react';

type Props = { params: Promise<{ locale: string }> };

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'faq' });

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 gradient-radial opacity-70" />
      <div className="container max-w-3xl py-16 md:py-24">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-primary shadow-soft">
            <HelpCircle className="h-3.5 w-3.5" />
            FAQ
          </span>
          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
          <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">{t('subtitle')}</p>
        </Reveal>

        <Reveal className="mt-10" delay={0.1}>
          <div className="rounded-2xl border border-border bg-card px-6 shadow-soft">
            <Accordion type="single" collapsible defaultValue="q1">
              {[1, 2, 3, 4, 5].map((n) => (
                <AccordionItem key={n} value={`q${n}`}>
                  <AccordionTrigger>{t(`items.q${n}`)}</AccordionTrigger>
                  <AccordionContent>{t(`items.a${n}`)}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faq' });
  return { title: t('title'), alternates: { canonical: `/${locale}/faq` } };
}
