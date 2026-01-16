import Link from 'next/link';
import type { Metadata } from 'next';
import { CodeBlock } from '../../../components/ui/code-block';

export const metadata: Metadata = {
  title: 'Ecommerce Price Monitoring: Build Your Own Price Tracker | RobotScraping.com',
  description:
    'Track competitor prices, monitor product availability, and get alerts on price changes. Learn how to build automated price monitoring systems with web scraping.',
  alternates: {
    canonical: 'https://robotscraping.com/guides/ecommerce-price-monitoring',
  },
  openGraph: {
    title: 'Ecommerce Price Monitoring: Build Your Own Price Tracker',
    description:
      'Track competitor prices, monitor product availability, and get alerts on price changes. Learn how to build automated price monitoring systems.',
    url: 'https://robotscraping.com/guides/ecommerce-price-monitoring',
    siteName: 'RobotScraping.com',
    type: 'article',
    publishedTime: '2025-01-15',
    authors: ['RobotScraping.com'],
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Ecommerce Price Monitoring: Build Your Own Price Tracker',
  description:
    'Track competitor prices, monitor product availability, and get alerts on price changes. Learn how to build automated price monitoring systems with web scraping.',
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
    '@id': 'https://robotscraping.com/guides/ecommerce-price-monitoring',
  },
  inLanguage: 'en-US',
  keywords: [
    'price monitoring',
    'ecommerce scraping',
    'competitor price tracking',
    'price intelligence',
    'price comparison',
    'retail scraping',
    'amazon price tracking',
  ],
  articleSection: [
    'Introduction',
    'Why Price Monitoring Matters',
    'Architecture',
    'Extracting Price Data',
    'Storing Price History',
    'Price Change Detection',
    'Alerting',
    'Best Practices',
  ],
};

export default function EcommercePriceMonitoringPage() {
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
            <p className="mt-4 text-xs uppercase tracking-[0.35em] text-white/50">Use Cases</p>
            <h1 className="mt-3 text-4xl font-semibold">
              Ecommerce Price Monitoring: Build Your Own Price Tracker
            </h1>
            <p className="mt-4 text-lg text-white/70">
              Track competitor prices, monitor product availability, and get automated alerts on
              price changes. Learn how to build a comprehensive price monitoring system.
            </p>
            <div className="mt-6 flex items-center gap-4 text-xs text-white/50">
              <span>14 min read</span>
              <span>Updated January 15, 2025</span>
            </div>
          </header>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Why Price Monitoring Matters</h2>
            <p className="mt-3 text-sm text-white/70">
              In the competitive world of ecommerce, pricing strategy can make or break your
              business. Price monitoring gives you the intelligence needed to optimize your pricing,
              protect margins, and capture more market share.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-neon/30 bg-neon/10 p-4">
                <h3 className="font-semibold text-neon">Competitive Intelligence</h3>
                <p className="mt-2 text-xs text-white/70">
                  Know exactly what your competitors are charging. Identify pricing gaps and
                  opportunities to win price-sensitive customers.
                </p>
              </div>
              <div className="rounded-xl border border-neon/30 bg-neon/10 p-4">
                <h3 className="font-semibold text-neon">Dynamic Pricing</h3>
                <p className="mt-2 text-xs text-white/70">
                  Adjust your prices in real-time based on market conditions, demand, and competitor
                  movements.
                </p>
              </div>
              <div className="rounded-xl border border-neon/30 bg-neon/10 p-4">
                <h3 className="font-semibold text-neon">MAP Enforcement</h3>
                <p className="mt-2 text-xs text-white/70">
                  Monitor Minimum Advertised Price (MAP) compliance across your distribution network
                  and resellers.
                </p>
              </div>
              <div className="rounded-xl border border-neon/30 bg-neon/10 p-4">
                <h3 className="font-semibold text-neon">Revenue Optimization</h3>
                <p className="mt-2 text-xs text-white/70">
                  Find the optimal price point that maximizes revenue without sacrificing profit
                  margins.
                </p>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Price Monitoring Architecture</h2>
            <p className="mt-3 text-sm text-white/70">
              A robust price monitoring system consists of several components working together:
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Product URL Management</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Maintain a database of products to monitor with their competitor URLs.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Scheduled Scraping</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Run scraping jobs on a schedule (hourly, daily) to collect current pricing data.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Data Extraction & Parsing</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Extract prices, availability, and promotions from product pages using AI-powered
                    extraction.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Price History Storage</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Store all price observations with timestamps for historical analysis and trend
                    detection.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  5
                </div>
                <div>
                  <h4 className="font-semibold">Change Detection & Alerting</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Compare current prices with previous observations and trigger alerts for
                    significant changes.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Extracting Price Data</h2>
            <p className="mt-3 text-sm text-white/70">
              Price extraction is challenging because every ecommerce site displays prices
              differently. AI-powered extraction handles this variability automatically.
            </p>

            <div className="mt-4">
              <h3 className="font-semibold">Basic Price Extraction</h3>
              <div className="mt-3">
                <CodeBlock language="javascript">{`const response = await fetch('https://api.robotscraping.com/extract', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.API_KEY
  },
  body: JSON.stringify({
    url: 'https://example.com/product/laptop-123',
    fields: [
      'product_title',
      'current_price',
      'original_price',
      'currency',
      'availability',
      'in_stock',
      'discount_percentage',
      'promotion_text'
    ],
    instructions: 'Extract the main product title, the current selling price, any crossed-out original price, the currency symbol, whether the item is in stock, and any promotional text or discount badges.'
  })
});

const priceData = await response.json();
// {
//   product_title: "Dell XPS 15 Laptop",
//   current_price: "999.99",
//   original_price: "1299.99",
//   currency: "$",
//   availability: "In Stock",
//   in_stock: true,
//   discount_percentage: "23% off",
//   promotion_text: "Flash Sale - Limited Time"
// }`}</CodeBlock>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold">Handling Variant Prices</h3>
              <p className="mt-2 text-xs text-white/60">
                Many products have variants (size, color) with different prices. Extract all variant
                prices for complete monitoring.
              </p>
              <div className="mt-3">
                <CodeBlock language="javascript">{`body: JSON.stringify({
  url: 'https://example.com/product/tshirt',
  fields: ['variants'],
  instructions: 'Extract all product variants. For each variant, return the size, color, price, and whether it is in stock. Return as an array of objects.'
})`}</CodeBlock>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-neon/30 bg-neon/10 p-4">
              <h4 className="font-semibold text-neon">Price Normalization</h4>
              <p className="mt-2 text-xs text-white/70">
                Always normalize prices to a standard format (numeric value without currency
                symbols) for storage and comparison. Handle international currencies by converting
                to a base currency using current exchange rates.
              </p>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Storing Price History</h2>
            <p className="mt-3 text-sm text-white/70">
              Building a price history database enables trend analysis and informed pricing
              decisions. Here's how to structure your data:
            </p>

            <div className="mt-4">
              <h3 className="font-semibold">Database Schema</h3>
              <div className="mt-3">
                <CodeBlock language="sql">{`-- Products table (items you're tracking)
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  sku TEXT,
  name TEXT,
  category TEXT,
  brand TEXT,
  created_at TIMESTAMP
);

-- Competitor URLs for each product
CREATE TABLE competitor_urls (
  id INTEGER PRIMARY KEY,
  product_id INTEGER,
  competitor_name TEXT,
  url TEXT UNIQUE,
  is_active BOOLEAN,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Price observations (time series data)
CREATE TABLE price_observations (
  id INTEGER PRIMARY KEY,
  competitor_url_id INTEGER,
  price_cents INTEGER,
  currency TEXT,
  original_price_cents INTEGER,
  availability TEXT,
  in_stock BOOLEAN,
  promotion_text TEXT,
  observed_at TIMESTAMP,
  raw_html_reference TEXT,
  FOREIGN KEY (competitor_url_id) REFERENCES competitor_urls(id)
);

-- Price change alerts
CREATE TABLE price_alerts (
  id INTEGER PRIMARY KEY,
  competitor_url_id INTEGER,
  old_price_cents INTEGER,
  new_price_cents INTEGER,
  change_percent REAL,
  alert_type TEXT,
  sent_at TIMESTAMP,
  acknowledged BOOLEAN
);`}</CodeBlock>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold">Inserting Price Observations</h3>
              <div className="mt-3">
                <CodeBlock language="javascript">{`async function recordPriceObservation(db, competitorUrlId, priceData) {
  const priceCents = Math.round(parseFloat(priceData.current_price) * 100);
  const originalPriceCents = priceData.original_price
    ? Math.round(parseFloat(priceData.original_price) * 100)
    : null;

  await db.prepare(\`
    INSERT INTO price_observations (
      competitor_url_id, price_cents, currency,
      original_price_cents, availability, in_stock,
      promotion_text, observed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  \`).bind(
    competitorUrlId,
    priceCents,
    priceData.currency || 'USD',
    originalPriceCents,
    priceData.availability || 'Unknown',
    priceData.in_stock ?? true,
    priceData.promotion_text || null,
    Date.now()
  ).run();
}`}</CodeBlock>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Detecting Price Changes</h2>
            <p className="mt-3 text-sm text-white/70">
              The value of price monitoring comes from detecting and responding to changes.
              Implement smart change detection that filters noise and alerts on significant
              movements.
            </p>

            <div className="mt-4">
              <h3 className="font-semibold">Change Detection Logic</h3>
              <div className="mt-3">
                <CodeBlock language="javascript">{`async function detectPriceChanges(db, threshold = 0.05) {
  // Get the most recent price for each competitor URL
  const latestPrices = await db.prepare(\`
    SELECT DISTINCT ON (competitor_url_id)
      competitor_url_id,
      price_cents,
      observed_at
    FROM price_observations
    ORDER BY competitor_url_id, observed_at DESC
  \`).all();

  // Get the previous price for comparison
  for (const latest of latestPrices) {
    const previous = await db.prepare(\`
      SELECT price_cents
      FROM price_observations
      WHERE competitor_url_id = ?
        AND observed_at < ?
      ORDER BY observed_at DESC
      LIMIT 1
    \`).bind(latest.competitor_url_id, latest.observed_at).first();

    if (previous) {
      const changePercent =
        (latest.price_cents - previous.price_cents) / previous.price_cents;

      if (Math.abs(changePercent) >= threshold) {
        await createPriceAlert(db, {
          competitorUrlId: latest.competitor_url_id,
          oldPrice: previous.price_cents,
          newPrice: latest.price_cents,
          changePercent: changePercent * 100,
          alertType: changePercent < 0 ? 'price_drop' : 'price_increase'
        });
      }
    }
  }
}

async function createPriceAlert(db, alertData) {
  await db.prepare(\`
    INSERT INTO price_alerts (
      competitor_url_id, old_price_cents, new_price_cents,
      change_percent, alert_type, sent_at, acknowledged
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  \`).bind(
    alertData.competitorUrlId,
    alertData.oldPrice,
    alertData.newPrice,
    alertData.changePercent,
    alertData.alertType,
    Date.now(),
    false
  ).run();
}`}</CodeBlock>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold">Advanced: Anomaly Detection</h3>
              <p className="mt-2 text-xs text-white/60">
                Use statistical methods to detect unusual price patterns beyond simple percentage
                changes.
              </p>
              <div className="mt-3">
                <CodeBlock language="javascript">{`// Detect prices that deviate significantly from historical average
async function detectPriceAnomalies(db, stdDevThreshold = 2) {
  const stats = await db.prepare(\`
    SELECT
      competitor_url_id,
      AVG(price_cents) as mean_price,
      STDDEV(price_cents) as std_dev,
      MAX(observed_at) as last_observed
    FROM price_observations
    WHERE observed_at > datetime('now', '-30 days')
    GROUP BY competitor_url_id
  \`).all();

  for (const stat of stats) {
    const latest = await db.prepare(\`
      SELECT price_cents FROM price_observations
      WHERE competitor_url_id = ?
      ORDER BY observed_at DESC LIMIT 1
    \`).bind(stat.competitor_url_id).first();

    if (latest) {
      const zScore = (latest.price_cents - stat.mean_price) / stat.std_dev;
      if (Math.abs(zScore) > stdDevThreshold) {
        // Flag as anomalous
        console.log(\`Anomaly detected for URL \${stat.competitor_url_id}: Z-score = \${zScore.toFixed(2)}\`);
      }
    }
  }
}`}</CodeBlock>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Setting Up Scheduled Monitoring</h2>
            <p className="mt-3 text-sm text-white/70">
              Automated monitoring requires scheduled scraping. Use cron expressions to define when
              to check prices.
            </p>

            <div className="mt-4">
              <h3 className="font-semibold">Creating a Monitoring Schedule</h3>
              <div className="mt-3">
                <CodeBlock language="javascript">{`// Create a schedule for price monitoring
const response = await fetch('https://api.robotscraping.com/schedules', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.API_KEY
  },
  body: JSON.stringify({
    name: 'daily-price-monitoring',
    cron: '0 */4 * * *', // Every 4 hours
    urls: [
      'https://amazon.com/dp/B08X5...',
      'https://walmart.com/ip/12345...',
      'https://bestbuy.com/site/...'
    ],
    config: {
      fields: ['current_price', 'original_price', 'availability', 'in_stock'],
      instructions: 'Extract current price, original price if shown, and stock availability.'
    },
    webhook_url: 'https://your-app.com/api/price-webhook'
  })
});`}</CodeBlock>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold">Handling Webhook Results</h3>
              <div className="mt-3">
                <CodeBlock language="javascript">{`// Your webhook handler receives extraction results
app.post('/api/price-webhook', async (req, res) => {
  const { job_id, url, result, timestamp } = req.body;

  // Verify webhook signature
  const signature = req.headers['x-webhook-signature'];
  if (!verifySignature(signature, req.body, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Store the price observation
  const competitorUrl = await findCompetitorUrl(url);
  await recordPriceObservation(db, competitorUrl.id, result);

  // Check for price changes
  await detectPriceChanges(db);

  res.sendStatus(200);
});`}</CodeBlock>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Price Monitoring Best Practices</h2>

            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-semibold text-neon">1. Respect Rate Limits</h3>
                <p className="mt-2 text-xs text-white/60">
                  Don't scrape too frequently. Hourly checks are usually sufficient for most
                  products. High-frequency scraping can trigger blocks.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-neon">2. Use Proxies</h3>
                <p className="mt-2 text-xs text-white/60">
                  Distribute requests across multiple IP addresses to avoid detection. Residential
                  proxies are most effective for ecommerce sites.
                </p>
                <div className="mt-3">
                  <CodeBlock language="javascript">{`body: JSON.stringify({
  url: 'https://amazon.com/dp/B08X5...',
  fields: ['price', 'availability'],
  options: {
    proxy: {
      type: 'residential',
      country: 'us'
    }
  }
})`}</CodeBlock>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-neon">3. Handle Dynamic Pricing</h3>
                <p className="mt-2 text-xs text-white/60">
                  Some sites change prices based on user behavior, location, or device. Use
                  consistent scraping parameters.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-neon">4. Monitor Availability</h3>
                <p className="mt-2 text-xs text-white/60">
                  Stock availability is as important as price. Track out-of-stock events to identify
                  demand patterns.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-neon">5. Validate Data Quality</h3>
                <p className="mt-2 text-xs text-white/60">
                  Implement validation to catch bad data. Prices should be positive numbers within
                  reasonable ranges for the product category.
                </p>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Using RobotScraping.com for Price Monitoring</h2>
            <p className="mt-3 text-sm text-white/70">
              RobotScraping.com simplifies price monitoring with built-in scheduling, proxy
              rotation, and AI-powered extraction that works across all major ecommerce sites.
            </p>

            <div className="mt-4">
              <CodeBlock language="javascript">{`// Complete price monitoring workflow
const products = [
  { sku: 'LAPTOP-001', url: 'https://amazon.com/dp/B08X5...' },
  { sku: 'LAPTOP-001', url: 'https://bestbuy.com/site/...' },
  { sku: 'PHONE-002', url: 'https://amazon.com/dp/B09Y4...' }
];

// Create a schedule for monitoring
await fetch('https://api.robotscraping.com/schedules', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.API_KEY
  },
  body: JSON.stringify({
    name: 'ecommerce-price-monitor',
    cron: '0 */2 * * *', // Every 2 hours
    urls: products.map(p => p.url),
    config: {
      fields: ['product_title', 'current_price', 'original_price', 'in_stock', 'prime_eligible'],
      options: {
        proxy: { type: 'residential', country: 'us' }
      }
    },
    webhook_url: 'https://your-app.com/api/price-alerts'
  })
});`}</CodeBlock>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-block rounded-xl border border-neon/50 bg-neon/10 px-8 py-3 text-sm uppercase tracking-wider text-neon transition hover:bg-neon/20 focus:outline-none focus:ring-2 focus:ring-neon/50"
              >
                Start Monitoring Prices Today
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
                  Learn AI extraction techniques for complex product pages.
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
