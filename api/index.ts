// Vercel serverless entry for the Express /api routes. The live concierge works here too: the
// browser connects to Gemini Live directly with an ephemeral token from /api/live-token.
import { createGeminiClient, createGeminiGateway } from '../server/ai.js';
import { createApp } from '../server/app.js';
import { loadConfig } from '../server/config.js';
import { createAuthTokenClient, createLiveTokenIssuer } from '../server/liveToken.js';

const config = loadConfig();
const client = createGeminiClient(config.geminiApiKey);

export default createApp({
  config,
  ai: client ? createGeminiGateway(client) : null,
  liveTokens: createLiveTokenIssuer(createAuthTokenClient(config.geminiApiKey), config.models.live),
});
