import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout';
import FooterPremium from '@/components/layout/FooterPremium';
import { Providers } from './providers';
import { ToastProvider } from '@/components/ui';
import { CookieBanner } from '@/components/CookieBanner';
import AnalyticsManager from '@/components/analytics/AnalyticsManager';
import JsonLd from '@/components/seo/JsonLd';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.robohatch.in';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'RoboHatch',
  url: siteUrl,
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'founder@robohatch.in',
    telephone: '+91 95055 51727',
    areaServed: 'IN',
    availableLanguage: ['en', 'hi'],
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Urbanrise Revolution 1, C-Block 726, Padur',
    addressLocality: 'Chennai',
    addressRegion: 'Tamil Nadu',
    postalCode: '603103',
    addressCountry: 'IN',
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'RoboHatch | Premium 3D Printing in India',
    template: '%s | RoboHatch',
  },
  description:
    'Premium 3D printing in India for creators, startups, and custom manufacturing. Upload designs, shop premium prints, and pay securely with Razorpay.',
  keywords:
    ['3D printing India', 'custom manufacturing', 'rapid prototyping', 'creator economy', 'RoboHatch'],
  authors: [{ name: 'Robohatch' }],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'RoboHatch | Premium 3D Printing in India',
    description: 'Transform your designs into premium custom products with engineer-reviewed 3D printing.',
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: 'RoboHatch',
    images: [
      {
        url: '/images/hero-3d-bench.svg',
        width: 1200,
        height: 800,
        alt: 'RoboHatch premium 3D printing hero visual',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RoboHatch | Premium 3D Printing in India',
    description: 'Engineer-reviewed custom 3D printing for creators and businesses.',
    images: ['/images/hero-3d-bench.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta name="theme-color" content="#F97316" />
      </head>
      <body className={inter.className}>
        <Providers>
          <ToastProvider>
            <JsonLd data={organizationSchema} />
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1">{children}</main>
              <FooterPremium />
            </div>
            <AnalyticsManager />
            <CookieBanner />
          </ToastProvider>
        </Providers>
      </body>
    </html>
  )
}
