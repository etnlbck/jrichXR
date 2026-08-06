import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JRichForms XR — Untitled No. 7',
  description:
    'Web AR for a black-obsidian sculpture: scan the marker, see the finished piece, tap to morph to the raw stone.',
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
