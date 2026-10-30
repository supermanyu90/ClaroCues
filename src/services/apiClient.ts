// Typed client for the ClaroCues server API. Components call these functions instead of
// hard-coding endpoint paths and response shapes.
import type { ResponseSource, SignRecognitionResult } from '../shared/api';
import type { LiveEventContext, LiveTokenResponse } from '../shared/liveProtocol';
import type { ChatMessage, EventPlan, MapsPlace, SearchSource } from '../types';
import { blobToBase64, postJson } from '../utils/api';

export interface ChatReply {
  content: string;
  suggestions?: string[];
  source: ResponseSource;
}

export interface MarketResearch {
  content: string;
  sources: SearchSource[];
  source: ResponseSource;
}

export interface VenueSearchResult {
  content: string;
  places: MapsPlace[];
  source: ResponseSource;
}

export interface AslGloss {
  aslGloss: string;
  nonManualMarkers: string;
  spatialGrammarNotes: string;
  signBreakdown?: { gloss: string; description: string; timing: string; expression: string }[];
  source: ResponseSource;
}

export interface PlanRequestBody {
  eventType: string;
  guestCount: number;
  budget: number;
  venueType: string;
  theme: string;
  dhhRatio: number;
  specialRequests: string;
}

/** Plan fields the assistant needs for context; deliberately excludes vendor contacts and notes. */
export function chatContext(plan: EventPlan) {
  const { title, eventType, guestCount, totalBudget, venueName, theme, dhhPercentage } = plan;
  return { title, eventType, guestCount, totalBudget, venueName, theme, dhhPercentage };
}

export const sendChat = (history: Pick<ChatMessage, 'sender' | 'content'>[], plan: EventPlan) =>
  postJson<ChatReply>('/api/gemini/assistant-chat', { messages: history, eventContext: chatContext(plan) });

export const researchMarket = (topic: string, eventType: string) =>
  postJson<MarketResearch>('/api/gemini/search-intelligence', { topic, eventType });

export async function transcribeAudio(blob: Blob): Promise<string> {
  const audioBase64 = await blobToBase64(blob);
  const mimeType = blob.type.split(';')[0] || 'audio/webm';
  const { transcription } = await postJson<{ transcription: string }>('/api/gemini/transcribe', {
    audioBase64,
    mimeType,
  });
  return transcription ?? '';
}

export const searchVenues = (query: string, location?: { latitude: number; longitude: number }) =>
  postJson<VenueSearchResult>('/api/gemini/maps-search', { query, location });

/** Returns the raw model plan; run it through normalizeGeneratedPlan before use. */
export const generatePlan = (body: PlanRequestBody) =>
  postJson<Record<string, unknown>>('/api/gemini/plan-event', body);

export const generateIdeas = (body: { eventType: string; vibe: string; guestCount: number; budget: number }) =>
  postJson<{ ideas: unknown; source: ResponseSource }>('/api/gemini/ideas', body);

export const draftAslGloss = (text: string, context: string) =>
  postJson<AslGloss>('/api/gemini/asl-gloss', { text, context });

export const recognizeSign = (imageBase64: string) =>
  postJson<SignRecognitionResult>('/api/gemini/recognize-sign', { imageBase64, mimeType: 'image/jpeg' });

export const requestLiveToken = (context: LiveEventContext) =>
  postJson<LiveTokenResponse>('/api/live-token', { context });
