import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { brandFontVariables } from '@/lib/brand-fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'AR experience',
  description: 'Scan the marker beside the sculpture to see it in augmented reality.',
  // Declared here (not app/favicon.ico) so artist pages can replace it.
  icons: { icon: '/favicon.ico' },
  other: {
    // Binary engine attribution (also surfaced in the AR UI).
    'xr-engine':
      'This product includes the XR Engine software developed by Niantic Spatial, Inc. Copyright © 2026 Niantic Spatial, Inc.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={brandFontVariables}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        />
      </head>
      <body>
        <ClerkProvider
          afterSignOutUrl="/admin/sign-in"
          signInUrl="/admin/sign-in"
          signUpUrl="/admin/sign-up"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
