import type { LiveServerMessage } from '@google/genai';
import type { LiveEvent, LiveEventContext, LiveTokenResponse } from '../shared/liveProtocol';
import { postJson } from '../utils/api';

/** Translates one Gemini Live server message into the UI events the concierge renders. */
export function toLiveEvents(message: LiveServerMessage): LiveEvent[] {
  const content = message.serverContent;
  if (!content) return [];
  const events: LiveEvent[] = [];
  for (const part of content.modelTurn?.parts ?? []) {
    if (part.inlineData?.data) events.push({ type: 'audio', data: part.inlineData.data });
  }
  if (content.inputTranscription?.text) events.push({ type: 'caption', speaker: 'user', text: content.inputTranscription.text });
  if (content.outputTranscription?.text) events.push({ type: 'caption', speaker: 'assistant', text: content.outputTranscription.text });
  if (content.interrupted) events.push({ type: 'interrupted' });
  if (content.turnComplete) events.push({ type: 'turnComplete' });
  return events;
}

export interface LiveConnection {
  sendAudio(base64Pcm16k: string): void;
  sendText(text: string): void;
  close(): void;
}

export interface LiveHandlers {
  onEvent(event: LiveEvent): void;
  onError(message: string): void;
  onClose(): void;
}

/**
 * Opens a Gemini Live session straight from the browser. The server only mints a single-use
 * token with the model, instructions and caption settings locked in, so this works on
 * serverless hosting and the API key never reaches the client.
 */
export async function connectGeminiLive(context: LiveEventContext, handlers: LiveHandlers): Promise<LiveConnection> {
  const { token, model } = await postJson<LiveTokenResponse>('/api/live-token', { context });
  // Loaded on demand so the SDK only ships to people who open the concierge.
  const { GoogleGenAI, Modality } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });

  const session = await ai.live.connect({
    model,
    // Mirrors the locked server config; the token's constraints take precedence.
    config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, outputAudioTranscription: {} },
    callbacks: {
      onmessage: (message) => toLiveEvents(message).forEach(handlers.onEvent),
      onerror: () => handlers.onError('The live session hit an error. Please reconnect.'),
      onclose: () => handlers.onClose(),
    },
  });

  return {
    sendAudio: (data) => session.sendRealtimeInput({ audio: { data, mimeType: 'audio/pcm;rate=16000' } }),
    sendText: (text) => session.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true }),
    close: () => {
      try {
        session.close();
      } catch {
        // already closed
      }
    },
  };
}
