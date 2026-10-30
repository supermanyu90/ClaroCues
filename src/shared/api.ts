// Response contracts for /api/gemini/* endpoints.

/**
 * Where a response came from. `fallback` means Gemini was unavailable (no key or an upstream
 * error) and the server returned built-in reference content; the UI must label it as such.
 */
export type ResponseSource = 'gemini' | 'fallback';

export interface SourcedResponse {
  source: ResponseSource;
}

export interface SignRecognitionResult {
  gloss: string;
  english: string;
  /** Model-reported confidence, 0–1. */
  confidence: number;
  handsVisible: boolean;
  notes: string;
}
