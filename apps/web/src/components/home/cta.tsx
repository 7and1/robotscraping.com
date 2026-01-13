import { Check } from 'lucide-react';

export function Cta() {
  const features = ['Cloudflare Workers', 'D1 Logs', 'R2 Snapshots', 'Queue Ready'];

  return (
    <section className="glass rounded-2xl p-10 text-center">
      <h2 className="mb-4 text-3xl font-semibold">Ready to ship extraction at scale?</h2>
      <p className="mb-8 text-white/70">
        Deploy the Worker on Cloudflare, hook your product to the API, and stop babysitting
        selectors.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        {features.map((item) => (
          <div
            key={item}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs"
          >
            <Check className="h-3 w-3 text-neon" aria-hidden="true" />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
