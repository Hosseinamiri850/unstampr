'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Gauge, ImageIcon, Layers } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { JobTracker } from '@/components/processing/job-tracker';
import { DonationLinks } from '@/components/layout/donation-links';
import { formatNumber } from '@/lib/utils';
import type { JobStatus, WatermarkInfo } from '@/lib/types';

type Account = { credits: number; plan: string; totalProcessed: number; quota?: { used: number; limit: number } };

const freeCredits = Number(process.env.NEXT_PUBLIC_FREE_CREDITS ?? '50');
const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';
type RecentJob = {
  id: string;
  type: 'image' | 'video';
  status: JobStatus;
  progress: number;
  provider: string | null;
  watermarkType: string | null;
  createdAt: string;
  creditsUsed: number;
};

export function DashboardClient({ userId: _userId, focusJobId }: { userId: string; focusJobId?: string }) {
  void _userId;
  const t = useTranslations('dashboard');
  const locale = useLocale() as 'fa' | 'en';
  const reduce = useReducedMotion();
  const [account, setAccount] = useState<Account | null>(null);
  const [recent, setRecent] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch('/api/account').then((r) => r.json()), fetch('/api/jobs?limit=5').then((r) => r.json())])
      .then(([a, j]) => {
        setAccount(a as Account);
        setRecent(j.items ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const remaining = paymentsEnabled
    ? account?.credits ?? 0
    : (account?.quota?.limit ?? freeCredits) - (account?.quota?.used ?? 0);
  const quotaUsed = account?.quota?.used ?? 0;
  const quotaLimit = Math.max(1, account?.quota?.limit ?? freeCredits);

  return (
    <div className="container py-10 md:py-14">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
        </div>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/remove">
            {t('startProcessing')}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      {focusJobId && <JobTracker jobId={focusJobId} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* remaining credits / quota — the hero stat */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
          className="md:col-span-1"
        >
          <Card className="h-full overflow-hidden transition-shadow duration-300 hover:shadow-lift">
            <CardContent className="flex h-full flex-col justify-between p-6">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary/80">
                <Gauge className="h-3.5 w-3.5" />
                {t('remainingCredits')}
              </div>
              {loading || !account ? (
                <Skeleton className="mt-4 h-10 w-24" />
              ) : (
                <>
                  <div className="mt-4 text-4xl font-bold tabular-nums tracking-tight">
                    {formatNumber(paymentsEnabled ? account.credits : Math.max(0, remaining), locale)}
                  </div>
                  <div className="mt-4">
                    <Progress
                      value={
                        paymentsEnabled
                          ? Math.min(100, (account.credits / freeCredits) * 100)
                          : Math.min(100, (quotaUsed / quotaLimit) * 100)
                      }
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {paymentsEnabled ? (
                        <>
                          {t('of')} {formatNumber(freeCredits, locale)}
                        </>
                      ) : (
                        <>
                          {formatNumber(quotaUsed, locale)} {t('of')} {formatNumber(quotaLimit, locale)} {t('todayUsage')}
                        </>
                      )}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <Card className="h-full transition-shadow duration-300 hover:shadow-lift">
            <CardContent className="flex h-full flex-col justify-between gap-4 p-6">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary/80">
                <Layers className="h-3.5 w-3.5" />
                {paymentsEnabled ? t('currentPlan') : t('dailyQuota')}
              </div>
              {loading || !account ? (
                <Skeleton className="h-8 w-20" />
              ) : paymentsEnabled ? (
                <div className="text-2xl font-semibold">{account.plan}</div>
              ) : (
                <div className="text-2xl font-semibold tabular-nums">
                  {formatNumber(Math.max(0, (account.quota?.limit ?? 0) - (account.quota?.used ?? 0)), locale)}
                  <span className="ms-1 text-sm font-normal text-muted-foreground">
                    / {formatNumber(account.quota?.limit ?? 0, locale)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <Card className="h-full transition-shadow duration-300 hover:shadow-lift">
            <CardContent className="flex h-full flex-col justify-between gap-4 p-6">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary/80">
                <ImageIcon className="h-3.5 w-3.5" />
                {t('totalProcessed')}
              </div>
              {loading || !account ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-semibold tabular-nums">{formatNumber(account.totalProcessed, locale)}</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="mt-6">
        <DonationLinks />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{t('recentJobs')}</h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/history">{t('viewAll')}</Link>
        </Button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : recent.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ImageIcon className="h-5 w-5" />
              </span>
              <p className="text-sm text-muted-foreground">{t('noJobs')}</p>
              <Button asChild>
                <Link href="/remove">{t('startProcessing')}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recent.map((job, i) => (
              <RecentJobRow key={job.id} job={job} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecentJobRow({ job, index }: { job: RecentJob; index: number }) {
  const t = useTranslations('dashboard');
  const tstage = useTranslations('stages');
  const reduce = useReducedMotion();
  const tone =
    job.status === 'COMPLETED'
      ? 'bg-primary'
      : job.status === 'FAILED'
        ? 'bg-destructive'
        : job.status === 'CANCELLED'
          ? 'bg-muted-foreground/50'
          : 'bg-warm-accent';

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: reduce ? 0 : 0.04 * index, ease: [0.22, 0.61, 0.36, 1] }}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lift"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{job.type === 'image' ? t('typeImage') : t('typeVideo')}</p>
          <p className="text-xs text-muted-foreground">{tstage(job.status)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-xs text-muted-foreground sm:block">{job.createdAt}</span>
        <Button asChild size="sm" variant="ghost" className="text-primary">
          <Link href={`/dashboard?job=${job.id}`}>{t('view')}</Link>
        </Button>
      </div>
    </motion.div>
  );
}

export type { Account, RecentJob };
export type { WatermarkInfo };
