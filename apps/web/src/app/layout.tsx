import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header, Footer } from '@/components/layout';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Robohatch - Premium 3D Printed Products',
  description:
    'Discover unique 3D printed keychains, figurines, anime figures, home décor, lamps, and custom designs. Premium quality, modern designs, and fast delivery.',
  keywords:
    '3D printing, custom keychains, figurines, anime figures, home decor, lamps, personalized gifts',
  authors: [{ name: 'Robohatch' }],
  openGraph: {
    title: 'Robohatch - Premium 3D Printed Products',
    description: 'Transform your imagination into reality with premium 3D printed products',
    type: 'website',
    locale: 'en_IN',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
