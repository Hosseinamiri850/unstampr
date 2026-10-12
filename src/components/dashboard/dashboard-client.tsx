'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <div className="container py-10">
      {focusJobId && <JobTracker jobId={focusJobId} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('remainingCredits')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !account ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-3xl font-semibold">
                  {formatNumber(paymentsEnabled ? account.credits : (account.quota?.limit ?? freeCredits) - (account.quota?.used ?? 0), locale)}
                </div>
                <div className="mt-2">
                  {paymentsEnabled ? (
                    <>
                      <Progress value={Math.min(100, (account.credits / freeCredits) * 100)} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('of')} {formatNumber(freeCredits, locale)}
                      </p>
                    </>
                  ) : (
                    <>
                      <Progress value={Math.min(100, ((account.quota?.used ?? 0) / Math.max(1, account.quota?.limit ?? freeCredits)) * 100)} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatNumber(account.quota?.used ?? 0, locale)} {t('of')} {formatNumber(account.quota?.limit ?? freeCredits, locale)} {t('todayUsage')}
                      </p>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentsEnabled ? t('currentPlan') : t('dailyQuota')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !account ? (
              <Skeleton className="h-8 w-20" />
            ) : paymentsEnabled ? (
              <div className="text-2xl font-semibold">{account.plan}</div>
            ) : (
              <div className="text-2xl font-semibold">
                {formatNumber(Math.max(0, (account.quota?.limit ?? 0) - (account.quota?.used ?? 0)), locale)}
                <span className="ms-1 text-sm font-normal text-muted-foreground">/ {formatNumber(account.quota?.limit ?? 0, locale)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('totalProcessed')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !account ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-semibold">{formatNumber(account.totalProcessed, locale)}</div>}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <DonationLinks />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('recentJobs')}</h2>
        <Button asChild variant="outline" size="sm">
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
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">{t('noJobs')}</p>
              <Button asChild>
                <Link href="/remove">{t('startProcessing')}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recent.map((job) => (
              <RecentJobRow key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecentJobRow({ job }: { job: RecentJob }) {
  const t = useTranslations('dashboard');
  const tstage = useTranslations('stages');
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {job.type === 'image' ? t('typeImage') : t('typeVideo')}
        </p>
        <p className="text-xs text-muted-foreground">{tstage(job.status)}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{job.createdAt}</span>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/dashboard?job=${job.id}`}>{t('view')}</Link>
        </Button>
      </div>
    </div>
  );
}

export type { Account, RecentJob };
export type { WatermarkInfo };
