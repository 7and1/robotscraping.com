import puppeteer from '@cloudflare/puppeteer';
import type { ScrapeResult } from '../types';

export interface ScrapeOptions {
  waitUntil: 'domcontentloaded' | 'networkidle0';
  timeoutMs: number;
  screenshot: boolean;
  maxContentChars: number;
}

const BLOCKED_PATTERNS = [
  /captcha/i,
  /verify you are human/i,
  /access denied/i,
  /unusual traffic/i,
  /temporarily unavailable/i,
  /robot check/i,
];

export async function scrapePage(
  browserBinding: unknown,
  targetUrl: string,
  options: ScrapeOptions,
): Promise<ScrapeResult> {
  const browser = await puppeteer.launch(browserBinding as never);
  let page: puppeteer.Page | null = null;

  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'media', 'font'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.goto(targetUrl, { waitUntil: options.waitUntil, timeout: options.timeoutMs });

    const result = await page.evaluate(
      (maxChars: number, patterns: string[]) => {
        const regexes = patterns.map((pattern) => new RegExp(pattern, 'i'));
        const bodyText = document.body?.innerText || '';
        const blocked =
          regexes.some((regex) => regex.test(bodyText)) ||
          regexes.some((regex) => regex.test(document.title || ''));

        document
          .querySelectorAll('script, style, svg, noscript, iframe, canvas')
          .forEach((el) => el.remove());

        const root =
          document.querySelector('main, article, [role="main"], #content, #main, .content') ||
          document.body;

        const cleanText = (text?: string | null) =>
          (text || '')
            .replace(/\s+/g, ' ')
            .replace(/\u00a0/g, ' ')
            .trim();

        const title = cleanText(document.title);
        const description = cleanText(
          document.querySelector('meta[name="description"]')?.getAttribute('content'),
        );

        const headings = Array.from(root.querySelectorAll('h1, h2, h3'))
          .slice(0, 20)
          .map((el) => cleanText(el.textContent))
          .filter(Boolean)
          .map((text) => `## ${text}`);

        const listItems = Array.from(root.querySelectorAll('li'))
          .slice(0, 40)
          .map((el) => cleanText(el.textContent))
          .filter(Boolean)
          .map((text) => `- ${text}`);

        const tableBlocks = Array.from(root.querySelectorAll('table'))
          .slice(0, 3)
          .map((table) => {
            const rows = Array.from(table.querySelectorAll('tr'))
              .slice(0, 10)
              .map((row) =>
                Array.from(row.querySelectorAll('th, td'))
                  .map((cell) => cleanText(cell.textContent))
                  .filter(Boolean)
                  .join(' | '),
              )
              .filter(Boolean);
            if (rows.length === 0) return '';
            return rows.join('\n');
          })
          .filter(Boolean)
          .map((table) => `TABLE:\n${table}`);

        const mainText = cleanText(root?.innerText || '');

        const blocks = [
          title ? `# ${title}` : '',
          description ? `## Description\n${description}` : '',
          headings.join('\n'),
          mainText,
          listItems.join('\n'),
          tableBlocks.join('\n\n'),
        ].filter(Boolean);

        const content = blocks.join('\n\n').slice(0, maxChars);

        return {
          content,
          title,
          description,
          blocked,
        };
      },
      options.maxContentChars,
      BLOCKED_PATTERNS.map((pattern) => pattern.source),
    );

    const screenshot = options.screenshot
      ? ((await page.screenshot({ type: 'webp', quality: 55 })) as ArrayBuffer)
      : undefined;

    return {
      content: result.content || '',
      title: result.title || null,
      description: result.description || null,
      blocked: Boolean(result.blocked),
      screenshot,
      screenshotType: screenshot ? 'image/webp' : undefined,
    };
  } finally {
    if (page) {
      await page.close();
    }
    await browser.close();
  }
}
