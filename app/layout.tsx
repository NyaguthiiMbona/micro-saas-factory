
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Micro-SaaS Factory | Free Online Tools',
  description:
    'Simple, free online utilities for formatting and processing data.',
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
