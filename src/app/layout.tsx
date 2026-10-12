import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  metadataBase: new URL('https://unstampr.com'),
  title: {
    default: 'Unstampr | AI Watermark Removal',
    template: '%s | Unstampr',
  },
  description: 'Remove AI watermarks from images and videos — fast, automatic, free.',
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
    description: 'Remove AI watermarks from images and videos — fast, automatic, free.',
  },
  twitter: { card: 'summary_large_image', title: 'Unstampr', description: 'AI watermark removal' },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
