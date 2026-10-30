import dotenv from 'dotenv';

dotenv.config();

const PLACEHOLDER_KEYS = new Set(['', 'MY_GEMINI_API_KEY']);

function parseList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface ServerConfig {
  port: number;
  isProduction: boolean;
  geminiApiKey: string | null;
  models: {
    text: string;
    transcribe: string;
    live: string;
  };
  /** Extra origins allowed to open the /live WebSocket (same-origin is always allowed). */
  allowedOrigins: string[];
  /** Requests per minute per IP across /api/gemini/*. */
  rateLimitPerMinute: number;
  trustProxy: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const key = env.GEMINI_API_KEY?.trim() ?? '';
  return {
    port: Number.parseInt(env.PORT ?? '', 10) || 3000,
    isProduction: env.NODE_ENV === 'production',
    geminiApiKey: PLACEHOLDER_KEYS.has(key) ? null : key,
    models: {
      text: env.GEMINI_TEXT_MODEL || 'gemini-3.8-flash',
      transcribe: env.GEMINI_TRANSCRIBE_MODEL || 'gemini-3.5-transcribe',
      live: env.GEMINI_LIVE_MODEL || 'gemini-3.8-live',
    },
    allowedOrigins: parseList(env.ALLOWED_ORIGINS),
    rateLimitPerMinute: Number.parseInt(env.RATE_LIMIT_PER_MINUTE ?? '', 10) || 30,
    // Vercel always sits behind its own proxy, so the client IP comes from X-Forwarded-For.
    trustProxy: env.TRUST_PROXY === 'true' || env.VERCEL === '1',
  };
}
