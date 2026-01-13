'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Hero, Features, TrustIndicators, Pipeline, Pricing, Cta } from '../components/home';
import { Footer } from '../components/footer';
import { useExtraction } from '../hooks/use-extraction';

const PlaygroundForm = dynamic(
  () => import('../components/playground').then((m) => m.PlaygroundForm),
  {
    loading: () => (
      <div className="glass rounded-2xl p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-white/50">Loading playground...</div>
      </div>
    ),
    ssr: false,
  },
);

const OutputPanel = dynamic(() => import('../components/playground').then((m) => m.OutputPanel), {
  loading: () => (
    <div className="glass rounded-2xl p-8 flex items-center justify-center min-h-[360px]">
      <div className="animate-pulse text-white/50">Loading output...</div>
    </div>
  ),
  ssr: false,
});

function Navbar() {
  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-4 text-sm"
      aria-label="Main navigation"
    >
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/60">
        <span className="h-2 w-2 rounded-full bg-neon animate-pulse" aria-hidden="true" />
        RobotScraping.com
      </div>
      <nav
        className="flex items-center gap-6 text-xs uppercase tracking-[0.25em] text-white/60"
        aria-label="Page navigation"
      >
        <Link
          className="transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
          href="/jobs"
        >
          Jobs
        </Link>
        <Link
          className="transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
          href="/docs"
        >
          Docs
        </Link>
        <Link
          className="transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
          href="/usage"
        >
          Usage
        </Link>
        <Link
          className="transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
          href="/schedules"
        >
          Schedules
        </Link>
        <a
          className="transition hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 rounded"
          href="#playground"
        >
          Playground
        </a>
      </nav>
    </nav>
  );
}

function Playground() {
  const extraction = useExtraction();

  return (
    <section id="playground" className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <PlaygroundForm extraction={extraction} />
      <OutputPanel result={extraction.result} />
    </section>
  );
}

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen bg-hero-gradient bg-grid px-6 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-16">
        <Navbar />
        <Hero />
        <Features />
        <TrustIndicators />
        <section className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <Pipeline />
          <Pricing />
        </section>
        <Playground />
        <Cta />
        <Footer />
      </div>
    </main>
  );
}
