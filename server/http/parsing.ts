/** Parses model JSON output, tolerating a ```json fence. Returns null on malformed output. */
export function parseModelJson<T = unknown>(text: string): T | null {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

/** Only pass through absolute http(s) URLs from grounding metadata. */
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
