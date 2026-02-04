import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CV Chat Analytics',
  description: 'Analytics dashboard for aging-coder chat and fit assessment',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
