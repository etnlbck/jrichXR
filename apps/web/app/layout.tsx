import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleTagManager } from '@next/third-parties/google';
import { brandFontVariables } from '@/lib/brand-fonts';
import { THEME_INIT_SCRIPT } from '@/components/ThemeToggle';
import { getSiteUrl } from '@/lib/site-url';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'TagXR',
    template: '%s — TagXR',
  },
  description:
    'Scan a marker, see the finished piece, tap to morph to the raw stone. No app install.',
  // Declared here (not app/favicon.ico) so artist pages can replace it.
  icons: {
    icon: [
      { url: '/brand/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/brand/apple-touch-icon.png',
  },
  other: {
    // Binary engine attribution (also surfaced in the AR UI).
    'xr-engine':
      'This product includes the XR Engine software developed by Niantic Spatial, Inc. Copyright © 2026 Niantic Spatial, Inc.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="en" className={brandFontVariables} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        />
      </head>
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
      <body>
        <ClerkProvider
          afterSignOutUrl="/admin/sign-in"
          signInUrl="/admin/sign-in"
          signUpUrl="/admin/sign-up"
        >
          {children}
        </ClerkProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
