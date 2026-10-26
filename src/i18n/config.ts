export type Locale =
  | 'en'
  | 'fa'
  | 'es'
  | 'zh'
  | 'hi'
  | 'ar'
  | 'pt-BR'
  | 'ru'
  | 'fr'
  | 'de'
  | 'ja';

export const locales: Locale[] = ['en', 'fa', 'es', 'zh', 'hi', 'ar', 'pt-BR', 'ru', 'fr', 'de', 'ja'];
export const defaultLocale: Locale = 'en';

/** Native labels for the language switcher (never translated). */
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  fa: 'فارسی',
  es: 'Español',
  zh: '中文',
  hi: 'हिन्दी',
  ar: 'العربية',
  'pt-BR': 'Português (BR)',
  ru: 'Русский',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
};

/** Right-to-left locales — drives `dir` and the Arabic-script font stack. */
export const rtlLocales: Locale[] = ['fa', 'ar'];

export function dir(locale: string): 'rtl' | 'ltr' {
  return rtlLocales.includes(locale as Locale) ? 'rtl' : 'ltr';
}

/** Locales rendered with the IRANYekanX (Arabic-script) font stack. */
export function usesArabicScript(locale: string): boolean {
  return locale === 'fa' || locale === 'ar';
}
