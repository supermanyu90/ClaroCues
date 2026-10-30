// Wire protocol for the /live WebSocket gateway, shared by server.ts and the browser client.

export interface LiveEventContext {
  title: string;
  eventType: string;
  guestCount: number;
  totalBudget: number;
  venueName: string;
}

export type LiveClientMessage =
  | { type: 'start'; context: LiveEventContext }
  | { type: 'audio'; data: string }
  | { type: 'text'; data: string };

export type LiveServerMessage =
  | { type: 'ready'; mode: 'live' | 'unavailable'; message?: string }
  | { type: 'audio'; data: string }
  | { type: 'caption'; speaker: 'user' | 'assistant'; text: string }
  | { type: 'turnComplete' }
  | { type: 'interrupted' }
  | { type: 'error'; message: string };

/** Max size of one base64 PCM chunk the gateway accepts (~6s of 16kHz mono PCM). */
export const LIVE_MAX_AUDIO_CHUNK_CHARS = 256 * 1024;
export const LIVE_MAX_TEXT_CHARS = 2000;
