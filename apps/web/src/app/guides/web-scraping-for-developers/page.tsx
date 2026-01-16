import Link from 'next/link';
import type { Metadata } from 'next';
import { CodeBlock } from '../../../components/ui/code-block';

export const metadata: Metadata = {
  title: 'Web Scraping for Developers: The Complete Guide | RobotScraping.com',
  description:
    'Master web scraping fundamentals, techniques, and best practices. Learn how to extract data from any website using modern tools and AI-powered extraction. Complete developer guide with code examples.',
  alternates: {
    canonical: 'https://robotscraping.com/guides/web-scraping-for-developers',
  },
  openGraph: {
    title: 'Web Scraping for Developers: The Complete Guide',
    description:
      'Master web scraping fundamentals, techniques, and best practices. Learn how to extract data from any website using modern tools and AI-powered extraction.',
    url: 'https://robotscraping.com/guides/web-scraping-for-developers',
    siteName: 'RobotScraping.com',
    type: 'article',
    publishedTime: '2025-01-15',
    authors: ['RobotScraping.com'],
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Web Scraping for Developers: The Complete Guide',
  description:
    'Master web scraping fundamentals, techniques, and best practices. Learn how to extract data from any website using modern tools and AI-powered extraction.',
  author: {
    '@type': 'Organization',
    name: 'RobotScraping.com',
    url: 'https://robotscraping.com',
  },
  publisher: {
    '@type': 'Organization',
    name: 'RobotScraping.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://robotscraping.com/icon.png',
    },
  },
  datePublished: '2025-01-15',
  dateModified: '2025-01-15',
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://robotscraping.com/guides/web-scraping-for-developers',
  },
  inLanguage: 'en-US',
  keywords: [
    'web scraping',
    'data extraction',
    'web scraping tutorial',
    'python scraping',
    'javascript scraping',
    'web scraping best practices',
    'ethical scraping',
    'robots.txt',
  ],
  articleSection: [
    'Introduction',
    'What is Web Scraping',
    'Use Cases',
    'Legal Considerations',
    'Traditional Scraping Methods',
    'AI-Powered Scraping',
    'Best Practices',
    'Getting Started',
  ],
};

export default function WebScrapingForDevelopersPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <main
        id="main-content"
        className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white"
      >
        <article className="mx-auto flex max-w-4xl flex-col gap-10">
          <header>
            <Link
              href="/guides"
              className="text-xs uppercase tracking-[0.25em] text-neon transition hover:text-neon/80"
            >
              Back to Guides
            </Link>
            <p className="mt-4 text-xs uppercase tracking-[0.35em] text-white/50">Fundamentals</p>
            <h1 className="mt-3 text-4xl font-semibold">
              Web Scraping for Developers: The Complete Guide
            </h1>
            <p className="mt-4 text-lg text-white/70">
              Master the fundamentals of web scraping, from basic techniques to advanced AI-powered
              extraction. Learn best practices, ethical considerations, and practical implementation
              strategies.
            </p>
            <div className="mt-6 flex items-center gap-4 text-xs text-white/50">
              <span>15 min read</span>
              <span>Updated January 15, 2025</span>
            </div>
          </header>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">What is Web Scraping?</h2>
            <p className="mt-3 text-sm text-white/70">
              Web scraping is the automated process of extracting data from websites. Unlike manual
              copy-pasting, web scraping uses software to fetch web pages, parse their content, and
              extract structured information at scale. This technique powers countless applications:
              price comparison tools, lead generation systems, market research platforms, and AI
              training datasets.
            </p>
            <p className="mt-3 text-sm text-white/70">
              Modern web scraping has evolved significantly. What once required fragile CSS
              selectors and constant maintenance can now be accomplished using AI-powered extraction
              that understands page structure and context, making your scrapers more resilient to
              layout changes.
            </p>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Common Web Scraping Use Cases</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-semibold text-neon">Ecommerce Intelligence</h3>
                <p className="mt-2 text-xs text-white/60">
                  Monitor competitor prices, track product availability, analyze customer reviews,
                  and gather market intelligence.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-semibold text-neon">Lead Generation</h3>
                <p className="mt-2 text-xs text-white/60">
                  Extract contact information from business directories, professional networks, and
                  company websites for sales outreach.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-semibold text-neon">News & Content Aggregation</h3>
                <p className="mt-2 text-xs text-white/60">
                  Build news aggregators, content curators, and sentiment analysis tools by scraping
                  articles and headlines.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-semibold text-neon">Market Research</h3>
                <p className="mt-2 text-xs text-white/60">
                  Analyze trends, monitor brand mentions, collect social media data, and gather
                  competitive intelligence.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-semibold text-neon">Real Estate</h3>
                <p className="mt-2 text-xs text-white/60">
                  Track property listings, monitor rental prices, and analyze housing market trends
                  across multiple platforms.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-semibold text-neon">Job Market Analysis</h3>
                <p className="mt-2 text-xs text-white/60">
                  Aggregate job postings, analyze salary trends, and monitor demand for specific
                  skills across job boards.
                </p>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Legal and Ethical Considerations</h2>
            <p className="mt-3 text-sm text-white/70">
              Before building any scraper, understand the legal landscape. Web scraping publicly
              available data is generally legal in most jurisdictions, but important considerations
              apply:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Respect robots.txt:</strong> Check the target
                  site's robots.txt file to see which pages they allow bots to access.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Terms of Service:</strong> Review the site's ToS.
                  Some websites explicitly prohibit scraping in their terms.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Public Data Only:</strong> Only scrape publicly
                  accessible information. Never attempt to access data behind authentication without
                  authorization.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Rate Limiting:</strong> Implement appropriate
                  delays between requests to avoid overwhelming servers.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">GDPR and CCPA:</strong> When handling personal
                  data, ensure compliance with privacy regulations.
                </span>
              </li>
            </ul>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Traditional Web Scraping Approaches</h2>
            <p className="mt-3 text-sm text-white/70">
              Traditional scraping methods rely on parsing HTML structure using CSS selectors or
              XPath expressions. While these approaches work, they have significant limitations.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-semibold">BeautifulSoup (Python)</h3>
                <p className="mt-2 text-xs text-white/60">
                  A popular library for parsing HTML documents. Creates a parse tree from page
                  source that can be used to extract data easily.
                </p>
                <div className="mt-3">
                  <CodeBlock language="python">{`from bs4 import BeautifulSoup
import requests

url = "https://example.com/products"
response = requests.get(url)
soup = BeautifulSoup(response.content, 'html.parser')

# Extract using CSS selectors
products = []
for item in soup.select('.product-card'):
    products.append({
        'title': item.select_one('.title').text,
        'price': item.select_one('.price').text,
    })`}</CodeBlock>
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Puppeteer (JavaScript)</h3>
                <p className="mt-2 text-xs text-white/60">
                  A Node.js library that provides a high-level API to control Chrome or Chromium.
                  Perfect for JavaScript-heavy sites that require browser automation.
                </p>
                <div className="mt-3">
                  <CodeBlock language="javascript">{`import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com/products');

// Wait for content to load
await page.waitForSelector('.product-card');

const products = await page.evaluate(() => {
  const items = document.querySelectorAll('.product-card');
  return Array.from(items).map(item => ({
    title: item.querySelector('.title').textContent,
    price: item.querySelector('.price').textContent,
  }));
});

await browser.close();`}</CodeBlock>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <h4 className="font-semibold text-amber-400">The Problem with CSS Selectors</h4>
              <p className="mt-2 text-xs text-white/70">
                CSS selectors are fragile. When websites update their design or restructuring their
                HTML, your selectors break. This creates ongoing maintenance overhead and unreliable
                data collection.
              </p>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">AI-Powered Web Scraping</h2>
            <p className="mt-3 text-sm text-white/70">
              The next generation of web scraping uses large language models to understand page
              content and extract data based on semantic meaning rather than rigid selectors. This
              approach offers several advantages:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Layout Agnostic:</strong> Works regardless of HTML
                  structure or CSS class names
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Context Awareness:</strong> Understands which data
                  points are titles, prices, descriptions, etc.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Natural Language:</strong> Specify what you want in
                  plain English
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Self-Healing:</strong> Adapts to site changes
                  without code modifications
                </span>
              </li>
            </ul>

            <div className="mt-6">
              <h3 className="font-semibold">AI Scraping with RobotScraping.com</h3>
              <p className="mt-2 text-xs text-white/60">
                Using our API, you can extract structured data from any website without writing
                complex parsing logic:
              </p>
              <div className="mt-3">
                <CodeBlock language="javascript">{`const response = await fetch('https://api.robotscraping.com/extract', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.API_KEY
  },
  body: JSON.stringify({
    url: 'https://example.com/products',
    fields: ['title', 'price', 'description', 'availability'],
    instructions: 'Extract the main product title, the displayed price, a brief description, and whether the item is in stock.'
  })
});

const data = await response.json();
// Returns: { title: "...", price: "...", description: "...", availability: "..." }`}</CodeBlock>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-neon/30 bg-neon/10 p-4">
              <h4 className="font-semibold text-neon">Why AI Scraping Wins</h4>
              <p className="mt-2 text-xs text-white/70">
                AI-powered extraction reduces maintenance by up to 90%. Instead of constantly fixing
                broken selectors, you describe what data you need, and the AI finds it regardless of
                how the page is structured.
              </p>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Best Practices for Production Scrapers</h2>

            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-semibold text-neon">1. Implement Robust Error Handling</h3>
                <p className="mt-2 text-xs text-white/60">
                  Network failures, timeouts, and blocked requests are inevitable. Design your
                  scraper to handle these gracefully with retries and fallback mechanisms.
                </p>
                <div className="mt-3">
                  <CodeBlock language="javascript">{`async function scrapeWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, { timeout: 30000 });
      if (response.ok) return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
}`}</CodeBlock>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-neon">2. Respect Rate Limits</h3>
                <p className="mt-2 text-xs text-white/60">
                  Aggressive scraping can get your IP blocked and degrade the target site's
                  performance. Implement rate limiting and respect the site's server capacity.
                </p>
                <div className="mt-3">
                  <CodeBlock language="javascript">{`import pLimit from 'p-limit';

const limit = pLimit(1); // Max 1 concurrent request

const urls = /* ... array of URLs ... */;
const results = await Promise.all(
  urls.map(url => limit(() => scrapeUrl(url)))
);`}</CodeBlock>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-neon">3. Use Proxies for Large-Scale Scraping</h3>
                <p className="mt-2 text-xs text-white/60">
                  Distribute requests across multiple IP addresses to avoid blocks. Residential
                  proxies are especially effective for sites with strict bot detection.
                </p>
                <div className="mt-3">
                  <CodeBlock language="javascript">{`// Using RobotScraping.com's proxy integration
const response = await fetch('https://api.robotscraping.com/extract', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
  },
  body: JSON.stringify({
    url: 'https://example.com',
    fields: ['title', 'price'],
    options: {
      proxy: {
        type: 'residential',
        country: 'us'
      }
    }
  })
});`}</CodeBlock>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-neon">4. Store Results for Audit Trails</h3>
                <p className="mt-2 text-xs text-white/60">
                  Keep raw HTML content alongside extracted data. This lets you debug issues,
                  reprocess data with improved extraction logic, and maintain an audit trail.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-neon">5. Monitor and Alert</h3>
                <p className="mt-2 text-xs text-white/60">
                  Set up monitoring for your scraping jobs. Alert on error rates, response times,
                  and data quality issues.
                </p>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Getting Started with RobotScraping.com</h2>
            <p className="mt-3 text-sm text-white/70">
              Ready to start scraping? Our API handles the complex parts—browser rendering, proxy
              rotation, and AI extraction—so you can focus on using the data.
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neon text-xs font-bold text-black">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Get Your API Key</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Sign up for free and get your API key from the dashboard. Free tier includes 5
                    requests per day.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neon text-xs font-bold text-black">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Test in the Playground</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Use our interactive playground to test extraction from any URL without writing
                    code.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neon text-xs font-bold text-black">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Integrate with Your App</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Use our REST API from any programming language. Check the{' '}
                    <Link href="/docs" className="text-neon hover:underline">
                      documentation
                    </Link>{' '}
                    for code examples.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neon text-xs font-bold text-black">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Scale with Schedules</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Set up cron-based scheduled scraping jobs with webhook delivery for automated
                    data collection.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-block rounded-xl border border-neon/50 bg-neon/10 px-8 py-3 text-sm uppercase tracking-wider text-neon transition hover:bg-neon/20 focus:outline-none focus:ring-2 focus:ring-neon/50"
              >
                Start Scraping for Free
              </Link>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Related Guides</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Link
                href="/guides/ai-data-extraction"
                className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-neon/50"
              >
                <h4 className="font-semibold">AI-Powered Data Extraction</h4>
                <p className="mt-1 text-xs text-white/60">
                  Deep dive into AI extraction techniques and best practices.
                </p>
              </Link>
              <Link
                href="/guides/cloudflare-workers-scraping"
                className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-neon/50"
              >
                <h4 className="font-semibold">Cloudflare Workers Scraping</h4>
                <p className="mt-1 text-xs text-white/60">
                  Build serverless scrapers at the edge with Cloudflare Workers.
                </p>
              </Link>
            </div>
          </section>

          <footer className="flex flex-wrap justify-between gap-4 text-xs text-white/50 border-t border-white/10 pt-6">
            <Link href="/guides" className="transition hover:text-neon">
              Back to Guides
            </Link>
            <Link href="/docs" className="transition hover:text-neon">
              API Documentation
            </Link>
          </footer>
        </article>
      </main>
    </>
  );
}
