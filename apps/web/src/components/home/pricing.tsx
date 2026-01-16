import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import clsx from 'clsx';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    description: 'Anonymous access for quick tests.',
    limit: '5 requests / day',
    cta: 'Try the playground',
    href: '/#playground',
    features: ['Browser rendering', 'LLM extraction', 'Community support'],
    highlight: false,
  },
  {
    name: 'GitHub',
    price: '$0',
    description: 'Sign in to unlock higher daily limits.',
    limit: '50 requests / day',
    cta: 'Sign in with GitHub',
    href: '/login',
    features: ['Personal API key', 'Usage dashboard', 'Priority reliability'],
    highlight: true,
  },
  {
    name: 'Pro (Wish List)',
    price: 'Custom',
    description: 'Paid plan coming soon. Join the waitlist.',
    limit: 'Custom daily volume',
    cta: 'Join the wish list',
    href: 'mailto:hello@robotscraping.com?subject=RobotScraping%20Pro%20Waitlist',
    features: ['Higher limits', 'Custom models', 'Dedicated support'],
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="glass rounded-2xl p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Pricing</h2>
          <p className="mt-2 text-sm text-white/60">
            Start free. Sign in with GitHub for 10x more daily requests. Paid plans are waitlist
            only (no Stripe yet).
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
          <Sparkles className="h-4 w-4 text-neon" />
          Daily quotas
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={clsx(
              'rounded-2xl border border-white/10 bg-black/40 p-6 transition',
              tier.highlight && 'border-neon/50 shadow-neon',
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
              {tier.highlight && (
                <span className="rounded-full border border-neon/60 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-neon">
                  Recommended
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-white/60">{tier.description}</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-3xl font-semibold text-white">{tier.price}</span>
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">/ day</span>
            </div>
            <p className="mt-2 text-xs text-white/50">{tier.limit}</p>

            <Link
              href={tier.href as any}
              className={clsx(
                'mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-xs uppercase tracking-[0.25em] transition',
                tier.highlight
                  ? 'bg-neon text-black hover:-translate-y-0.5'
                  : 'border border-white/20 text-white/70 hover:border-neon/60 hover:text-neon',
              )}
            >
              {tier.cta}
            </Link>

            <ul className="mt-6 space-y-2 text-xs text-white/70">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-neon" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
