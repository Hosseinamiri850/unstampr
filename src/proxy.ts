import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing, locales, defaultLocale, type Locale } from './i18n/routing';

const handleI18n = createMiddleware(routing);

/**
 * Country → locale map for first-visit language detection. Extend this as new
 * locales are wired (see docs/ROADMAP.md). Countries not listed fall back to
 * next-intl's own negotiation (cookie → Accept-Language → default locale).
 */
const countryToLocale: Record<string, Locale> = {
  IR: 'fa',
  AF: 'fa',
  TJ: 'fa',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  UY: 'es',
  VE: 'es',
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
  SG: 'zh',
  IN: 'hi',
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
