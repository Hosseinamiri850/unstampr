'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { PlanId } from '@/lib/plans';

type BaleStatus = { configured: boolean; linked: boolean; username: string | null };

export function PurchaseButton({
  planId,
  priceToman,
}: {
  planId: PlanId;
  priceToman: number;
  /** kept for call-site compatibility; credits are shown by the plan card */
  credits?: number;
}) {
  const t = useTranslations('pricing');
  const locale = useLocale() as 'fa' | 'en';
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [baleSent, setBaleSent] = useState(false);
  const [bale, setBale] = useState<BaleStatus | null>(null);
  const [linkCode, setLinkCode] = useState<{ deepLink: string; code: string } | null>(null);

  async function purchase(provider: 'bale') {
    setBusy(provider);
    setError(null);
    try {
      if (provider === 'bale') {
        const status = (await fetch('/api/payments/bale/link').then((r) => r.json())) as BaleStatus;
        setBale(status);
        if (!status.configured) {
          setError(t('baleUnavailable'));
          return;
        }
        if (!status.linked) {
          setError(t('baleNotLinked'));
          return;
        }
        const res = await fetch('/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId, provider: 'bale' }),
        });
        const body = await res.json();
        if (!res.ok) {
          if (body?.error === 'BALE_NOT_LINKED') setError(t('baleNotLinked'));
          else setError(t('paymentFailed'));
          return;
        }
        setBaleSent(true);
      }
    } finally {
      setBusy(null);
    }
  }

  if (priceToman === 0) {
    return (
      <Button asChild className="mt-6 w-full" variant="outline">
        <a href={`/${locale}/register`}>{t('choose')}</a>
      </Button>
    );
  }

  if (baleSent) {
    return (
      <div className="mt-6 rounded-lg border border-border bg-muted/40 p-3 text-center text-sm">
        <p className="font-medium">{t('baleInvoiceSent')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('baleInvoiceSentHint')}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-2">
      <Button className="w-full" variant="default" disabled={busy !== null} onClick={() => purchase('bale')}>
        {busy === 'bale' ? t('processing') : t('payWithBale')}
      </Button>
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p>{error}</p>
          {bale && bale.configured && !bale.linked && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              disabled={busy !== null}
              onClick={async () => {
                setBusy('link');
                try {
                  const res = await fetch('/api/payments/bale/link', { method: 'POST' });
                  const body = await res.json();
                  if (res.ok) setLinkCode({ deepLink: body.deepLink, code: body.code });
                } finally {
                  setBusy(null);
                }
              }}
            >
              {t('connectBale')}
            </Button>
          )}
          {linkCode && (
            <div className="mt-2 rounded-md bg-background p-2 text-xs">
              <p className="font-mono break-all">{linkCode.code}</p>
              <a className="mt-1 block text-primary underline" href={linkCode.deepLink} target="_blank" rel="noreferrer">
                {t('openBaleToLink')}
              </a>
              <p className="mt-1 text-muted-foreground">{t('linkCodeHint')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
