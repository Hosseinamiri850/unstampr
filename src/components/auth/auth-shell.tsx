import { getTranslations } from 'next-intl/server';
import { Check } from 'lucide-react';
import { Logo } from '@/components/layout/logo';
import { AuthForm } from './auth-form';

/**
 * Two-column shell for login/register: brand story on the wide side, the real
 * form on the other. On small screens the brand panel collapses away.
 */
export async function AuthShell({ mode }: { mode: 'login' | 'register' }) {
  const tf = await getTranslations('features');
  const th = await getTranslations('hero');

  const points = [tf('auto'), tf('imageVideo'), tf('private')];

  return (
    <div className="container grid min-h-[75vh] items-stretch gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
      <div className="relative hidden overflow-hidden rounded-3xl gradient-brand p-10 text-primary-foreground shadow-lift lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-dots opacity-20" />
        <div
          aria-hidden
          className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-warm-accent/25 blur-3xl"
        />
        <div className="relative">
          <Logo className="text-primary-foreground" />
          <h2 className="mt-10 max-w-sm text-balance text-3xl font-bold leading-tight tracking-tight">{th('title')}</h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-primary-foreground/75">{th('subtitle')}</p>
        </div>
        <ul className="relative mt-10 space-y-3">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-primary-foreground/85">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
                <Check className="h-3 w-3" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <AuthForm mode={mode} />
        </div>
      </div>
    </div>
  );
}
