import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from '@/i18n/config';

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

export default async function RootPage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined;
  if (cookieLocale && locales.includes(cookieLocale)) {
    redirect(`/${cookieLocale}`);
  }

  const headerList = await headers();
  const geoLocale =
    countryToLocale[
      (headerList.get('x-vercel-ip-country') ??
        headerList.get('cf-ipcountry') ??
        headerList.get('x-geo-country') ??
        '').toUpperCase()
    ];
  redirect(`/${geoLocale ?? defaultLocale}`);
}
