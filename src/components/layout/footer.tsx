import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Logo } from './logo';
import { DonationLinks } from './donation-links';

const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-secondary rounded-sm"
    >
      <span>{children}</span>
      <span
        aria-hidden
        className="translate-y-px text-[0.7em] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 rtl:group-hover:-translate-x-0.5"
      >
        ↗
      </span>
    </Link>
  );
}

export function Footer() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');
  const legal = useTranslations('legal');
  const donate = useTranslations('donate');
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-border/70 bg-secondary">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-dots opacity-40 [mask-image:radial-gradient(70%_100%_at_50%_0%,black,transparent)]"
      />
      <div className="container relative py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('madeFor')}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary/80">{t('product')}</span>
              <FooterLink href="/remove">{nav('remove')}</FooterLink>
              {paymentsEnabled && <FooterLink href="/pricing">{nav('pricing')}</FooterLink>}
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary/80">{t('resources')}</span>
              <FooterLink href="/faq">{nav('faq')}</FooterLink>
              <FooterLink href="/support">{donate('title')}</FooterLink>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary/80">{t('legal')}</span>
              <FooterLink href="/privacy">{legal('privacy')}</FooterLink>
              <FooterLink href="/terms">{legal('terms')}</FooterLink>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/80 pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {year} Unstampr</span>
          <DonationLinks compact />
          <span>{t('rights')}</span>
        </div>
      </div>
    </footer>
  );
}
