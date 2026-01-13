import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-12 mt-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="font-semibold mb-4 text-sm">Product</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <Link href="/docs" className="hover:text-neon">
                  API Documentation
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-neon">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/#playground" className="hover:text-neon">
                  Playground
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-sm">Features</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <Link href="/docs#async" className="hover:text-neon">
                  Async Jobs
                </Link>
              </li>
              <li>
                <Link href="/docs#schedules" className="hover:text-neon">
                  Scheduled Scraping
                </Link>
              </li>
              <li>
                <Link href="/docs#webhooks" className="hover:text-neon">
                  Webhooks
                </Link>
              </li>
              <li>
                <Link href="/docs#javascript-rendering" className="hover:text-neon">
                  JavaScript Rendering
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-sm">Legal</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <Link href="/privacy" className="hover:text-neon">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-neon">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-sm">Company</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <a href="mailto:hello@robotscraping.com" className="hover:text-neon">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap justify-between items-center gap-4 text-sm text-white/40">
          <p>© {new Date().getFullYear()} RobotScraping.com — AI Web Scraping API</p>
          <p className="text-xs">Built with Cloudflare Workers · Browser Rendering · D1 · R2</p>
        </div>
      </div>
    </footer>
  );
}
