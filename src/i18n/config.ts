export type Locale =
  | 'en'
  | 'fa'
  | 'es'
  | 'zh'
  | 'hi';

export const locales: Locale[] = ['en', 'fa', 'es', 'zh', 'hi'];
export const defaultLocale: Locale = 'en';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  fa: 'فارسی',
  es: 'Español',
  zh: '中文',
  hi: 'हिन्दी',
};

export const rtlLocales: Locale[] = ['fa'];

export function dir(locale: string): 'rtl' | 'ltr' {
  return rtlLocales.includes(locale as Locale) ? 'rtl' : 'ltr';
}
