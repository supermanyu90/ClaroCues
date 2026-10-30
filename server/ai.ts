import { GoogleGenAI } from '@google/genai';

export interface GroundingChunk {
  web?: { uri?: string; title?: string };
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: { reviewSnippets?: { snippet?: string }[] };
  };
}

export type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface GenerateRequest {
  model: string;
  /** A plain prompt, multimodal parts, or a multi-turn history. */
  contents: string | ContentPart[] | ChatTurn[];
  systemInstruction?: string;
  json?: boolean;
  tool?: 'googleSearch' | 'googleMaps';
  latLng?: { latitude: number; longitude: number };
}

export interface GenerateResult {
  text: string;
  groundingChunks: GroundingChunk[];
}

/**
 * The narrow slice of Gemini the HTTP routes depend on. Routes take this interface so tests
 * can substitute a fake without network access.
 */
export interface AiGateway {
  generate(request: GenerateRequest): Promise<GenerateResult>;
}

function toSdkContents(contents: GenerateRequest['contents']) {
  if (typeof contents === 'string') return contents;
  if (contents.length > 0 && 'role' in contents[0]) {
    return (contents as ChatTurn[]).map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] }));
  }
  return { parts: contents as ContentPart[] };
}

export function createGeminiGateway(client: GoogleGenAI): AiGateway {
  return {
    async generate(request) {
      const response = await client.models.generateContent({
        model: request.model,
        contents: toSdkContents(request.contents),
        config: {
          ...(request.systemInstruction ? { systemInstruction: request.systemInstruction } : {}),
          // JSON mode cannot be combined with grounding tools.
          ...(request.json && !request.tool ? { responseMimeType: 'application/json' } : {}),
          ...(request.tool ? { tools: [{ [request.tool]: {} }] } : {}),
          ...(request.latLng ? { toolConfig: { retrievalConfig: { latLng: request.latLng } } } : {}),
        },
      });
      return {
        text: response.text ?? '',
        groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) as GroundingChunk[],
      };
    },
  };
}

export function createGeminiClient(apiKey: string | null): GoogleGenAI | null {
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({ apiKey });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}
