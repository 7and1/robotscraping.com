import { Cpu, Radar, Sparkles, Zap, Shield, Clock } from 'lucide-react';

const features = [
  {
    icon: <Sparkles className="h-6 w-6 text-neon" aria-hidden="true" />,
    title: 'Zero-maintenance extraction',
    description:
      'AI reads the rendered page like a human. Layout changes are no longer fatal. No CSS selectors to maintain.',
  },
  {
    icon: <Cpu className="h-6 w-6 text-cyan" aria-hidden="true" />,
    title: 'Cloudflare-native speed',
    description:
      'Workers + Browser Rendering keep latency low and scale on-demand. Sub-second extraction for most pages.',
  },
  {
    icon: <Radar className="h-6 w-6 text-laser" aria-hidden="true" />,
    title: 'Audit-ready logs',
    description:
      'Snapshots, token usage, and trace IDs are stored in D1 + R2 automatically. Full compliance with data regulations.',
  },
  {
    icon: <Zap className="h-6 w-6 text-neon" aria-hidden="true" />,
    title: 'JavaScript rendering',
    description:
      'Handles SPAs, React apps, Vue sites, and any dynamic content. Cloudflare Browser Rendering executes client-side code.',
  },
  {
    icon: <Shield className="h-6 w-6 text-cyan" aria-hidden="true" />,
    title: 'Enterprise security',
    description:
      'HMAC-signed webhooks, API key authentication, rate limiting with D1, and full request/response logging.',
  },
  {
    icon: <Clock className="h-6 w-6 text-laser" aria-hidden="true" />,
    title: 'Scheduled scraping',
    description:
      'Cron-based recurring extractions with webhook delivery. Monitor prices, track inventory, or aggregate content.',
  },
];

export function Features() {
  return (
    <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Features">
      {features.map((item) => (
        <article key={item.title} className="glass rounded-2xl p-6">
          <div className="mb-4 inline-flex rounded-full bg-white/5 p-3" aria-hidden="true">
            {item.icon}
          </div>
          <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
          <p className="text-sm text-white/70">{item.description}</p>
        </article>
      ))}
    </section>
  );
}
