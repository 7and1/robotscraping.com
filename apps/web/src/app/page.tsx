'use client';

import { useState } from 'react';
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

const ResultComparison = dynamic(
  () => import('../components/playground').then((m) => m.ResultComparison),
  {
    loading: () => (
      <div className="glass rounded-2xl p-8 flex items-center justify-center min-h-[360px]">
        <div className="animate-pulse text-white/50">Loading comparison...</div>
      </div>
    ),
    ssr: false,
  },
);

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
          href="/guides"
        >
          Guides
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
          href="/login"
        >
          Login
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
  const [useComparisonView, setUseComparisonView] = useState(false);

  return (
    <section id="playground" className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <PlaygroundForm extraction={extraction} />
      {useComparisonView ? (
        <ResultComparison result={extraction.result} originalContent={extraction.originalContent} />
      ) : (
        <OutputPanel result={extraction.result} />
      )}
      {extraction.result && (
        <div className="lg:col-span-2 flex justify-center">
          <button
            onClick={() => setUseComparisonView(!useComparisonView)}
            className="px-4 py-2 text-xs rounded-lg border border-white/20 bg-white/5 text-white/70 hover:bg-white/10 hover:border-neon/60 hover:text-neon transition focus:outline-none focus:ring-2 focus:ring-neon/50"
          >
            {useComparisonView ? 'Switch to normal view' : 'Switch to comparison view'}
          </button>
        </div>
      )}
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
