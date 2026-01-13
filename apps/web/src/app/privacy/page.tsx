import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | RobotScraping.com',
  description:
    'Learn how RobotScraping.com collects, uses, and protects your data. Our privacy policy covers data collection, storage, retention, and your rights.',
  alternates: {
    canonical: 'https://robotscraping.com/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | RobotScraping.com',
    description:
      'Learn how RobotScraping.com collects, uses, and protects your data. Read our comprehensive privacy policy.',
    url: 'https://robotscraping.com/privacy',
    siteName: 'RobotScraping.com',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Legal</p>
            <h1 className="mt-3 text-3xl font-semibold">Privacy Policy</h1>
            <p className="mt-2 text-sm text-white/60">Last updated: January 2025</p>
          </div>
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.25em] text-white/60 transition hover:text-neon"
          >
            Back to home
          </Link>
        </header>

        <section className="glass rounded-2xl p-6">
          <div className="space-y-6 text-sm text-white/80">
            <h2 className="text-lg font-semibold text-white">1. Information We Collect</h2>
            <p>
              RobotScraping.com collects information necessary to provide our web scraping API
              service. This includes:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Account information (email address, API keys)</li>
              <li>Usage data (request logs, token usage, latency metrics)</li>
              <li>Technical data (IP addresses, user agents, request headers)</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Provide and improve our API services</li>
              <li>Monitor usage and prevent abuse</li>
              <li>Communicate about service updates</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">3. Data Storage and Retention</h2>
            <p>
              Extraction results are stored temporarily based on your service tier. Free tier data
              may be retained for up to 7 days. Pro tier data retention extends to 30 days. Usage
              logs are retained for billing and compliance purposes.
            </p>

            <h2 className="text-lg font-semibold text-white">4. Data Sharing</h2>
            <p>We do not sell your data. We may share data with:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Subprocessors who assist in service delivery (e.g., Cloudflare)</li>
              <li>Legal authorities when required by law</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">5. Security</h2>
            <p>
              We implement industry-standard security measures including encryption, secure API key
              storage, and access controls. All data in transit is protected using TLS.
            </p>

            <h2 className="text-lg font-semibold text-white">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Access your personal data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your usage data</li>
              <li>Opt-out of marketing communications</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">7. Compliance</h2>
            <p>
              Users are responsible for ensuring their scraping activities comply with applicable
              laws including GDPR, CCPA, and website terms of service. RobotScraping.com does not
              guarantee the legality of any specific scraping activity.
            </p>

            <h2 className="text-lg font-semibold text-white">8. Contact</h2>
            <p>
              For privacy inquiries, contact us at{' '}
              <a href="mailto:hello@robotscraping.com" className="text-neon hover:underline">
                hello@robotscraping.com
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
