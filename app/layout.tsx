import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Gleva Refund Desk V2 — Live Refund Management & Analytics System',
  description: 'Live two-way Google Sheets & Drive refund operations dashboard for Gleva Cosmetics (2026–2027).'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#FAF8F5] text-[#0F1E36]">{children}</body>
    </html>
  );
}
