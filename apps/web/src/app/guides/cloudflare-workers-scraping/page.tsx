import Link from 'next/link';
import type { Metadata } from 'next';
import { CodeBlock } from '../../../components/ui/code-block';

export const metadata: Metadata = {
  title: 'Cloudflare Workers for Web Scraping: A Developer Guide | RobotScraping.com',
  description:
    'Build scalable web scrapers using Cloudflare Workers. Learn serverless scraping techniques, browser rendering, and edge computing for data extraction.',
  alternates: {
    canonical: 'https://robotscraping.com/guides/cloudflare-workers-scraping',
  },
  openGraph: {
    title: 'Cloudflare Workers for Web Scraping: A Developer Guide',
    description:
      'Build scalable web scrapers using Cloudflare Workers. Learn serverless scraping techniques, browser rendering, and edge computing for data extraction.',
    url: 'https://robotscraping.com/guides/cloudflare-workers-scraping',
    siteName: 'RobotScraping.com',
    type: 'article',
    publishedTime: '2025-01-15',
    authors: ['RobotScraping.com'],
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Cloudflare Workers for Web Scraping: A Developer Guide',
  description:
    'Build scalable web scrapers using Cloudflare Workers. Learn serverless scraping techniques, browser rendering, and edge computing for data extraction.',
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
    '@id': 'https://robotscraping.com/guides/cloudflare-workers-scraping',
  },
  inLanguage: 'en-US',
  keywords: [
    'Cloudflare Workers',
    'serverless scraping',
    'edge computing scraping',
    'Cloudflare Browser Rendering',
    'Puppeteer Edge',
    'web scraping architecture',
    'scalable scraping',
  ],
  articleSection: [
    'Introduction',
    'Why Cloudflare Workers for Scraping',
    'Architecture Overview',
    'Browser Rendering',
    'Building a Scraper',
    'Storage Options',
    'Best Practices',
    'Production Considerations',
  ],
};

export default function CloudflareWorkersScrapingPage() {
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
            <p className="mt-4 text-xs uppercase tracking-[0.35em] text-white/50">Infrastructure</p>
            <h1 className="mt-3 text-4xl font-semibold">
              Cloudflare Workers for Web Scraping: A Developer Guide
            </h1>
            <p className="mt-4 text-lg text-white/70">
              Build scalable, serverless web scrapers using Cloudflare Workers. Learn how to
              leverage edge computing, browser rendering, and distributed data extraction.
            </p>
            <div className="mt-6 flex items-center gap-4 text-xs text-white/50">
              <span>18 min read</span>
              <span>Updated January 15, 2025</span>
            </div>
          </header>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Why Cloudflare Workers for Web Scraping?</h2>
            <p className="mt-3 text-sm text-white/70">
              Cloudflare Workers offers a unique platform for web scraping that combines the power
              of serverless computing with edge deployment. With data centers in over 300 locations
              worldwide, your scrapers run close to your targets, reducing latency and improving
              reliability.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-neon/30 bg-neon/10 p-4">
                <h3 className="font-semibold text-neon">Global Edge Network</h3>
                <p className="mt-2 text-xs text-white/70">
                  Deploy scrapers to 300+ edge locations worldwide. Execute requests from locations
                  close to your target servers for optimal performance.
                </p>
              </div>
              <div className="rounded-xl border border-neon/30 bg-neon/10 p-4">
                <h3 className="font-semibold text-neon">Browser Rendering</h3>
                <p className="mt-2 text-xs text-white/70">
                  Cloudflare Browser Rendering Service (based on Puppeteer) handles JavaScript-heavy
                  sites at the edge.
                </p>
              </div>
              <div className="rounded-xl border border-neon/30 bg-neon/10 p-4">
                <h3 className="font-semibold text-neon">Serverless Architecture</h3>
                <p className="mt-2 text-xs text-white/70">
                  No server management. Auto-scaling handles traffic spikes automatically. Pay only
                  for what you use.
                </p>
              </div>
              <div className="rounded-xl border border-neon/30 bg-neon/10 p-4">
                <h3 className="font-semibold text-neon">Integrated Storage</h3>
                <p className="mt-2 text-xs text-white/70">
                  D1 database, R2 object storage, and KV storage are built-in. Store scraped data
                  without external dependencies.
                </p>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Architecture Overview</h2>
            <p className="mt-3 text-sm text-white/70">
              A typical Cloudflare Workers scraping architecture consists of several components
              working together:
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">HTTP Handler Worker</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Receives scraping requests, validates authentication, and queues jobs for
                    processing.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Browser Rendering Service</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Renders JavaScript-heavy pages using headless Chrome, returning the final HTML.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Extraction Worker</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Processes rendered HTML and uses AI to extract structured data.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Storage Layer</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Stores extracted data in D1, R2, or KV. Maintains job status and audit trails.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  5
                </div>
                <div>
                  <h4 className="font-semibold">Webhook Delivery</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Notifies your application when extraction is complete via signed webhooks.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Cloudflare Browser Rendering Service</h2>
            <p className="mt-3 text-sm text-white/70">
              The Browser Rendering Service (BRS) is Cloudflare{"'"}s solution for running headless
              Chrome at the edge. It'\''s essential for scraping modern websites that rely heavily
              on JavaScript.
            </p>

            <div className="mt-4">
              <h3 className="font-semibold">Using Browser Rendering in a Worker</h3>
              <div className="mt-3">
                <CodeBlock language="typescript">{`import { onRequest } from '@cloudflare/puppeteer';

export async function onRequest(context) {
  const { env } = context;

  // Connect to Browser Rendering Service
  const browser = await env.BROWSER.connect();
  const page = await browser.newPage();

  try {
    // Navigate to the target page
    await page.goto('https://example.com/product', {
      waitUntil: 'networkidle'
    });

    // Wait for specific content to load
    await page.waitForSelector('.product-details');

    // Extract data
    const data = await page.evaluate(() => {
      return {
        title: document.querySelector('h1')?.textContent,
        price: document.querySelector('.price')?.textContent,
        description: document.querySelector('.description')?.textContent
      };
    });

    return Response.json(data);
  } finally {
    await browser.disconnect();
  }
}`}</CodeBlock>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <h4 className="font-semibold text-amber-400">Browser Rendering Limits</h4>
              <p className="mt-2 text-xs text-white/70">
                BRS has usage limits including concurrent connections and execution time. For
                high-volume scraping, implement a queue system and process jobs asynchronously.
              </p>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Building a Scraper with AI Extraction</h2>
            <p className="mt-3 text-sm text-white/70">
              Combining Browser Rendering with AI extraction creates a powerful scraping pipeline.
              Here'\''s how to build it:
            </p>

            <div className="mt-4">
              <h3 className="font-semibold">Worker Implementation</h3>
              <div className="mt-3">
                <CodeBlock language="typescript">{`interface Env {
  BROWSER: Fetcher;
  AI: AiTextGeneration;
  DB: D1Database;
  API_KEY: string;
}

interface ScrapingRequest {
  url: string;
  fields: string[];
  instructions?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Verify API key
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== env.API_KEY) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse request
    const { url, fields, instructions }: ScrapingRequest = await request.json();

    // Render page with browser
    const browser = await env.BROWSER.connect();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000); // Allow JS to execute

      // Get page content
      const content = await page.evaluate(() => {
        return document.body.innerText;
      });

      // Extract using AI
      const prompt = \`Extract the following fields from this page content: \${fields.join(', ')}.
\${instructions ? instructions : ''}
Return the result as JSON.

Page content:
\${content.slice(0, 10000)}\`; // Token limit

      const aiResponse = await env.AI.run(prompt, {
        type: 'json'
      });

      // Store result
      await env.DB.prepare(
        'INSERT INTO scraping_jobs (url, result, created_at) VALUES (?, ?, ?)'
      ).bind(url, JSON.stringify(aiResponse), Date.now()).run();

      return Response.json(aiResponse);
    } finally {
      await browser.disconnect();
    }
  }
};`}</CodeBlock>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Storage Options for Scraped Data</h2>
            <p className="mt-3 text-sm text-white/70">
              Cloudflare offers multiple storage options, each suited for different use cases:
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-semibold text-neon">D1 Database</h3>
                <p className="mt-2 text-xs text-white/60">
                  SQLite-based database ideal for structured data. Perfect for storing scraped
                  products, articles, or business listings.
                </p>
                <div className="mt-3">
                  <CodeBlock language="typescript">{`// Store scraped data in D1
await env.DB.prepare(\`
  INSERT INTO products (title, price, url, scraped_at)
  VALUES (?, ?, ?, ?)
\`).bind(
  data.title,
  data.price,
  url,
  Date.now()
).run();

// Query data
const results = await env.DB.prepare(
  'SELECT * FROM products WHERE price < ? ORDER BY price DESC'
).bind(100).all();`}</CodeBlock>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-neon">R2 Object Storage</h3>
                <p className="mt-2 text-xs text-white/60">
                  S3-compatible object storage. Best for storing raw HTML, screenshots, or large
                  volumes of scraped content.
                </p>
                <div className="mt-3">
                  <CodeBlock language="typescript">{`// Store raw HTML for later processing
const htmlKey = 'scrapes/' + date + '/' + encodeURIComponent(targetUrl) + '.html';
await env.R2.put(htmlKey, htmlContent, {
  customMetadata: {
    url: targetUrl,
    scrapedAt: new Date().toISOString(),
    status: 'success'
  }
});

// Retrieve later
const stored = await env.R2.get(htmlKey);
const content = await stored.text();`}</CodeBlock>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-neon">KV Storage</h3>
                <p className="mt-2 text-xs text-white/60">
                  Low-latency key-value store with global replication. Ideal for caching, rate
                  limiting, and job status tracking.
                </p>
                <div className="mt-3">
                  <CodeBlock language="typescript">{`// Track scraping job status
await env.JOBS.put(jobId, JSON.stringify({
  status: 'processing',
  startedAt: Date.now()
}), { metadataTtl: 3600 });

// Implement rate limiting
const key = \`ratelimit:\${apiKey}\`;
const count = await env.RATE_LIMIT.get(key);
if (count && parseInt(count) > 100) {
  return new Response('Rate limit exceeded', { status: 429 });
}
await env.RATE_LIMIT.put(key, (parseInt(count || '0') + 1).toString(), {
  expirationTtl: 60
});`}</CodeBlock>
                </div>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Implementing Scheduled Scraping</h2>
            <p className="mt-3 text-sm text-white/70">
              Use Cloudflare Cron Triggers to run scrapers on a schedule. Perfect for periodic data
              collection like price monitoring or news aggregation.
            </p>

            <div className="mt-4">
              <CodeBlock language="typescript">{`// wrangler.toml
// [triggers]
// crons = ["0 * * * *"] // Every hour

export interface Env {
  BROWSER: Fetcher;
  AI: AiTextGeneration;
  R2: R2Bucket;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const urls = [
      'https://example.com/products/1',
      'https://example.com/products/2',
      'https://example.com/products/3'
    ];

    for (const url of urls) {
      try {
        const data = await scrapeUrl(url, env);

        // Store with timestamp
        await env.R2.put(
          \`products/\${Date.now()}/\${encodeURIComponent(url)}.json\`,
          JSON.stringify(data)
        );

        // Optional: Send webhook
        await fetch('https://your-app.com/webhook', {
          method: 'POST',
          body: JSON.stringify({ url, data })
        });
      } catch (error) {
        console.error(\`Failed to scrape \${url}:\`, error);
      }
    }
  }
};

async function scrapeUrl(url: string, env: Env): Promise<any> {
  const browser = await env.BROWSER.connect();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    const content = await page.evaluate(() => document.body.innerText);

    // Use AI to extract structured data
    const result = await env.AI.run(
      \`Extract product title, price, and availability from: \${content.slice(0, 5000)}\`,
      { type: 'json' }
    );

    return result;
  } finally {
    await browser.disconnect();
  }
}`}</CodeBlock>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Best Practices for Production Scrapers</h2>

            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-semibold text-neon">1. Implement Retry Logic</h3>
                <p className="mt-2 text-xs text-white/60">
                  Network requests fail. Browser rendering times out. Implement exponential backoff
                  for resilience.
                </p>
                <div className="mt-3">
                  <CodeBlock language="typescript">{`async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}`}</CodeBlock>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-neon">2. Use Queues for High Volume</h3>
                <p className="mt-2 text-xs text-white/60">
                  For large-scale scraping, use Cloudflare Queues to decouple request ingestion from
                  processing.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-neon">3. Monitor and Alert</h3>
                <p className="mt-2 text-xs text-white/60">
                  Integrate with monitoring services to track success rates, response times, and
                  error patterns.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-neon">4. Respect Rate Limits</h3>
                <p className="mt-2 text-xs text-white/60">
                  Implement delays between requests and respect target servers. Use KV for
                  distributed rate limiting.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-neon">5. Handle Authentication</h3>
                <p className="mt-2 text-xs text-white/60">
                  For sites requiring authentication, pass cookies and headers through the browser
                  context.
                </p>
                <div className="mt-3">
                  <CodeBlock language="typescript">{`await page.setCookie({
  name: 'session',
  value: sessionToken,
  domain: 'example.com'
});

await page.setExtraHTTPHeaders({
  'Authorization': \`Bearer \${token}\`
});`}</CodeBlock>
                </div>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Using RobotScraping.com Instead</h2>
            <p className="mt-3 text-sm text-white/70">
              Building and maintaining your own Cloudflare Workers scraping infrastructure is
              complex. RobotScraping.com handles all the complexity for you:
            </p>

            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">No infrastructure to manage:</strong> We handle
                  browser rendering, AI extraction, and storage
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Built-in proxy rotation:</strong> Residential and
                  datacenter proxies included
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Scheduled scraping:</strong> Built-in cron with
                  webhook delivery
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Durable storage:</strong> Your data is stored with
                  full audit trails
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Simple API:</strong> One endpoint for all your
                  scraping needs
                </span>
              </li>
            </ul>

            <div className="mt-6">
              <CodeBlock language="javascript">{`// Compare: RobotScraping.com API (much simpler)
const response = await fetch('https://api.robotscraping.com/extract', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.API_KEY
  },
  body: JSON.stringify({
    url: 'https://example.com/product',
    fields: ['title', 'price', 'availability']
  })
});

const data = await response.json();
// Done! No Workers to deploy, no infrastructure to manage.`}</CodeBlock>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-block rounded-xl border border-neon/50 bg-neon/10 px-8 py-3 text-sm uppercase tracking-wider text-neon transition hover:bg-neon/20 focus:outline-none focus:ring-2 focus:ring-neon/50"
              >
                Start Scraping with No Infrastructure
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
                  Learn how AI revolutionizes web scraping.
                </p>
              </Link>
              <Link
                href="/guides/web-scraping-for-developers"
                className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-neon/50"
              >
                <h4 className="font-semibold">Web Scraping Fundamentals</h4>
                <p className="mt-1 text-xs text-white/60">
                  Master scraping basics and best practices.
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
