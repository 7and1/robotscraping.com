import Link from 'next/link';
import { Radar } from 'lucide-react';

export function Hero() {
  return (
    <header className="flex flex-col gap-6">
      <div className="inline-flex items-center gap-3 rounded-full border border-neon/30 bg-slate/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-neon">
        <Radar className="h-4 w-4" aria-hidden="true" />
        AI-Powered Universal Extractor
      </div>
      <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
        Turn any website into a <span className="text-neon">JSON API</span> in seconds.
      </h1>
      <p className="max-w-2xl text-lg text-white/70">
        RobotScraping.com renders full pages in Cloudflare Browser Rendering, extracts structured
        data with modern LLMs (GPT-4o-mini, Claude Haiku), and logs everything into D1 + R2. No
        selectors. No brittle scripts. Just URLs and clean JSON.
      </p>
      <div className="flex flex-wrap gap-4">
        <button
          className="rounded-full bg-neon px-6 py-3 text-sm font-semibold text-black shadow-glow transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-neon/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0e]"
          onClick={() =>
            document.getElementById('playground')?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          Launch Playground
        </button>
        <Link
          href="/docs"
          className="rounded-full border border-white/30 px-6 py-3 text-sm text-white/80 transition hover:border-neon/60 hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0e]"
        >
          Read Documentation
        </Link>
      </div>
    </header>
  );
}
