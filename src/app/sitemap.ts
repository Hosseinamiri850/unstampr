import type { MetadataRoute } from 'next';
import { getEnv } from '@/lib/env';
import { locales } from '@/i18n/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getEnv().APP_URL;
  const routes = ['', '/remove', '/faq', '/support', '/login', '/register', '/privacy', '/terms'];
  if (getEnv().PAYMENTS_ENABLED) routes.push('/pricing');
  const now = new Date();
  return locales.flatMap((locale) =>
    routes.map((route) => ({
      url: `${base}/${locale}${route}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${route}`])),
      },
    })),
  );
}
