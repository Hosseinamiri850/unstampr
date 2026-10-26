import createMiddleware from 'next-intl/middleware';
import { routing, locales, type Locale } from './i18n/routing';

const countryToLocale: Record<string, Locale> = {
  IR: 'fa',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
  SG: 'zh',
  IN: 'hi',
};

function geoLocale(request: Parameters<ReturnType<typeof createMiddleware>>[0]): Locale | undefined {
  const country =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry') ??
    request.headers.get('x-geo-country');
  if (!country) return undefined;
  return countryToLocale[country.toUpperCase()];
}

export default function proxy(request: Parameters<ReturnType<typeof createMiddleware>>[0]) {
  const handleI18n = createMiddleware(routing);
  const response = handleI18n(request);
  // Surface the geo-derived locale for next-intl's request config: only when
  // the request has no explicit NEXT_LOCALE cookie (middleware already honored
  // it) and the country maps to a supported locale. Never overrides a matched
  // /{locale}/ path.
  const pathname = request.nextUrl.pathname;
  const pathIsLocaleRooted = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  const hasCookie = Boolean(request.cookies.get('NEXT_LOCALE'));
  const geo = geoLocale(request);
  if (!pathIsLocaleRooted && !hasCookie && geo) {
    response.headers.set('x-next-intl-locale', geo);
  }
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
