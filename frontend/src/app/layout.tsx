import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Nepal SSB Secondary School ERP | श्री नेपाल मा.वि. विश्रामपुर',
  description: 'Shree Nepal Secondary School Bishrampur Rautahat Mobile & Web ERP System',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/school_logo.png', sizes: 'any', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/school_logo.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ne" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
