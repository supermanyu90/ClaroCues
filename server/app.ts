import express, { type NextFunction, type Request, type Response } from 'express';
import type { AiGateway } from './ai.js';
import type { ServerConfig } from './config.js';
import { applySecurity } from './http/security.js';
import type { LiveTokenIssuer } from './liveToken.js';
import { geminiRouter } from './routes/gemini.js';
import { liveTokenRouter } from './routes/liveToken.js';

export { parseModelJson, safeHttpUrl } from './http/parsing.js';
export { isOriginAllowed } from './http/security.js';

export interface AppDeps {
  config: ServerConfig;
  /** null when no API key is configured. */
  ai: AiGateway | null;
  /** Mints ephemeral Gemini Live tokens; null when no API key is configured. */
  liveTokens?: LiveTokenIssuer | null;
}

/** Builds the Express app. Static/SPA serving is added by the caller (server.ts) so this stays testable. */
export function createApp({ config, ai, liveTokens = null }: AppDeps) {
  const app = express();
  applySecurity(app, config);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, ai: ai ? 'gemini' : 'fallback' });
  });
  app.use('/api/gemini', geminiRouter(ai, config));
  app.use('/api/live-token', liveTokenRouter(liveTokens, config));
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Body-parser errors (oversized or malformed JSON) and anything unexpected. Never leak internals.
  app.use((err: Error & { type?: string }, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body.' });
    console.error('Unhandled server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
