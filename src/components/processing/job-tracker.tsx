'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Info, Ban } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ResultView } from '@/components/result/result-view';
import { formatNumber } from '@/lib/utils';
import { easeOutSoft } from '@/components/motion/motion-primitives';
import type { JobDto } from '@/lib/types';

const PIPELINE = ['UPLOADING', 'ANALYZING', 'DETECTING', 'PROCESSING', 'ENCODING'] as const;

export function JobTracker({ jobId }: { jobId: string }) {
  const t = useTranslations('stages');
  const terr = useTranslations('errors');
  const locale = useLocale() as 'fa' | 'en';
  const reduce = useReducedMotion();
  const [job, setJob] = useState<JobDto | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = (await res.json()) as JobDto;
      if (!active) return;
      setJob(data);
      const done = data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'CANCELLED';
      if (!done) timer = setTimeout(poll, 1500);
    }

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [jobId]);

  if (!job) {
    return (
      <div className="mb-8 flex items-center justify-center rounded-2xl border border-border bg-card py-12 shadow-soft">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const done = job.status === 'COMPLETED';
  const failed = job.status === 'FAILED';
  const cancelled = job.status === 'CANCELLED';
  const percent = locale === 'fa' ? formatNumber(job.progress, locale) : job.progress;
  const stageIndex = PIPELINE.indexOf(job.status as (typeof PIPELINE)[number]);

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {done ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
          ) : failed ? (
            <XCircle className="h-5 w-5 shrink-0 text-destructive" />
          ) : cancelled ? (
            <Ban className="h-5 w-5 shrink-0 text-muted-foreground" />
          ) : (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          )}
          <span className="truncate text-sm font-medium">{t(job.status)}</span>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold tabular-nums text-secondary-foreground">
          {percent}%
        </span>
      </div>

      <div className="mt-4">
        <Progress value={job.progress} />
      </div>

      {/* pipeline segments */}
      <ol className="mt-4 hidden items-center gap-1.5 sm:flex">
        {PIPELINE.map((stage, i) => {
          const reached = done || stageIndex >= i;
          return (
            <li key={stage} className="min-w-0 flex-1">
              <motion.div
                className={`h-1 rounded-full ${reached ? 'bg-primary' : 'bg-border'}`}
                initial={false}
                animate={{ opacity: reached ? 1 : 0.6 }}
                transition={{ duration: reduce ? 0 : 0.3, ease: easeOutSoft }}
              />
              <p
                className={`mt-1.5 truncate text-[0.65rem] font-medium transition-colors ${
                  stageIndex === i && !done ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {t(stage)}
              </p>
            </li>
          );
        })}
      </ol>

      {job.provider && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          {job.provider}
        </p>
      )}

      {failed && <p className="mt-3 text-sm text-destructive">{terr(job.errorCode ?? 'generic')}</p>}

      {done && !job.outputUrl && job.errorCode === 'NO_WATERMARK_DETECTED' && (
        <p className="mt-3 text-sm text-muted-foreground">{terr('NO_WATERMARK_DETECTED')}</p>
      )}

      {done && job.outputUrl && <ResultView job={job} />}
    </div>
  );
}
