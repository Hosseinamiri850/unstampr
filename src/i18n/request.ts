import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './config';
import type { Locale } from '@/i18n/config';

export default getRequestConfig(async ({ requestLocale }) => {
  let requested = (await requestLocale) as Locale;
  if (!requested || !locales.includes(requested as never)) {
    requested = defaultLocale;
  }

  return {
    locale: requested,
    messages: (await import(`../../messages/${requested}.json`)).default,
  };
});
