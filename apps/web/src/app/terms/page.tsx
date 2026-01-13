import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | RobotScraping.com',
  description:
    'Terms of service for RobotScraping.com AI web scraping API. Learn about acceptable use, rate limits, prohibited uses, and your responsibilities.',
  alternates: {
    canonical: 'https://robotscraping.com/terms',
  },
  openGraph: {
    title: 'Terms of Service | RobotScraping.com',
    description:
      'Terms of service for RobotScraping.com AI web scraping API. Read about acceptable use and responsibilities.',
    url: 'https://robotscraping.com/terms',
    siteName: 'RobotScraping.com',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Legal</p>
            <h1 className="mt-3 text-3xl font-semibold">Terms of Service</h1>
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
            <h2 className="text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using RobotScraping.com (&quot;Service&quot;), you agree to be bound
              by these Terms of Service. If you do not agree, please do not use our Service.
            </p>

            <h2 className="text-lg font-semibold text-white">2. Service Description</h2>
            <p>
              RobotScraping.com provides an AI-powered web scraping API that extracts structured
              data from websites. The service is offered on a tiered basis with free and paid
              options.
            </p>

            <h2 className="text-lg font-semibold text-white">3. User Responsibilities</h2>
            <p>As a user, you agree to:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Comply with all applicable laws and regulations</li>
              <li>Respect robots.txt and website terms of service</li>
              <li>Not use the service for illegal purposes</li>
              <li>Not scrape personal data without proper legal basis</li>
              <li>Implement appropriate rate limiting</li>
              <li>Keep your API keys secure and confidential</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">4. Prohibited Uses</h2>
            <p>You may not use the Service to:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Scrape copyrighted content without permission</li>
              <li>Harvest personal information for spam or discrimination</li>
              <li>Circumvent authentication or access controls</li>
              <li>Compete directly with the target website&apos;s core business</li>
              <li>Overwhelm target servers with excessive requests</li>
            </ul>

            <h2 className="text-lg font-semibold text-white">5. Payment and Billing</h2>
            <p>
              Paid tiers are billed monthly. Fees are non-refundable except as required by law. We
              reserve the right to change pricing with 30 days notice.
            </p>

            <h2 className="text-lg font-semibold text-white">6. Rate Limits and Fair Use</h2>
            <p>
              Each tier has specified rate limits. Exceeding these limits may result in temporary
              throttling or account suspension. Fair use policies apply to prevent abuse.
            </p>

            <h2 className="text-lg font-semibold text-white">7. Service Availability</h2>
            <p>
              We strive for high availability but do not guarantee uninterrupted service. Target
              websites may block scraping at any time, and we are not responsible for such
              interruptions.
            </p>

            <h2 className="text-lg font-semibold text-white">8. Data and Content</h2>
            <p>
              You retain ownership of data you extract. However, you are solely responsible for how
              you use that data. We are not responsible for the legality or accuracy of extracted
              content.
            </p>

            <h2 className="text-lg font-semibold text-white">9. Termination</h2>
            <p>
              We may suspend or terminate your account for violation of these terms, abusive
              behavior, or at our sole discretion with notice.
            </p>

            <h2 className="text-lg font-semibold text-white">10. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
              IMPLIED. WE DO NOT GUARANTEE DATA ACCURACY OR EXTRACTION SUCCESS.
            </p>

            <h2 className="text-lg font-semibold text-white">11. Limitation of Liability</h2>
            <p>
              Our liability is limited to the amount you paid in the past 12 months. We are not
              liable for indirect, incidental, or consequential damages.
            </p>

            <h2 className="text-lg font-semibold text-white">12. Governing Law</h2>
            <p>These terms are governed by the laws of the jurisdiction in which we operate.</p>

            <h2 className="text-lg font-semibold text-white">13. Changes to Terms</h2>
            <p>
              We may update these terms at any time. Continued use of the Service constitutes
              acceptance of modified terms.
            </p>

            <h2 className="text-lg font-semibold text-white">14. Contact</h2>
            <p>
              For questions about these terms, contact us at{' '}
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
