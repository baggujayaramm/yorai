import type { Metadata } from 'next';
import './globals.css';
import { AppFooter } from '@/components/AppFooter';
import { AppHeader } from '@/components/AppHeader';
import { YoraiBackground } from '@/components/YoraiBackground';

export const metadata: Metadata = {
  title: 'Yorai',
  description: 'A student experience connection platform for lived insight, practical guidance, and cross-college collaboration.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <YoraiBackground />
        <AppHeader />
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
