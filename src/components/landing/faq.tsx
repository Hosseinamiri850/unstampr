import { getTranslations } from 'next-intl/server';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Reveal } from '@/components/motion/motion-primitives';

export async function Faq() {
  const t = await getTranslations('faq');

  return (
    <section className="border-t border-border/60 py-16 md:py-24">
      <div className="container max-w-3xl">
        <Reveal className="text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">{t('subtitle')}</p>
        </Reveal>

        <Reveal className="mt-10" delay={0.08}>
          <div className="rounded-2xl border border-border bg-card px-6 shadow-soft">
            <Accordion type="single" collapsible>
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
    </section>
  );
}
