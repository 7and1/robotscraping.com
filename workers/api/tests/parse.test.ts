import { describe, it, expect } from 'vitest';
import { safeJsonParse } from '../src/lib/parse';

describe('safeJsonParse', () => {
  it('parses valid json', () => {
    const result = safeJsonParse('{"ok":true}');
    expect(result.data.ok).toBe(true);
  });

  it('handles code fences', () => {
    const result = safeJsonParse('```json\n{"value":42}\n```');
    expect(result.data.value).toBe(42);
  });

  it('returns empty object on bad json', () => {
    const result = safeJsonParse('not json');
    expect(Object.keys(result.data).length).toBe(0);
  });
});
