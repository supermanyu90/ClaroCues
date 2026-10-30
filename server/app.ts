import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import type { z } from 'zod';
import type { AiGateway, GroundingChunk } from './ai.js';
import type { ServerConfig } from './config.js';
import * as fallbacks from './fallbacks.js';
import * as prompts from './prompts.js';
import {
  aslGlossSchema,
  assistantChatSchema,
  ideasSchema,
  mapsSearchSchema,
  planEventSchema,
  recognizeSignSchema,
  searchIntelligenceSchema,
  transcribeSchema,
  validateBody,
} from './validation.js';

export interface AppDeps {
  config: ServerConfig;
  /** null when no API key is configured. */
  ai: AiGateway | null;
}

/** Parses model JSON output, tolerating a ```json fence. Returns null on malformed output. */
export function parseModelJson<T = unknown>(text: string): T | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
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

function extractPlaces(chunks: GroundingChunk[]) {
  return chunks.flatMap((chunk) => {
    const uri = safeHttpUrl(chunk.maps?.uri);
    if (!chunk.maps || !uri) return [];
    return [
      {
        title: chunk.maps.title || 'Venue on Google Maps',
        uri,
        reviewSnippets: (chunk.maps.placeAnswerSources?.reviewSnippets ?? [])
          .map((s) => s.snippet)
          .filter((s): s is string => typeof s === 'string'),
      },
    ];
  });
}

function extractSources(chunks: GroundingChunk[]) {
  return chunks.flatMap((chunk) => {
    const uri = safeHttpUrl(chunk.web?.uri);
    if (!uri) return [];
    return [{ title: chunk.web?.title || new URL(uri).hostname, uri }];
  });
}

const valid = <S extends z.ZodType>(req: Request, _schema: S) => req.valid as z.infer<S>;

const unavailable = (res: Response, feature: string) =>
  res.status(503).json({
    error: `${feature} needs the Gemini API. Set GEMINI_API_KEY on the server to enable it.`,
  });

export function createApp({ config, ai }: AppDeps) {
  const app = express();
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
              connectSrc: ["'self'", 'ws:', 'wss:'],
              frameAncestors: ["'self'"],
              // TLS is terminated by the host (e.g. Cloud Run); forcing upgrades breaks plain-HTTP local runs.
              upgradeInsecureRequests: null,
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(
    '/api/',
    rateLimit({
      windowMs: 60_000,
      limit: config.rateLimitPerMinute,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Too many requests. Please wait a minute and try again.' },
    })
  );

  const smallJson = express.json({ limit: '100kb' });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, ai: ai ? 'gemini' : 'fallback' });
  });

  app.post('/api/gemini/maps-search', smallJson, validateBody(mapsSearchSchema), async (req, res) => {
    const { query, location } = valid(req, mapsSearchSchema);
    const prompt = query || 'Accessible event venues with step-free access and parking';
    if (ai) {
      try {
        const result = await ai.generate({
          model: config.models.text,
          contents: prompts.mapsSearchPrompt(prompt),
          tool: 'googleMaps',
          latLng: location,
        });
        return res.json({ source: 'gemini', content: result.text, places: extractPlaces(result.groundingChunks) });
      } catch (err) {
        console.warn('Maps grounding failed; returning fallback:', err);
      }
    }
    return res.json(fallbacks.mapsFallback(prompt));
  });

  app.post('/api/gemini/search-intelligence', smallJson, validateBody(searchIntelligenceSchema), async (req, res) => {
    const { topic, eventType } = valid(req, searchIntelligenceSchema);
    const type = eventType || 'event';
    if (ai) {
      try {
        const result = await ai.generate({
          model: config.models.text,
          contents: prompts.searchIntelligencePrompt(topic || 'catering costs and accessibility services', type),
          tool: 'googleSearch',
        });
        return res.json({ source: 'gemini', content: result.text, sources: extractSources(result.groundingChunks) });
      } catch (err) {
        console.warn('Search grounding failed; returning fallback:', err);
      }
    }
    return res.json(fallbacks.searchFallback(type));
  });

  app.post(
    '/api/gemini/transcribe',
    express.json({ limit: '15mb' }),
    validateBody(transcribeSchema),
    async (req, res) => {
      const { audioBase64, mimeType } = valid(req, transcribeSchema);
      if (!ai) return unavailable(res, 'Transcription');
      try {
        const result = await ai.generate({
          model: config.models.transcribe,
          contents: [{ inlineData: { mimeType, data: audioBase64 } }, { text: prompts.TRANSCRIBE_INSTRUCTION }],
        });
        return res.json({ source: 'gemini', transcription: result.text.trim() });
      } catch (err) {
        console.warn('Transcription failed:', err);
        return res.status(502).json({ error: 'Transcription failed. Please try again.' });
      }
    }
  );

  app.post('/api/gemini/plan-event', smallJson, validateBody(planEventSchema), async (req, res) => {
    const body = valid(req, planEventSchema);
    const input = {
      eventType: body.eventType || 'wedding',
      guestCount: body.guestCount,
      budget: Math.round(body.budget),
      venueType: body.venueType || 'Indoor pavilion',
      theme: body.theme || 'Warm, elegant and inclusive',
      dhhRatio: body.dhhRatio ?? 20,
      specialRequests: body.specialRequests || '',
    };
    if (ai) {
      try {
        const result = await ai.generate({ model: config.models.text, contents: prompts.planEventPrompt(input), json: true });
        const plan = parseModelJson<Record<string, unknown>>(result.text);
        if (plan && typeof plan === 'object') return res.json({ ...plan, source: 'gemini' });
        console.warn('Plan generation returned malformed JSON; returning fallback');
      } catch (err) {
        console.warn('Plan generation failed; returning fallback:', err);
      }
    }
    return res.json(fallbacks.planFallback(input));
  });

  app.post('/api/gemini/assistant-chat', smallJson, validateBody(assistantChatSchema), async (req, res) => {
    const { messages, eventContext } = valid(req, assistantChatSchema);
    if (ai) {
      try {
        // Gemini requires the history to start with a user turn; drop leading assistant greetings.
        const firstUser = messages.findIndex((m) => m.sender === 'user');
        const history = (firstUser === -1 ? [] : messages.slice(firstUser)).map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          text: m.content,
        }));
        if (history.length > 0) {
          const result = await ai.generate({
            model: config.models.text,
            systemInstruction: `${prompts.ASSISTANT_SYSTEM_PROMPT}\n${prompts.assistantContextBlock(eventContext ?? {})}`,
            contents: history,
          });
          return res.json({
            source: 'gemini',
            content: result.text || 'Sorry, I could not produce an answer. Please rephrase.',
            suggestions: [
              'What questions should I ask an interpreter agency?',
              'Draft an inquiry email to a CART captioning provider',
              'How can I trim catering without cutting access?',
            ],
          });
        }
      } catch (err) {
        console.warn('Assistant chat failed; returning fallback:', err);
      }
    }
    return res.json(fallbacks.chatFallback());
  });

  app.post('/api/gemini/ideas', smallJson, validateBody(ideasSchema), async (req, res) => {
    const body = valid(req, ideasSchema);
    if (ai) {
      try {
        const result = await ai.generate({
          model: config.models.text,
          contents: prompts.ideasPrompt({
            eventType: body.eventType || 'celebration',
            vibe: body.vibe || 'Festive, warm and inclusive',
            guestCount: body.guestCount,
            budget: body.budget,
          }),
          json: true,
        });
        const parsed = parseModelJson<{ ideas?: unknown }>(result.text);
        if (parsed && Array.isArray(parsed.ideas)) return res.json({ source: 'gemini', ideas: parsed.ideas });
      } catch (err) {
        console.warn('Ideas generation failed; returning fallback:', err);
      }
    }
    return res.json(fallbacks.ideasFallback());
  });

  app.post('/api/gemini/asl-gloss', smallJson, validateBody(aslGlossSchema), async (req, res) => {
    const { text, context } = valid(req, aslGlossSchema);
    if (!ai) return unavailable(res, 'ASL gloss drafting');
    try {
      const result = await ai.generate({
        model: config.models.text,
        contents: prompts.aslGlossPrompt(text, context || 'Event speech or announcement'),
        json: true,
      });
      const parsed = parseModelJson<Record<string, unknown>>(result.text);
      if (!parsed) return res.status(502).json({ error: 'The model returned an unreadable gloss. Please try again.' });
      return res.json({ ...parsed, englishOriginal: text, source: 'gemini' });
    } catch (err) {
      console.warn('ASL gloss failed:', err);
      return res.status(502).json({ error: 'ASL gloss drafting failed. Please try again.' });
    }
  });

  app.post(
    '/api/gemini/recognize-sign',
    express.json({ limit: '3mb' }),
    validateBody(recognizeSignSchema),
    async (req, res) => {
      const { imageBase64, mimeType } = valid(req, recognizeSignSchema);
      if (!ai) return unavailable(res, 'Sign recognition');
      try {
        const result = await ai.generate({
          model: config.models.text,
          contents: [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompts.RECOGNIZE_SIGN_PROMPT }],
          json: true,
        });
        const parsed = parseModelJson<Record<string, unknown>>(result.text);
        if (!parsed) return res.status(502).json({ error: 'The model returned an unreadable result. Please try again.' });
        const confidence = Number(parsed.confidence);
        return res.json({
          source: 'gemini',
          gloss: String(parsed.gloss ?? 'UNKNOWN').slice(0, 60),
          english: String(parsed.english ?? '').slice(0, 200),
          confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
          handsVisible: Boolean(parsed.handsVisible),
          notes: String(parsed.notes ?? '').slice(0, 300),
        });
      } catch (err) {
        console.warn('Sign recognition failed:', err);
        return res.status(502).json({ error: 'Sign recognition failed. Please try again.' });
      }
    }
  );

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Body-parser errors (oversized or malformed JSON) and anything unexpected. Never leak internals.
  app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body.' });
    console.error('Unhandled server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
