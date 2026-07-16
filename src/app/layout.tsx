import type { Metadata } from 'next';
import '@/styles/globals.css';
import Providers from './providers';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import LenisProvider from '@/components/layout/lenis-provider';


export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Erciyes Kampüs — Makale & Forum Platformu',
    template: '%s | Erciyes Kampüs',
  },
  description:
    'Erciyes Üniversitesi öğrencileri için profesyonel makale okuma ve kampüs tartışma platformu.',
  keywords: ['Erciyes Üniversitesi', 'kampüs', 'makale', 'forum', 'öğrenci', 'blog', 'yazarlar'],
  authors: [{ name: 'Erciyes Kampüs Ekibi' }],
  icons: {
    icon: '/logo_flat.svg',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'Erciyes Kampüs',
    title: 'Erciyes Kampüs — Makale & Forum Platformu',
    description: 'Erciyes Üniversitesi öğrencileri için profesyonel makale okuma ve kampüs tartışma platformu.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@erciyeskampus',
    title: 'Erciyes Kampüs — Makale & Forum Platformu',
    description: 'Erciyes Üniversitesi öğrencileri için profesyonel makale okuma ve kampüs tartışma platformu.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erciyeskampus.com';
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Erciyes Kampüs",
      "url": appUrl,
      "logo": `${appUrl}/logo.png`,
      "sameAs": [
        "https://twitter.com/erciyeskampus"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Erciyes Kampüs",
      "alternateName": "Zirve Kampüs",
      "url": appUrl,
      "logo": `${appUrl}/logo.png`
    }
  ];

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Inter:wght@300;400;500;600;700;800&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <LenisProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </LenisProvider>
        </Providers>
      </body>
    </html>
  );
}
