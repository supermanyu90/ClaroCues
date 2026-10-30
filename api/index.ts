// Vercel serverless entry: serves the Express /api routes. The /live WebSocket gateway needs a
// long-running server (npm start, Cloud Run, Render), so it is not available on Vercel.
import { createGeminiClient, createGeminiGateway } from '../server/ai.js';
import { createApp } from '../server/app.js';
import { loadConfig } from '../server/config.js';

const config = loadConfig();
const client = createGeminiClient(config.geminiApiKey);

export default createApp({ config, ai: client ? createGeminiGateway(client) : null });
