import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Maps an app locale to a full BCP-47 tag for Intl APIs. Region matters for
 * number/date formatting, so bare language codes get an explicit region.
 */
const INTL_LOCALE: Record<string, string> = {
  en: 'en-US',
  fa: 'fa-IR',
  es: 'es-ES',
  zh: 'zh-CN',
  hi: 'hi-IN',
  ar: 'ar-EG',
  ru: 'ru-RU',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
};

function intl(locale: string): string {
  return INTL_LOCALE[locale] ?? locale;
}

export function formatBytes(bytes: number, locale = 'fa') {
  if (bytes === 0) return `0 B`;
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  const formatted = value.toLocaleString(intl(locale), {
    maximumFractionDigits: 1,
  });
  return `${formatted} ${sizes[i]}`;
}

export function formatNumber(n: number, locale = 'fa') {
  return n.toLocaleString(intl(locale));
}

export function formatDate(date: Date | string | number, locale = 'fa') {
  const d = typeof date === 'object' ? date : new Date(date);
  return d.toLocaleString(intl(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(seconds: number, locale = 'fa') {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  const mm = locale === 'fa' ? m.toLocaleString('fa-IR') : m.toString().padStart(2, '0');
  const ss = locale === 'fa' ? r.toLocaleString('fa-IR') : r.toString().padStart(2, '0');
  return `${mm}:${ss}`;
}
