import Link from 'next/link';
import type { Metadata } from 'next';
import { CodeBlock } from '../../../components/ui/code-block';

export const metadata: Metadata = {
  title: 'Building a News Aggregator: Web Scraping Tutorial | RobotScraping.com',
  description:
    'Create automated news aggregation systems. Extract articles, headlines, and metadata from multiple news sources with AI-powered scraping.',
  alternates: {
    canonical: 'https://robotscraping.com/guides/news-aggregation',
  },
  openGraph: {
    title: 'Building a News Aggregator: Web Scraping Tutorial',
    description:
      'Create automated news aggregation systems. Extract articles, headlines, and metadata from multiple news sources with AI-powered scraping.',
    url: 'https://robotscraping.com/guides/news-aggregation',
    siteName: 'RobotScraping.com',
    type: 'article',
    publishedTime: '2025-01-15',
    authors: ['RobotScraping.com'],
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Building a News Aggregator: Web Scraping Tutorial',
  description:
    'Create automated news aggregation systems. Extract articles, headlines, and metadata from multiple news sources with AI-powered scraping.',
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
    '@id': 'https://robotscraping.com/guides/news-aggregation',
  },
  inLanguage: 'en-US',
  keywords: [
    'news aggregation',
    'news scraping',
    'article extraction',
    'content aggregation',
    'headline monitoring',
    'media monitoring',
    'news API',
  ],
  articleSection: [
    'Introduction',
    'Use Cases',
    'Architecture',
    'Extracting Headlines',
    'Full Article Extraction',
    'Source Management',
    'Deduplication',
    'Legal Considerations',
  ],
};

export default function NewsAggregationPage() {
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
              Building a News Aggregator: Web Scraping Tutorial
            </h1>
            <p className="mt-4 text-lg text-white/70">
              Create automated news aggregation systems that extract articles, headlines, and
              metadata from multiple sources. Learn to build a comprehensive media monitoring
              solution.
            </p>
            <div className="mt-6 flex items-center gap-4 text-xs text-white/50">
              <span>16 min read</span>
              <span>Updated January 15, 2025</span>
            </div>
          </header>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Why Build a News Aggregator?</h2>
            <p className="mt-3 text-sm text-white/70">
              News aggregators have become essential tools for staying informed in an age of
              information overload. By consolidating content from multiple sources, they provide
              comprehensive coverage of topics that matter to you or your organization.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-neon/30 bg-neon/10 p-4">
                <h3 className="font-semibold text-neon">Brand Monitoring</h3>
                <p className="mt-2 text-xs text-white/70">
                  Track mentions of your brand across news outlets and blogs. Respond to stories
                  quickly and manage reputation.
                </p>
              </div>
              <div className="rounded-xl border border-neon/30 bg-neon/10 p-4">
                <h3 className="font-semibold text-neon">Competitive Intelligence</h3>
                <p className="mt-2 text-xs text-white/70">
                  Monitor competitor news, product launches, and strategic moves. Stay ahead of
                  industry developments.
                </p>
              </div>
              <div className="rounded-xl border border-neon/30 bg-neon/10 p-4">
                <h3 className="font-semibold text-neon">Industry Research</h3>
                <p className="mt-2 text-xs text-white/70">
                  Aggregate news from industry publications to identify trends, opportunities, and
                  emerging technologies.
                </p>
              </div>
              <div className="rounded-xl border border-neon/30 bg-neon/10 p-4">
                <h3 className="font-semibold text-neon">Content Curation</h3>
                <p className="mt-2 text-xs text-white/70">
                  Build niche news platforms focused on specific topics, regions, or industries.
                  Provide value through curated content.
                </p>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">News Aggregator Architecture</h2>
            <p className="mt-3 text-sm text-white/70">
              A production news aggregator consists of several key components:
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Source Management</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Maintain a database of news sources with their URLs, RSS feeds, and update
                    frequencies.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Headline Extraction</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Scrape homepage and category pages to extract headlines, URLs, summaries, and
                    metadata.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Full Article Fetching</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Fetch complete article content from linked pages, extracting body text, author,
                    images, and publication date.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Content Processing</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Clean HTML, extract main content, categorize articles, and perform sentiment
                    analysis.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  5
                </div>
                <div>
                  <h4 className="font-semibold">Deduplication</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Identify duplicate stories across sources using similarity matching and URL
                    clustering.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/20 text-neon text-sm font-bold">
                  6
                </div>
                <div>
                  <h4 className="font-semibold">Delivery & Alerts</h4>
                  <p className="mt-1 text-xs text-white/60">
                    Deliver relevant content via email digests, web feeds, or real-time alerts for
                    breaking news.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Extracting Headlines from News Sites</h2>
            <p className="mt-3 text-sm text-white/70">
              News sites have different layouts, but AI extraction handles this variability. Start
              by extracting headlines from homepage or category pages.
            </p>

            <div className="mt-4">
              <h3 className="font-semibold">Basic Headline Extraction</h3>
              <div className="mt-3">
                <CodeBlock language="javascript">{`const response = await fetch('https://api.robotscraping.com/extract', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.API_KEY
  },
  body: JSON.stringify({
    url: 'https://news.example.com/technology',
    fields: ['headlines'],
    instructions: 'Extract all news article headlines from this page. For each headline, return the title, the article URL, the publication date if shown, a brief summary or excerpt, and the category or section name. Return as an array of objects.'
  })
});

const data = await response.json();
// {
//   headlines: [
//     {
//       title: "Tech Giant Announces New AI Features",
//       url: "https://news.example.com/article1",
//       date: "January 15, 2025",
//       summary: "The company revealed...",
//       category: "Technology"
//     },
//     {
//       title: "Startup Raises $50M Series B",
//       url: "https://news.example.com/article2",
//       date: "January 15, 2025",
//       summary: "The funding will be used...",
//       category: "Business"
//     },
//     // ... more headlines
//   ]
// }`}</CodeBlock>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-neon/30 bg-neon/10 p-4">
              <h4 className="font-semibold text-neon">Handling Infinite Scroll</h4>
              <p className="mt-2 text-xs text-white/70">
                Many news sites use infinite scroll. Configure the scraper to wait for content to
                load or use pagination parameters.
              </p>
              <div className="mt-3">
                <CodeBlock language="javascript">{`body: JSON.stringify({
  url: 'https://news.example.com/technology',
  fields: ['headlines'],
  options: {
    waitUntil: 'networkidle',
    timeoutMs: 30000,
    waitForSelector: '.article-list'
  }
})`}</CodeBlock>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Extracting Full Article Content</h2>
            <p className="mt-3 text-sm text-white/70">
              Once you have headlines, fetch full articles for complete content. AI extraction
              intelligently identifies the main article content, excluding sidebars, ads, and
              navigation.
            </p>

            <div className="mt-4">
              <h3 className="font-semibold">Article Extraction</h3>
              <div className="mt-3">
                <CodeBlock language="javascript">{`const response = await fetch('https://api.robotscraping.com/extract', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.API_KEY
  },
  body: JSON.stringify({
    url: 'https://news.example.com/article/tech-giant-ai',
    fields: [
      'article_title',
      'author',
      'publication_date',
      'last_updated',
      'article_body',
      'summary',
      'tags',
      'category',
      'image_url',
      'image_caption'
    ],
    instructions: 'Extract the main article content. Get the headline, byline with author name, publication and update dates, the full article text body (not including ads or sidebars), a brief summary, any topic tags or categories, and the main image with its caption.'
  })
});

const article = await response.json();
// {
//   article_title: "Tech Giant Announces New AI Features",
//   author: "Jane Smith",
//   publication_date: "2025-01-15",
//   last_updated: "2025-01-15 14:30",
//   article_body: "In a groundbreaking announcement...",
//   summary: "The company revealed new AI capabilities...",
//   tags: ["AI", "Technology", "Product Launch"],
//   category: "Technology",
//   image_url: "https://news.example.com/images/article1.jpg",
//   image_caption: "The new AI interface in action."
// }`}</CodeBlock>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold">Batch Article Processing</h3>
              <p className="mt-2 text-xs text-white/60">
                Use the batch endpoint to process multiple article URLs simultaneously.
              </p>
              <div className="mt-3">
                <CodeBlock language="javascript">{`const articleUrls = [
  'https://news.example.com/article1',
  'https://news.example.com/article2',
  'https://news.example.com/article3'
];

const response = await fetch('https://api.robotscraping.com/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.API_KEY
  },
  body: JSON.stringify({
    urls: articleUrls,
    fields: ['article_title', 'article_body', 'author', 'publication_date'],
    async: true,
    webhook_url: 'https://your-app.com/webhook/articles'
  })
});`}</CodeBlock>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Managing Multiple News Sources</h2>
            <p className="mt-3 text-sm text-white/70">
              A robust aggregator monitors multiple sources simultaneously. Here's how to structure
              your source management:
            </p>

            <div className="mt-4">
              <h3 className="font-semibold">Source Database Schema</h3>
              <div className="mt-3">
                <CodeBlock language="sql">{`-- News sources configuration
CREATE TABLE news_sources (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  category_pages TEXT, -- JSON array of category URLs
  rss_feeds TEXT, -- JSON array of RSS feed URLs
  update_frequency INTEGER, -- Minutes between checks
  is_active BOOLEAN,
  last_crawled_at TIMESTAMP
);

-- Extracted articles
CREATE TABLE articles (
  id INTEGER PRIMARY KEY,
  source_id INTEGER,
  url TEXT UNIQUE,
  title TEXT,
  author TEXT,
  publication_date TIMESTAMP,
  article_body TEXT,
  summary TEXT,
  category TEXT,
  tags TEXT, -- JSON array
  image_url TEXT,
  scraped_at TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES news_sources(id)
);

-- Article deduplication tracking
CREATE TABLE article_clusters (
  id INTEGER PRIMARY KEY,
  canonical_article_id INTEGER,
  cluster_signature TEXT,
  article_ids TEXT, -- JSON array of related article IDs
  created_at TIMESTAMP
);`}</CodeBlock>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold">Source Management Code</h3>
              <div className="mt-3">
                <CodeBlock language="javascript">{`// Get sources that need to be crawled
async function getSourcesForCrawling(db) {
  const sources = await db.prepare(\`
    SELECT * FROM news_sources
    WHERE is_active = true
      AND (
        last_crawled_at IS NULL
        OR datetime(last_crawled_at, '+' || update_frequency || ' minutes') < datetime('now')
      )
  \`).all();
  return sources;
}

// Mark source as crawled
async function markSourceCrawled(db, sourceId) {
  await db.prepare(\`
    UPDATE news_sources
    SET last_crawled_at = datetime('now')
    WHERE id = ?
  \`).bind(sourceId).run();
}

// Store extracted articles
async function storeArticles(db, sourceId, articles) {
  for (const article of articles) {
    await db.prepare(\`
      INSERT OR REPLACE INTO articles
      (source_id, url, title, author, publication_date,
       article_body, summary, category, tags, image_url, scraped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).bind(
      sourceId,
      article.url,
      article.title,
      article.author,
      article.publication_date,
      article.article_body,
      article.summary,
      article.category,
      JSON.stringify(article.tags || []),
      article.image_url,
      Date.now()
    ).run();
  }
}`}</CodeBlock>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Article Deduplication</h2>
            <p className="mt-3 text-sm text-white/70">
              The same story often appears across multiple outlets. Deduplication prevents showing
              duplicate content to users.
            </p>

            <div className="mt-4">
              <h3 className="font-semibold">URL-Based Deduplication</h3>
              <div className="mt-3">
                <CodeBlock language="javascript">{`// Simple URL normalization
function normalizeUrl(url) {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/www\./, '')
    .replace(/#.*/, '');
}

// Check for duplicates before inserting
async function findDuplicateByUrl(db, url) {
  const normalized = normalizeUrl(url);
  return await db.prepare(\`
    SELECT id FROM articles WHERE normalize_url(url) = ?
  \`).bind(normalized).first();
}`}</CodeBlock>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold">Content-Based Similarity</h3>
              <p className="mt-2 text-xs text-white/60">
                For stories with different URLs, use content similarity. This is more complex but
                catches syndicated content.
              </p>
              <div className="mt-3">
                <CodeBlock language="javascript">{`// Generate a simple content signature
function generateContentSignature(title, summary) {
  const words = (title + ' ' + summary)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .sort();

  // Create hash from sorted unique words
  return crypto.createHash('md5')
    .update(words.join(' '))
    .digest('hex');
}

// Find similar articles
async function findSimilarArticles(db, title, summary) {
  const signature = generateContentSignature(title, summary);
  return await db.prepare(\`
    SELECT a.*, c.signature
    FROM articles a
    LEFT JOIN article_clusters c ON a.id = c.canonical_article_id
    WHERE c.signature = ?
  \`).bind(signature).all();
}`}</CodeBlock>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Setting Up Scheduled Monitoring</h2>
            <p className="mt-3 text-sm text-white/70">
              News moves fast. Set up schedules to monitor sources frequently and receive content
              via webhooks.
            </p>

            <div className="mt-4">
              <CodeBlock language="javascript">{`// Create a monitoring schedule for each source
const sources = [
  { name: 'TechCrunch', url: 'https://techcrunch.com', categoryUrl: 'https://techcrunch.com/category/artificial-intelligence/' },
  { name: 'The Verge', url: 'https://theverge.com', categoryUrl: 'https://theverge.com/tech' },
  { name: 'Ars Technica', url: 'https://arstechnica.com', categoryUrl: 'https://arstechnica.com/gadgets/' }
];

for (const source of sources) {
  await fetch('https://api.robotscraping.com/schedules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.API_KEY
    },
    body: JSON.stringify({
      name: 'news-' + source.name.toLowerCase(),
      cron: '0 */2 * * *', // Every 2 hours
      urls: [source.categoryUrl],
      config: {
        fields: ['headlines'],
        instructions: 'Extract headlines from ' + source.name + '. Return title, URL, date, and summary.',
        options: {
          waitUntil: 'domcontentloaded'
        }
      },
      webhook_url: 'https://your-app.com/webhook/news/' + source.name
    })
  });
}`}</CodeBlock>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold">Webhook Handler</h3>
              <div className="mt-3">
                <CodeBlock language="javascript">{`app.post('/webhook/news/:source', async (req, res) => {
  const { source } = req.params;
  const { result } = req.body;

  // Verify webhook signature
  const signature = req.headers['x-webhook-signature'];
  if (!verifySignature(signature, req.body, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Get source ID
  const sourceRecord = await getSourceByName(source);
  if (!sourceRecord) {
    return res.status(404).send('Source not found');
  }

  // Process headlines
  const { headlines } = result;
  for (const headline of headlines) {
    // Check for duplicates
    const existing = await findDuplicateByUrl(db, headline.url);
    if (existing) continue;

    // Queue full article fetch
    await queueArticleFetch(sourceRecord.id, headline.url);
  }

  res.sendStatus(200);
});`}</CodeBlock>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Legal and Ethical Considerations</h2>
            <p className="mt-3 text-sm text-white/70">
              News aggregation has specific legal considerations that differ from other types of
              scraping:
            </p>

            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Copyright:</strong> Full article content may be
                  protected. Consider using headlines, summaries, and linking to original sources
                  rather than reproducing entire articles.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Terms of Service:</strong> Many news sites
                  explicitly prohibit scraping in their ToS. Review and respect these terms.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Attribution:</strong> Always clearly attribute
                  content to the original source. Link back to the original article.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Paywalls:</strong> Respect paywall restrictions.
                  Don't circumvent access controls for gated content.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Robots.txt:</strong> Check and respect robots.txt
                  directives for each source.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-neon">-</span>
                <span>
                  <strong className="text-white">Hotlinking:</strong> Don't hotlink images from news
                  sites. Download and host images yourself or use thumbnails that link to the
                  original.
                </span>
              </li>
            </ul>

            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <h4 className="font-semibold text-amber-400">Best Practice: Fair Use</h4>
              <p className="mt-2 text-xs text-white/70">
                Aggregate headlines and brief excerpts (typically 1-2 sentences) with clear
                attribution and links to the original source. This approach is more likely to
                qualify as fair use and provides value by organizing and filtering content rather
                than reproducing it.
              </p>
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold">Using RobotScraping.com for News Aggregation</h2>
            <p className="mt-3 text-sm text-white/70">
              RobotScraping.com simplifies news aggregation with AI-powered extraction that handles
              different site layouts automatically.
            </p>

            <div className="mt-4">
              <CodeBlock language="javascript">{`// Complete news aggregation workflow
const newsSources = [
  'https://techcrunch.com/feed/',
  'https://www.theverge.com/rss/index.xml',
  'https://arstechnica.com/feed/'
];

// Create schedules for each source
for (const source of newsSources) {
  await fetch('https://api.robotscraping.com/schedules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.API_KEY
    },
    body: JSON.stringify({
      name: 'news-' + new URL(source).hostname,
      cron: '0 */1 * * *', // Every hour
      urls: [source],
      config: {
        fields: ['title', 'link', 'description', 'pubDate', 'creator', 'categories'],
        options: {
          timeoutMs: 15000
        }
      },
      webhook_url: 'https://your-app.com/webhook/news'
    })
  });
}`}</CodeBlock>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-block rounded-xl border border-neon/50 bg-neon/10 px-8 py-3 text-sm uppercase tracking-wider text-neon transition hover:bg-neon/20 focus:outline-none focus:ring-2 focus:ring-neon/50"
              >
                Start Building Your News Aggregator
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
                  Learn advanced AI extraction techniques.
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
