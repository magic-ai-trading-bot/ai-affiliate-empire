import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PerformanceMonitor } from './performance-monitor';
import { ServiceWorkerRegistration } from './sw-registration';
import { generateSiteMetadata, generateOrganizationSchema, generateWebsiteSchema } from '@/lib/seo';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
  weight: ['400', '700', '900'],
  preload: true,
  fallback: ['Georgia', 'serif'],
});

export const metadata: Metadata = generateSiteMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebsiteSchema();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PerformanceMonitor />
          <ServiceWorkerRegistration />
          <div className="flex flex-col min-h-screen">
            {/* Header */}
            <Header />

            {/* Main content area */}
            <main className="flex-grow">
              {children}
            </main>

            {/* Footer */}
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
