export function Pipeline() {
  return (
    <div className="glass scanline rounded-2xl p-8">
      <h2 className="mb-4 text-2xl font-semibold">Extraction pipeline</h2>
      <ol className="space-y-4 text-sm text-white/70">
        <li className="flex gap-3">
          <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-neon/40 text-xs text-neon">
            1
          </span>
          Render the target URL with Browser Rendering (Puppeteer), block heavy assets, and distill
          the main content.
        </li>
        <li className="flex gap-3">
          <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-neon/40 text-xs text-neon">
            2
          </span>
          Send condensed content into GPT-4o-mini or Claude Haiku with strict JSON output rules.
        </li>
        <li className="flex gap-3">
          <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-neon/40 text-xs text-neon">
            3
          </span>
          Return structured data instantly, then store snapshots + logs in D1 and R2 for audit.
        </li>
      </ol>
      <div className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-neon/80">
        <div>POST /extract</div>
        <div>{`{ "url": "https://...", "fields": ["price", "title"] }`}</div>
        <div className="text-white/50">→ JSON response in &lt; 5s</div>
      </div>
    </div>
  );
}
