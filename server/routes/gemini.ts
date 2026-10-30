import express, { Router } from 'express';
import type { AiGateway, GroundingChunk } from '../ai.js';
import type { ServerConfig } from '../config.js';
import * as fallbacks from '../fallbacks.js';
import { parseModelJson, safeHttpUrl } from '../http/parsing.js';
import { sendUnavailable, validated } from '../http/responses.js';
import * as prompts from '../prompts.js';
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
} from '../validation.js';

function extractPlaces(chunks: GroundingChunk[]) {
  return chunks.flatMap((chunk) => {
    const uri = safeHttpUrl(chunk.maps?.uri);
    if (!chunk.maps || !uri) return [];
    const snippets = (chunk.maps.placeAnswerSources?.reviewSnippets ?? []).map((s) => s.snippet);
    return [
      {
        title: chunk.maps.title || 'Venue on Google Maps',
        uri,
        reviewSnippets: snippets.filter((s): s is string => typeof s === 'string'),
      },
    ];
  });
}

function extractSources(chunks: GroundingChunk[]) {
  return chunks.flatMap((chunk) => {
    const uri = safeHttpUrl(chunk.web?.uri);
    return uri ? [{ title: chunk.web?.title || new URL(uri).hostname, uri }] : [];
  });
}

/**
 * /api/gemini/* routes. Planning endpoints fall back to labelled reference content when Gemini is
 * unavailable; transcription, ASL gloss and sign recognition return errors rather than invent output.
 */
export function geminiRouter(ai: AiGateway | null, config: ServerConfig): Router {
  const router = Router();
  const smallJson = express.json({ limit: '100kb' });

  router.post('/maps-search', smallJson, validateBody(mapsSearchSchema), async (req, res) => {
    const { query, location } = validated(req, mapsSearchSchema);
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

  router.post('/search-intelligence', smallJson, validateBody(searchIntelligenceSchema), async (req, res) => {
    const { topic, eventType } = validated(req, searchIntelligenceSchema);
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

  router.post('/transcribe', express.json({ limit: '15mb' }), validateBody(transcribeSchema), async (req, res) => {
    const { audioBase64, mimeType } = validated(req, transcribeSchema);
    if (!ai) return sendUnavailable(res, 'Transcription');
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
  });

  router.post('/plan-event', smallJson, validateBody(planEventSchema), async (req, res) => {
    const body = validated(req, planEventSchema);
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
        const result = await ai.generate({
          model: config.models.text,
          contents: prompts.planEventPrompt(input),
          json: true,
        });
        const plan = parseModelJson<Record<string, unknown>>(result.text);
        if (plan && typeof plan === 'object') return res.json({ ...plan, source: 'gemini' });
        console.warn('Plan generation returned malformed JSON; returning fallback');
      } catch (err) {
        console.warn('Plan generation failed; returning fallback:', err);
      }
    }
    return res.json(fallbacks.planFallback(input));
  });

  router.post('/assistant-chat', smallJson, validateBody(assistantChatSchema), async (req, res) => {
    const { messages, eventContext } = validated(req, assistantChatSchema);
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

  router.post('/ideas', smallJson, validateBody(ideasSchema), async (req, res) => {
    const body = validated(req, ideasSchema);
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

  router.post('/asl-gloss', smallJson, validateBody(aslGlossSchema), async (req, res) => {
    const { text, context } = validated(req, aslGlossSchema);
    if (!ai) return sendUnavailable(res, 'ASL gloss drafting');
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

  router.post(
    '/recognize-sign',
    express.json({ limit: '3mb' }),
    validateBody(recognizeSignSchema),
    async (req, res) => {
      const { imageBase64, mimeType } = validated(req, recognizeSignSchema);
      if (!ai) return sendUnavailable(res, 'Sign recognition');
      try {
        const result = await ai.generate({
          model: config.models.text,
          contents: [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompts.RECOGNIZE_SIGN_PROMPT }],
          json: true,
        });
        const parsed = parseModelJson<Record<string, unknown>>(result.text);
        if (!parsed)
          return res.status(502).json({ error: 'The model returned an unreadable result. Please try again.' });
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

  return router;
}
