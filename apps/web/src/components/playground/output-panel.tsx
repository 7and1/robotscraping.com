'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Check, Copy, Download } from 'lucide-react';

interface OutputPanelProps {
  result: string;
}

export function OutputPanel({ result }: OutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = useCallback(async () => {
    if (!result || result.startsWith('//')) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail if clipboard is not available
    }
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!result || result.startsWith('//')) return;
    const blob = new Blob([result], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extraction-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [result]);

  // Handle keyboard copy (Ctrl/Cmd + C)
  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }
    };

    pre.addEventListener('keydown', handleKeyDown);
    return () => pre.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy]);

  const hasContent = result && !result.startsWith('//');
  const isEmpty = !result || result.startsWith('//');

  return (
    <div className="glass rounded-2xl p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Output stream</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={!hasContent}
            aria-label="Download output as JSON"
            className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-white/70 transition hover:border-neon/70 hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download
          </button>
          <button
            onClick={handleCopy}
            disabled={!hasContent}
            aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
            className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-white/70 transition hover:border-neon/70 hover:text-neon focus:outline-none focus:ring-2 focus:ring-neon/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div
        className="relative min-h-[360px] rounded-xl border border-white/10 bg-black/60"
        role="region"
        aria-label="Extraction output"
        aria-live="polite"
      >
        <pre
          ref={preRef}
          className="max-h-[500px] overflow-auto rounded-xl p-4 font-mono text-xs text-neon/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-neon/30"
          tabIndex={0}
          aria-label="JSON output content. Press Ctrl+C to copy."
        >
          {isEmpty ? (
            <span className="text-white/30">// Waiting for extraction signal...</span>
          ) : (
            result
          )}
        </pre>
      </div>
      {result && !result.startsWith('//') && (
        <p className="mt-2 text-xs text-white/50">
          Press Ctrl+C to copy when focused. Use the buttons above for quick actions.
        </p>
      )}
    </div>
  );
}
