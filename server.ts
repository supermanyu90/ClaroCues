import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGeminiClient, createGeminiGateway } from './server/ai.js';
import { createApp } from './server/app.js';
import { loadConfig } from './server/config.js';
import { createLiveTokenIssuer } from './server/liveToken.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const config = loadConfig();
  const client = createGeminiClient(config.geminiApiKey);
  if (!client) {
    console.warn('GEMINI_API_KEY is not set: AI features will return labelled fallback content or be disabled.');
  }

  const app = createApp({
    config,
    ai: client ? createGeminiGateway(client) : null,
    liveTokens: createLiveTokenIssuer(config.geminiApiKey, config.models.live),
  });
  const server = http.createServer(app);

  if (!config.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const dist = path.resolve(__dirname, 'dist');
    // Vite fingerprints everything under /assets, so those files can be cached forever.
    app.use('/assets', express.static(path.join(dist, 'assets'), { maxAge: '1y', immutable: true }));
    app.use(express.static(dist, { index: false }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`ClaroCues server listening on http://localhost:${config.port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
