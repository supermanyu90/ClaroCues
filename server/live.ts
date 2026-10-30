import type http from 'http';
import { Modality, type GoogleGenAI, type LiveServerMessage as GeminiLiveMessage, type Session } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import {
  LIVE_MAX_AUDIO_CHUNK_CHARS,
  LIVE_MAX_TEXT_CHARS,
  type LiveClientMessage,
  type LiveEventContext,
  type LiveServerMessage,
} from '../src/shared/liveProtocol.js';
import type { ServerConfig } from './config.js';
import { liveSystemInstruction } from './prompts.js';

const MAX_CONCURRENT_SESSIONS = 20;

/** Parses and validates one client frame. Returns null for anything malformed or oversized. */
export function parseClientMessage(raw: string): LiveClientMessage | null {
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!msg || typeof msg !== 'object') return null;
  const { type, data, context } = msg as Record<string, unknown>;

  if (type === 'audio' && typeof data === 'string' && data.length <= LIVE_MAX_AUDIO_CHUNK_CHARS) {
    return { type, data };
  }
  if (type === 'text' && typeof data === 'string' && data.trim() && data.length <= LIVE_MAX_TEXT_CHARS) {
    return { type, data: data.trim() };
  }
  if (type === 'start' && context && typeof context === 'object') {
    const c = context as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 200) : '');
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    const safe: LiveEventContext = {
      title: str(c.title),
      eventType: str(c.eventType),
      guestCount: num(c.guestCount),
      totalBudget: num(c.totalBudget),
      venueName: str(c.venueName),
    };
    return { type, context: safe };
  }
  return null;
}

export function isOriginAllowed(origin: string | undefined, host: string | undefined, allowed: string[]): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.host === host || allowed.includes(url.origin);
  } catch {
    return false;
  }
}

export function attachLiveGateway(server: http.Server, client: GoogleGenAI | null, config: ServerConfig) {
  const wss = new WebSocketServer({
    server,
    path: '/live',
    maxPayload: LIVE_MAX_AUDIO_CHUNK_CHARS + 1024,
    verifyClient: ({ origin, req }: { origin: string; req: http.IncomingMessage }) =>
      isOriginAllowed(origin, req.headers.host, config.allowedOrigins) && wss.clients.size < MAX_CONCURRENT_SESSIONS,
  });

  wss.on('connection', (ws: WebSocket) => {
    const send = (msg: LiveServerMessage) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    };
    let session: Session | null = null;
    let starting = false;

    const startSession = async (context: LiveEventContext) => {
      if (session || starting) return;
      if (!client) {
        send({
          type: 'ready',
          mode: 'unavailable',
          message: 'Live voice needs the Gemini API. Set GEMINI_API_KEY on the server to enable it.',
        });
        return;
      }
      starting = true;
      try {
        session = await client.live.connect({
          model: config.models.live,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            // Both directions are transcribed so Deaf and Hard-of-Hearing users can follow by captions.
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: liveSystemInstruction({ ...context }),
          },
          callbacks: {
            onmessage: (message: GeminiLiveMessage) => {
              const content = message.serverContent;
              if (!content) return;
              for (const part of content.modelTurn?.parts ?? []) {
                if (part.inlineData?.data) send({ type: 'audio', data: part.inlineData.data });
              }
              if (content.inputTranscription?.text) {
                send({ type: 'caption', speaker: 'user', text: content.inputTranscription.text });
              }
              if (content.outputTranscription?.text) {
                send({ type: 'caption', speaker: 'assistant', text: content.outputTranscription.text });
              }
              if (content.interrupted) send({ type: 'interrupted' });
              if (content.turnComplete) send({ type: 'turnComplete' });
            },
            onerror: (err: unknown) => {
              console.error('Gemini Live error:', err);
              send({ type: 'error', message: 'The live session hit an error. Please reconnect.' });
            },
            onclose: () => {
              session = null;
              if (ws.readyState === WebSocket.OPEN) ws.close(1011, 'Upstream session closed');
            },
          },
        });
        send({ type: 'ready', mode: 'live' });
      } catch (err) {
        console.error('Failed to establish Gemini Live session:', err);
        send({ type: 'error', message: 'Could not start the live session. Please try again.' });
        ws.close(1011, 'Live session unavailable');
      } finally {
        starting = false;
      }
    };

    ws.on('message', (raw) => {
      const msg = parseClientMessage(raw.toString());
      if (!msg) return;
      if (msg.type === 'start') {
        void startSession(msg.context);
      } else if (msg.type === 'audio') {
        session?.sendRealtimeInput({ audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' } });
      } else if (msg.type === 'text') {
        session?.sendClientContent({ turns: [{ role: 'user', parts: [{ text: msg.data }] }], turnComplete: true });
        send({ type: 'caption', speaker: 'user', text: msg.data });
      }
    });

    ws.on('close', () => {
      try {
        session?.close();
      } catch {
        // Session already closed upstream.
      }
      session = null;
    });
  });

  return wss;
}
