import type { Metadata, Viewport } from 'next';
import { config } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = {
  title: `JRichForms XR — ${config.piece.title}`,
  description: `${config.piece.gateTitle}: scan the marker, see the finished piece, tap to morph to the raw stone.`,
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
