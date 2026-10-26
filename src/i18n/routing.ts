import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export { locales, defaultLocale };
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
