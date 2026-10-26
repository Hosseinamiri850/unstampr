import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing, locales, defaultLocale, type Locale } from './i18n/routing';

const handleI18n = createMiddleware(routing);

/**
 * Country → locale map for first-visit language detection. Countries not listed
 * fall back to next-intl's own negotiation (cookie → Accept-Language → default).
 * Keep this list in sync with `locales` in src/i18n/config.ts.
 */
const countryToLocale: Record<string, Locale> = {
  // Persian
  IR: 'fa',
  AF: 'fa',
  TJ: 'fa',
  // Arabic
  SA: 'ar',
  AE: 'ar',
  EG: 'ar',
  DZ: 'ar',
  MA: 'ar',
  TN: 'ar',
  IQ: 'ar',
  JO: 'ar',
  KW: 'ar',
  QA: 'ar',
  BH: 'ar',
  OM: 'ar',
  LY: 'ar',
  SD: 'ar',
  YE: 'ar',
  LB: 'ar',
  SY: 'ar',
  PS: 'ar',
  // Spanish
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  UY: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  // Portuguese (pt-BR is the only Portuguese catalog)
  BR: 'pt-BR',
  PT: 'pt-BR',
  AO: 'pt-BR',
  MZ: 'pt-BR',
  CV: 'pt-BR',
  // Chinese
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
  MO: 'zh',
  SG: 'zh',
  // Hindi
  IN: 'hi',
  // Russian
  RU: 'ru',
  BY: 'ru',
  KZ: 'ru',
  KG: 'ru',
  MD: 'ru',
  // French
  FR: 'fr',
  BE: 'fr',
  CA: 'fr',
  LU: 'fr',
  MC: 'fr',
  SN: 'fr',
  CI: 'fr',
  CM: 'fr',
  BF: 'fr',
  ML: 'fr',
  NE: 'fr',
  TG: 'fr',
  BJ: 'fr',
  GA: 'fr',
  CD: 'fr',
  MG: 'fr',
  HT: 'fr',
  // German (CH is multilingual; German is the largest group, switcher covers the rest)
  DE: 'de',
  AT: 'de',
  CH: 'de',
  LI: 'de',
  // Japanese
  JP: 'ja',
};

/** Reads the visitor country from whichever edge/CDN header is present. */
function geoLocale(request: NextRequest): Locale | undefined {
  const country =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry') ??
    request.headers.get('x-geo-country');
  if (!country) return undefined;
  return countryToLocale[country.toUpperCase()];
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathIsLocaleRooted = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  const hasCookie = Boolean(request.cookies.get('NEXT_LOCALE'));

  // Geo wins only on a first visit: an explicit /{locale}/ path or a language
  // the visitor already picked (NEXT_LOCALE cookie) is never overridden.
  if (!pathIsLocaleRooted && !hasCookie) {
    const geo = geoLocale(request);
    if (geo && geo !== defaultLocale) {
      const url = request.nextUrl.clone();
      url.pathname = `/${geo}${pathname === '/' ? '' : pathname}`;
      return NextResponse.redirect(url);
    }
  }

  return handleI18n(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
