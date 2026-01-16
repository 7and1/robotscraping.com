'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search, FileCode, Database, CheckCircle2 } from 'lucide-react';

interface ResultComparisonProps {
  result: string;
  originalContent?: string;
  fields?: string[];
}

interface HighlightMatch {
  text: string;
  isMatch: boolean;
  field?: string;
}

type ViewMode = 'normal' | 'comparison';

export function ResultComparison({ result, originalContent, fields = [] }: ResultComparisonProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('comparison');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['extracted']));
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  const parsedResult = useMemo(() => {
    try {
      return JSON.parse(result);
    } catch {
      return null;
    }
  }, [result]);

  const extractFields = useMemo(() => {
    if (!parsedResult?.data) return {};
    return parsedResult.data;
  }, [parsedResult]);

  const highlightMatches = useMemo(() => {
    if (!originalContent || !searchQuery) return [];
    const matches: HighlightMatch[] = [];
    const specialChars = /[.*+?^()|[\]\\]/g;
    const escaped = searchQuery.replace(specialChars, '\\$&');
    const pattern = '(' + escaped + ')';
    const regex = new RegExp(pattern, 'gi');
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(originalContent)) !== null) {
      if (match.index > lastIndex) {
        matches.push({ text: originalContent.slice(lastIndex, match.index), isMatch: false });
      }
      matches.push({ text: match[0], isMatch: true, field: searchQuery });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < originalContent.length) {
      matches.push({ text: originalContent.slice(lastIndex), isMatch: false });
    }
    return matches;
  }, [originalContent, searchQuery]);

  const findFieldInContent = (fieldName: string, fieldValue: unknown): string | null => {
    if (!originalContent || !fieldValue) return null;
    const valueStr = String(fieldValue);
    if (valueStr.length < 3) return null;

    const specialChars = /[.*+?^()|[\]\\]/g;
    const escapedValue = valueStr.replace(specialChars, '\\$&');
    const sliceLength = Math.min(50, escapedValue.length);
    const regex = new RegExp(escapedValue.slice(0, sliceLength), 'i');
    const match = originalContent.match(regex);
    return match ? match[0] : null;
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const renderExtractedData = () => {
    if (!parsedResult?.data) {
      return (
        <div className="text-white/50 text-sm p-4">
          No extracted data available. Make sure the extraction was successful.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {Object.entries(extractFields).map(([key, value]) => {
          const contentMatch = findFieldInContent(key, value);
          const isHighlighted = highlightedField === key;

          return (
            <div
              key={key}
              className={
                'rounded-lg border transition-all cursor-pointer ' +
                (isHighlighted
                  ? 'border-neon bg-neon/10'
                  : 'border-white/10 bg-black/40 hover:border-white/20')
              }
              onClick={() => setHighlightedField(isHighlighted ? null : key)}
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <span className="text-neon font-mono text-sm">{key}</span>
                  {contentMatch && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Found in source
                    </span>
                  )}
                </div>
                <span className="text-white/50 text-xs">
                  {value === null
                    ? 'null'
                    : typeof value === 'object'
                      ? '[object]'
                      : String(value).slice(0, 30)}
                  {typeof value === 'string' && value.length > 30 ? '...' : ''}
                </span>
              </div>
              {isHighlighted && (
                <div className="border-t border-white/10 p-3 bg-black/60">
                  <p className="text-xs text-white/40 mb-1">Full value:</p>
                  <pre className="text-xs text-neon/80 whitespace-pre-wrap break-all">
                    {value === null
                      ? 'null'
                      : typeof value === 'object'
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                  </pre>
                  {contentMatch && (
                    <div className="mt-2">
                      <p className="text-xs text-white/40 mb-1">Match in original content:</p>
                      <p className="text-xs text-green-400/80 bg-green-400/10 rounded p-2">
                        {contentMatch}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderOriginalContent = () => {
    if (!originalContent) {
      return (
        <div className="text-white/50 text-sm p-4">
          Original content not available. Enable 'Store distilled content' to see the source.
        </div>
      );
    }

    const contentToDisplay = searchQuery
      ? highlightMatches
      : [{ text: originalContent, isMatch: false }];

    return (
      <div className="relative">
        <pre className="text-xs text-white/70 whitespace-pre-wrap break-all font-mono p-4 max-h-[400px] overflow-auto">
          {contentToDisplay.map((chunk, idx) => (
            <span key={idx} className={chunk.isMatch ? 'bg-neon/30 text-neon rounded px-0.5' : ''}>
              {chunk.text}
            </span>
          ))}
        </pre>
      </div>
    );
  };

  return (
    <div className="glass rounded-2xl p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Result comparison</h3>
          <p className="text-sm text-white/60">Compare extracted data with original content</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('normal')}
            className={
              'px-3 py-1.5 text-xs rounded-lg transition ' +
              (viewMode === 'normal'
                ? 'bg-neon text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10')
            }
          >
            Normal view
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            className={
              'px-3 py-1.5 text-xs rounded-lg transition ' +
              (viewMode === 'comparison'
                ? 'bg-neon text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10')
            }
          >
            Comparison view
          </button>
        </div>
      </div>

      {viewMode === 'normal' ? (
        <div className="rounded-xl border border-white/10 bg-black/60 p-4">
          <pre className="text-xs text-neon/80 whitespace-pre-wrap break-all font-mono max-h-[500px] overflow-auto">
            {result || '// No result yet'}
          </pre>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
            <Search className="h-4 w-4 text-white/50" />
            <input
              type="text"
              placeholder="Search in original content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
              <button
                onClick={() => toggleSection('original')}
                className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-neon" />
                  <span className="text-sm font-medium text-white/80">Original content</span>
                </div>
                {expandedSections.has('original') ? (
                  <ChevronDown className="h-4 w-4 text-white/50" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-white/50" />
                )}
              </button>
              {expandedSections.has('original') && (
                <div className="p-4 border-t border-white/10 max-h-[400px] overflow-auto">
                  {renderOriginalContent()}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
              <button
                onClick={() => toggleSection('extracted')}
                className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition"
              >
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-neon" />
                  <span className="text-sm font-medium text-white/80">Extracted data</span>
                </div>
                {expandedSections.has('extracted') ? (
                  <ChevronDown className="h-4 w-4 text-white/50" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-white/50" />
                )}
              </button>
              {expandedSections.has('extracted') && (
                <div className="p-4 border-t border-white/10 max-h-[400px] overflow-auto">
                  {renderExtractedData()}
                </div>
              )}
            </div>
          </div>

          {parsedResult?.meta && (
            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
              <p className="text-xs text-white/50">
                <span className="text-neon">Metadata:</span> Tokens:{' '}
                {parsedResult.meta.tokens || 'N/A'} | Latency:{' '}
                {parsedResult.meta.latencyMs || 'N/A'}ms
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
