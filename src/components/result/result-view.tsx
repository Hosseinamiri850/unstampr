'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Check, Download, Heart, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CompareSlider } from '@/components/motion/compare-slider';
import { formatBytes, formatDate, formatDuration } from '@/lib/utils';
import type { JobDto } from '@/lib/types';

export function ResultView({ job }: { job: JobDto }) {
  const t = useTranslations('result');
  const tBeforeAfter = useTranslations('beforeAfter');
  const tcommon = useTranslations('common');
  const tdonate = useTranslations('donate');
  const locale = useLocale() as 'fa' | 'en';
  const reduce = useReducedMotion();
  const [downloaded, setDownloaded] = useState(false);
  const isImage = job.type === 'image';

  useEffect(() => {
    if (!downloaded) return;
    const id = setTimeout(() => setDownloaded(false), 2600);
    return () => clearTimeout(id);
  }, [downloaded]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
      className="mt-6 space-y-4"
    >
      {isImage && job.outputUrl ? (
        <CompareSlider
          beforeLabel={tBeforeAfter('before')}
          afterLabel={tBeforeAfter('after')}
          className="shadow-lift"
          before={
            job.inputUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.inputUrl}
                alt={tBeforeAfter('before')}
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="h-full w-full bg-secondary" />
            )
          }
          after={
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.outputUrl}
              alt={tBeforeAfter('after')}
              className="h-full w-full object-cover"
              draggable={false}
            />
          }
        />
      ) : job.outputUrl ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-soft">
          <video src={job.outputUrl} controls className="w-full" />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild className="shadow-soft">
          <a href={job.outputUrl ?? '#'} download onClick={() => setDownloaded(true)}>
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={downloaded ? 'done' : 'idle'}
                initial={reduce ? false : { scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex"
              >
                {downloaded ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              </motion.span>
            </AnimatePresence>
            {isImage ? t('downloadImage') : t('downloadVideo')}
          </a>
        </Button>
        <Button asChild variant="outline">
          <Link href="/remove">
            <RefreshCw className="h-4 w-4" />
            {tcommon('processNew')}
          </Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        <Link
          href="/support"
          className="inline-flex items-center gap-1.5 underline decoration-primary/30 underline-offset-4 transition-colors hover:text-primary"
        >
          <Heart className="h-3.5 w-3.5" />
          {tdonate('title')}
        </Link>
      </p>

      <Card className="p-4">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Field label={t('originalSize')} value={formatBytes(job.inputSize ?? 0, locale)} />
          <Field label={t('outputSize')} value={formatBytes(job.outputSize ?? 0, locale)} />
          {job.durationSeconds != null && (
            <Field label={t('duration')} value={formatDuration(job.durationSeconds, locale)} />
          )}
          {job.completedAt && <Field label={t('processingTime')} value={formatDate(job.completedAt, locale)} />}
          {job.provider && <Field label={t('provider')} value={job.provider} />}
          {job.confidence != null && (
            <Field label={t('confidence')} value={`${Math.round(job.confidence * 100)}%`} />
          )}
        </dl>
      </Card>
    </motion.div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
