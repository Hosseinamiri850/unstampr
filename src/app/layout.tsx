import type { ReactNode } from 'react';
import './globals.css';
import { OG_IMAGE } from '@/lib/seo';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://unstampr.com';
const description = 'Remove AI watermarks from images and videos — fast, automatic, free.';

export const metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Unstampr | AI Watermark Removal',
    template: '%s | Unstampr',
  },
  description,
  applicationName: 'Unstampr',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Unstampr',
  },
  formatDetection: { telephone: false },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Unstampr',
    title: 'Unstampr | AI Watermark Removal',
    description,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unstampr',
    description: 'AI watermark removal',
    images: [OG_IMAGE],
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#103A2C' },
    { media: '(prefers-color-scheme: light)', color: '#F8F7F2' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
