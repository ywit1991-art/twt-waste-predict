import type { Metadata, Viewport } from 'next';
import './globals.css';
import Protection from '@/components/Protection';
import AppChrome from '@/components/AppChrome';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'เทศบาลตำบลท่าวังทอง',
  description:
    'สถิติการจัดเก็บขยะเพื่อพยากรณ์ปริมาณขยะทั้งปี',
  applicationName: 'TWT Waste',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TWT Waste'
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: ['/icon-192.png']
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'TWT Waste',
    'msapplication-TileColor': '#047857',
    'msapplication-tap-highlight': 'no'
  }
};

export const viewport: Viewport = {
  themeColor: '#047857',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
  viewportFit: 'cover'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TWT Waste" />
      </head>
      <body className="font-sans antialiased">
        <Protection />
        <ServiceWorkerRegister />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}