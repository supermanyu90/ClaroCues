// Contracts for the live concierge. The browser fetches an ephemeral token from /api/live-token
// and then talks to Gemini Live directly.

export interface LiveEventContext {
  title: string;
  eventType: string;
  guestCount: number;
  totalBudget: number;
  venueName: string;
}

export interface LiveTokenResponse {
  token: string;
  model: string;
  expiresAt: string;
}

/** UI-level events derived from Gemini Live server messages. */
export type LiveEvent =
  | { type: 'audio'; data: string }
  | { type: 'caption'; speaker: 'user' | 'assistant'; text: string }
  | { type: 'turnComplete' }
  | { type: 'interrupted' };

export const LIVE_MAX_TEXT_CHARS = 2000;
