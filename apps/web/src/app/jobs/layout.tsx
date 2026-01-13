import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Job Monitor | RobotScraping.com',
  description:
    'Monitor your asynchronous web scraping jobs. View job status, results, token usage, and latency for all your extraction tasks.',
  alternates: {
    canonical: 'https://robotscraping.com/jobs',
  },
  openGraph: {
    title: 'Job Monitor | RobotScraping.com',
    description:
      'Monitor your asynchronous web scraping jobs. View job status, results, token usage, and latency.',
    url: 'https://robotscraping.com/jobs',
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

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
