import { Globe, Shield, Zap, Database } from 'lucide-react';

const trustIndicators = [
  {
    icon: <Shield className="h-5 w-5 text-neon" aria-hidden="true" />,
    title: 'Security-first',
    description:
      'Audit-ready logs, HMAC-signed webhooks, API key authentication, and D1-based rate limiting.',
  },
  {
    icon: <Zap className="h-5 w-5 text-cyan" aria-hidden="true" />,
    title: 'Edge scale',
    description:
      'Runs on Cloudflare Workers edge network with Browser Rendering for fast global response times.',
  },
  {
    icon: <Globe className="h-5 w-5 text-laser" aria-hidden="true" />,
    title: 'Global reach',
    description:
      'Scrape websites from any region with Cloudflare Browser Rendering executing near the target.',
  },
  {
    icon: <Database className="h-5 w-5 text-neon" aria-hidden="true" />,
    title: 'Built-in storage',
    description:
      'D1 database for job logs and R2 for page snapshots. Full audit trail with CSV export.',
  },
];

export function TrustIndicators() {
  return (
    <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" aria-label="Trust indicators">
      {trustIndicators.map((item) => (
        <div
          key={item.title}
          className="flex flex-col items-center rounded-xl border border-white/10 bg-black/20 p-6 text-center"
        >
          <div className="mb-3" aria-hidden="true">
            {item.icon}
          </div>
          <h3 className="mb-1 text-sm font-semibold">{item.title}</h3>
          <p className="text-xs text-white/50">{item.description}</p>
        </div>
      ))}
    </section>
  );
}
