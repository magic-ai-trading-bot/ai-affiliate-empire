import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';
import { Footer } from '@/components/footer';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AI Affiliate Empire - Dashboard',
  description: 'Autonomous AI-powered affiliate marketing system - Production-grade analytics and control center',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <CookieConsentBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
