import React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gleva Refund Desk V3 — Premium 3D Refund Operations & Financial Intelligence',
  description:
    'Secure, mobile-first 3D SaaS refund management and live Google Sheets analytics platform for Gleva Cosmetics (2026–2027).'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF8F0' },
    { media: '(prefers-color-scheme: dark)', color: '#171717' }
  ]
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-[#FFF8F0] dark:bg-[#171717] text-[#171717] dark:text-[#FFF8F0] selection:bg-[#881337] selection:text-white">
        {children}
      </body>
    </html>
  );
}
