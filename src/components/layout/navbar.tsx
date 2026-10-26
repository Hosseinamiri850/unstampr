'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Logo } from './logo';
import { LanguageSwitcher } from './language-switcher';
import { cn } from '@/lib/utils';
import { easeOutSoft } from '@/components/motion/motion-primitives';

const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

const NAV = [
  { key: 'remove', href: '/remove' },
  ...(paymentsEnabled ? [{ key: 'pricing' as const, href: '/pricing' }] : []),
  { key: 'faq', href: '/faq' },
] as const;

export function Navbar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const reduce = useReducedMotion();

  // Tighten the header once the page has scrolled a little.
  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b backdrop-blur transition-[background-color,border-color,box-shadow] duration-300',
        lifted
          ? 'border-border/70 bg-background/85 shadow-soft supports-[backdrop-filter]:bg-background/70'
          : 'border-transparent bg-background/60',
      )}
    >
      <nav className="container flex h-16 items-center justify-between gap-2">
        <Link
          href="/"
          className="group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Unstampr"
        >
          <Logo className="transition-transform duration-300 group-hover:-translate-y-0.5" />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-accent"
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                {t(item.key)}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t('login')}</Link>
          </Button>
          <Button asChild size="sm" className="shadow-soft transition-transform duration-200 hover:-translate-y-0.5">
            <Link href="/remove">{t('startFree')}</Link>
          </Button>
          <LanguageSwitcher />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={open ? 'close' : 'open'}
                initial={reduce ? false : { rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18, ease: easeOutSoft }}
                className="flex"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="mobile-nav"
            key="mobile-nav"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: easeOutSoft }}
            className="overflow-hidden border-t border-border/70 bg-background md:hidden"
          >
            <div className="container flex flex-col gap-1 py-4">
              {NAV.map((item, i) => (
                <motion.div
                  key={item.key}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: reduce ? 0 : 0.04 * i, ease: easeOutSoft }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {t(item.key)}
                  </Link>
                </motion.div>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                <Button asChild variant="outline">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    {t('login')}
                  </Link>
                </Button>
                <Button asChild onClick={() => setOpen(false)}>
                  <Link href="/remove">{t('startFree')}</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
