import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Usage Analytics | RobotScraping.com',
  description:
    'Monitor your web scraping API usage, including requests, tokens, cache hits, and latency metrics. Export CSV data for compliance.',
  alternates: {
    canonical: 'https://robotscraping.com/usage',
  },
  openGraph: {
    title: 'Usage Analytics | RobotScraping.com',
    description:
      'Monitor your web scraping API usage, including requests, tokens, cache hits, and latency metrics.',
    url: 'https://robotscraping.com/usage',
    siteName: 'RobotScraping.com',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function UsageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
