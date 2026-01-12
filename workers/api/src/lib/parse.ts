export function safeJsonParse(raw: string): { data: Record<string, unknown>; error?: string } {
  if (!raw) {
    return { data: {} };
  }

  const cleaned = stripCodeFences(raw.trim());
  try {
    return { data: JSON.parse(cleaned) };
  } catch (error) {
    const extracted = extractJson(cleaned);
    if (extracted) {
      try {
        return { data: JSON.parse(extracted) };
      } catch (innerError) {
        return { data: {}, error: (innerError as Error).message };
      }
    }
    return { data: {}, error: (error as Error).message };
  }
}

function stripCodeFences(input: string): string {
  return input
    .replace(/^```(json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

function extractJson(input: string): string | null {
  const start = input.indexOf('{');
  const end = input.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return input.slice(start, end + 1);
}
