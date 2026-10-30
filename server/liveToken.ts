import { GoogleGenAI, Modality, type LiveConnectConfig } from '@google/genai';
import type { LiveEventContext } from '../src/shared/liveProtocol.js';
import { liveSystemInstruction } from './prompts.js';

// Serverless hosts (Vercel) cannot hold a WebSocket open, so the browser connects to Gemini Live
// directly using a short-lived ephemeral token minted here. The real API key never leaves the server.

/** How long a browser has to open the session after receiving the token. */
const NEW_SESSION_WINDOW_MS = 60_000;
/** Hard cap on how long a session using the token may run. */
const SESSION_MAX_MS = 30 * 60_000;

export interface LiveToken {
  token: string;
  model: string;
  expiresAt: string;
}

export interface LiveTokenIssuer {
  issue(context: LiveEventContext): Promise<LiveToken>;
}

/** The session config, locked into the token so a leaked token can't be repurposed. */
export function buildLiveConnectConfig(context: LiveEventContext): LiveConnectConfig {
  return {
    responseModalities: [Modality.AUDIO],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
    // Both directions are transcribed so Deaf and Hard-of-Hearing users can follow by captions.
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    systemInstruction: liveSystemInstruction({ ...context }),
  };
}

/** The slice of the Gemini SDK used to mint tokens (a v1alpha GoogleGenAI client in production). */
export type AuthTokenClient = Pick<GoogleGenAI, 'authTokens'>;

/** Ephemeral tokens are only available on the v1alpha API surface. */
export function createAuthTokenClient(apiKey: string | null): AuthTokenClient | null {
  return apiKey ? new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } }) : null;
}

export function createLiveTokenIssuer(
  client: AuthTokenClient | null,
  model: string,
  now: () => number = Date.now
): LiveTokenIssuer | null {
  if (!client) return null;
  return {
    async issue(context) {
      const start = now();
      const expiresAt = new Date(start + SESSION_MAX_MS).toISOString();
      const token = await client.authTokens.create({
        config: {
          uses: 1,
          expireTime: expiresAt,
          newSessionExpireTime: new Date(start + NEW_SESSION_WINDOW_MS).toISOString(),
          liveConnectConstraints: { model, config: buildLiveConnectConfig(context) },
          // Empty list = lock every field set above (model, instructions, captions, voice).
          lockAdditionalFields: [],
        },
      });
      if (!token.name) throw new Error('Gemini returned an auth token without a name');
      return { token: token.name, model, expiresAt };
    },
  };
}
