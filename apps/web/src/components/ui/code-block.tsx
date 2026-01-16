'use client';

import { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  children: string;
  className?: string;
  language?: string;
}

export function CodeBlock({ children, className = '', language = 'bash' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail if clipboard is not available
    }
  }, [children]);

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg border border-white/20 bg-black/80 px-3 py-1.5 text-xs text-white/70 hover:border-neon/60 hover:text-neon focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-neon/50"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 inline mr-1" aria-hidden="true" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 inline mr-1" aria-hidden="true" />
            Copy
          </>
        )}
      </button>
      <pre
        className={`whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs ${language === 'python' || language === 'javascript' ? 'text-white/90' : 'text-neon/80'} ${className}`}
        tabIndex={0}
      >
        {children}
      </pre>
    </div>
  );
}
