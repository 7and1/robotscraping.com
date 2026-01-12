import './globals.css';
import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import { StructuredData } from './structured-data';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL('https://robotscraping.com'),
  title: {
    default: 'RobotScraping.com — AI Web Scraping API | Automated Data Extraction',
    template: '%s | RobotScraping.com',
  },
  description:
    'Turn any website into a JSON API with AI-powered web scraping. Uses Cloudflare Browser Rendering and LLMs (GPT-4o-mini, Claude Haiku) for automated data extraction. No CSS selectors required.',
  keywords: [
    'AI web scraping',
    'automated data extraction',
    'web scraping API',
    'Cloudflare Workers scraping',
    'JSON scraping API',
    'browser rendering scraper',
    'LLM web scraping',
    'GPT scraping',
    'Claude web scraping',
    'no-code scraper',
    'scheduled scraping',
    'webhook scraper',
  ],
  authors: [{ name: 'RobotScraping.com' }],
  creator: 'RobotScraping.com',
  publisher: 'RobotScraping.com',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'RobotScraping.com — AI Web Scraping API',
    description:
      'Turn any website into a JSON API with serverless browser rendering and AI extraction. Extract structured data from any page in seconds.',
    url: 'https://robotscraping.com',
    siteName: 'RobotScraping.com',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'RobotScraping.com - AI Web Scraping API',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RobotScraping.com — AI Web Scraping API',
    description: 'Extract structured data from any website using AI. No CSS selectors, just JSON.',
    images: ['/opengraph-image'],
    creator: '@robotscraping',
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
  ...(googleVerification
    ? {
        verification: {
          google: googleVerification,
        },
      }
    : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="theme-color" content="#0A0A0E" />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} bg-ink text-white antialiased`}
      >
        <StructuredData />
        {children}
      </body>
    </html>
  );
}
