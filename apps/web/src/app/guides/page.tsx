import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Web Scraping Guides & Tutorials | RobotScraping.com',
  description:
    'Learn web scraping with our comprehensive guides. Discover AI-powered data extraction, Cloudflare Workers scraping, ecommerce monitoring, news aggregation, and more.',
  alternates: {
    canonical: 'https://robotscraping.com/guides',
  },
  openGraph: {
    title: 'Web Scraping Guides & Tutorials | RobotScraping.com',
    description:
      'Learn web scraping with our comprehensive guides. Discover AI-powered data extraction, Cloudflare Workers scraping, ecommerce monitoring, news aggregation, and more.',
    url: 'https://robotscraping.com/guides',
    siteName: 'RobotScraping.com',
    type: 'website',
  },
};

const guides = [
  {
    slug: 'web-scraping-for-developers',
    title: 'Web Scraping for Developers: The Complete Guide',
    description:
      'Master web scraping fundamentals, techniques, and best practices. Learn how to extract data from any website using modern tools and AI-powered extraction.',
    category: 'Fundamentals',
    readTime: '15 min',
  },
  {
    slug: 'ai-data-extraction',
    title: 'AI-Powered Data Extraction: Transform Your Scraping Workflow',
    description:
      'Discover how artificial intelligence revolutionizes web scraping. Extract structured data from any website without brittle CSS selectors or complex parsing logic.',
    category: 'Advanced',
    readTime: '12 min',
  },
  {
    slug: 'cloudflare-workers-scraping',
    title: 'Cloudflare Workers for Web Scraping: A Developer Guide',
    description:
      'Build scalable web scrapers using Cloudflare Workers. Learn serverless scraping techniques, browser rendering, and edge computing for data extraction.',
    category: 'Infrastructure',
    readTime: '18 min',
  },
  {
    slug: 'ecommerce-price-monitoring',
    title: 'Ecommerce Price Monitoring: Build Your Own Price Tracker',
    description:
      'Track competitor prices, monitor product availability, and get alerts on price changes. Learn how to build automated price monitoring systems.',
    category: 'Use Cases',
    readTime: '14 min',
  },
  {
    slug: 'news-aggregation',
    title: 'Building a News Aggregator: Web Scraping Tutorial',
    description:
      'Create automated news aggregation systems. Extract articles, headlines, and metadata from multiple news sources with AI-powered scraping.',
    category: 'Use Cases',
    readTime: '16 min',
  },
];

export default function GuidesPage() {
  return (
    <main id="main-content" className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-neon">Guides & Tutorials</p>
          <h1 className="mt-4 text-4xl font-semibold">Web Scraping Guides</h1>
          <p className="mt-4 text-sm text-white/70 max-w-2xl mx-auto">
            Master the art of web scraping with our comprehensive tutorials. From fundamentals to
            advanced AI-powered extraction techniques.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}` as any}
              className="glass rounded-2xl p-6 transition hover:border-neon/50 hover:shadow-lg hover:shadow-neon/10 group"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs uppercase tracking-wider text-neon/80">
                  {guide.category}
                </span>
                <span className="text-xs text-white/50">{guide.readTime} read</span>
              </div>
              <h2 className="text-lg font-semibold group-hover:text-neon transition-colors">
                {guide.title}
              </h2>
              <p className="mt-2 text-sm text-white/60">{guide.description}</p>
            </Link>
          ))}
        </section>

        <section className="glass rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold">Ready to Start Scraping?</h2>
          <p className="mt-3 text-sm text-white/60">
            Get your API key and start extracting data from any website in minutes.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl border border-neon/50 bg-neon/10 px-8 py-3 text-sm uppercase tracking-wider text-neon transition hover:bg-neon/20 focus:outline-none focus:ring-2 focus:ring-neon/50"
          >
            Get Started Free
          </Link>
        </section>

        <footer className="flex flex-wrap justify-between gap-4 text-xs text-white/50 border-t border-white/10 pt-6">
          <Link href="/" className="transition hover:text-neon">
            Back to Home
          </Link>
          <Link href="/docs" className="transition hover:text-neon">
            API Documentation
          </Link>
        </footer>
      </div>
    </main>
  );
}
