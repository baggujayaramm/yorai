import type { Metadata } from 'next';
import './globals.css';
import { AppFooter } from '@/components/AppFooter';
import { AppHeader } from '@/components/AppHeader';
import { YoraiBackground } from '@/components/YoraiBackground';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import { BetaAnnouncementBar } from '@/components/BetaAnnouncementBar';

export const metadata: Metadata = {
  title: 'Yorai',
  description: 'A student experience connection platform for lived insight, practical guidance, and cross-college collaboration.',
};

const themeScript = `
try {
  var theme = window.localStorage.getItem('yorai-theme');
  var dark = theme === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
} catch (_) {}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <YoraiBackground />
        <AppHeader />
        <BetaAnnouncementBar />
        <AnalyticsTracker />
        <div id="main-content" tabIndex={-1}>{children}</div>
        <AppFooter />
      </body>
    </html>
  );
}
