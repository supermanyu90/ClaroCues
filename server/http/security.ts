import type { Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import type { ServerConfig } from '../config.js';

const GEMINI_HOST = 'generativelanguage.googleapis.com';

/** True when the request comes from a page on this host (or an explicitly allowed origin). */
export function isOriginAllowed(origin: string | undefined, host: string | undefined, allowed: string[]): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.host === host || allowed.includes(url.origin);
  } catch {
    return false;
  }
}

export const perMinuteLimit = (limit: number, message: string) =>
  rateLimit({ windowMs: 60_000, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: message } });

/** Security headers, production CSP and the general per-IP API rate limit. */
export function applySecurity(app: Express, config: ServerConfig): void {
  if (config.trustProxy) app.set('trust proxy', 1);
  app.use(
    helmet({
      // Vite's dev server injects inline scripts, so CSP is enforced only for the production build.
      contentSecurityPolicy: config.isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:', 'blob:'],
              mediaSrc: ["'self'", 'blob:'],
              // The live concierge connects from the browser straight to Gemini Live.
              connectSrc: ["'self'", `https://${GEMINI_HOST}`, `wss://${GEMINI_HOST}`],
              frameAncestors: ["'self'"],
              // TLS is terminated by the host (e.g. Cloud Run); forcing upgrades breaks plain-HTTP local runs.
              upgradeInsecureRequests: null,
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use('/api/', perMinuteLimit(config.rateLimitPerMinute, 'Too many requests. Please wait a minute and try again.'));
}
