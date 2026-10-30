import express, { Router } from 'express';
import type { ServerConfig } from '../config.js';
import type { LiveTokenIssuer } from '../liveToken.js';
import { sendUnavailable, validated } from '../http/responses.js';
import { isOriginAllowed, perMinuteLimit } from '../http/security.js';
import { liveTokenSchema, validateBody } from '../validation.js';

/** Each token opens one paid Gemini Live session, so the limit is far tighter than the rest of the API. */
const LIVE_TOKENS_PER_MINUTE = 6;

/** POST /api/live-token: mints a locked, single-use Gemini Live token for pages on this origin. */
export function liveTokenRouter(liveTokens: LiveTokenIssuer | null, config: ServerConfig): Router {
  const router = Router();
  router.post(
    '/',
    perMinuteLimit(LIVE_TOKENS_PER_MINUTE, 'Too many live sessions started. Please wait a minute.'),
    express.json({ limit: '100kb' }),
    validateBody(liveTokenSchema),
    async (req, res) => {
      if (!isOriginAllowed(req.get('origin'), req.get('host'), config.allowedOrigins)) {
        return res.status(403).json({ error: 'Live sessions can only be started from the ClaroCues app.' });
      }
      if (!liveTokens) return sendUnavailable(res, 'The live concierge');
      try {
        res.setHeader('Cache-Control', 'no-store');
        return res.json(await liveTokens.issue(validated(req, liveTokenSchema).context));
      } catch (err) {
        console.warn('Live token creation failed:', err);
        return res.status(502).json({ error: 'Could not start a live session. Please try again.' });
      }
    }
  );
  return router;
}
