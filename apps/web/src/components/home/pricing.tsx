import Link from 'next/link';

export function Pricing() {
  return (
    <div id="pricing" className="glass rounded-2xl p-8">
      <h2 className="mb-4 text-2xl font-semibold">Pricing</h2>
      <p className="mb-6 text-sm text-white/60">
        Simple, transparent pricing for AI-powered web scraping. Start free, scale as you grow.
      </p>
      <div className="space-y-5 text-sm text-white/70">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-white">Free</p>
            <p>5 requests / day · GPT-4o-mini · Community support</p>
          </div>
          <span className="text-neon">$0</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-neon/30 bg-white/5 p-4">
          <div>
            <p className="text-lg font-semibold text-white">Pro</p>
            <p>1,000 requests / day · Claude Haiku · Priority support</p>
          </div>
          <span className="text-neon">$29/mo</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-white">Enterprise</p>
            <p>Unlimited volume · Custom LLMs · Dedicated support · SLA</p>
          </div>
          <Link href="mailto:hello@robotscraping.com" className="text-neon hover:underline">
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}
