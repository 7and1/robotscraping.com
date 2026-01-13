import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Schedule Engine | RobotScraping.com',
  description:
    'Create and manage recurring web scraping schedules with cron expressions. Automate your data extraction with scheduled jobs and webhooks.',
  alternates: {
    canonical: 'https://robotscraping.com/schedules',
  },
  openGraph: {
    title: 'Schedule Engine | RobotScraping.com',
    description:
      'Create and manage recurring web scraping schedules with cron expressions. Automate your data extraction with scheduled jobs.',
    url: 'https://robotscraping.com/schedules',
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

export default function SchedulesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
