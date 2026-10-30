import type { GoogleGenAI } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { createGeminiClient, createGeminiGateway } from './ai';
import { createAuthTokenClient, createLiveTokenIssuer, type AuthTokenClient } from './liveToken';

interface GenerateArgs {
  model: string;
  contents: unknown;
  config: Record<string, unknown>;
}

function fakeClient(response: unknown) {
  const generateContent = vi.fn(async (_args: GenerateArgs) => response);
  return { client: { models: { generateContent } } as unknown as GoogleGenAI, generateContent };
}

describe('createGeminiGateway', () => {
  it('sends a plain prompt with JSON mode and returns text plus grounding', async () => {
    const chunks = [{ web: { uri: 'https://a.example' } }];
    const { client, generateContent } = fakeClient({
      text: '{"ok":1}',
      candidates: [{ groundingMetadata: { groundingChunks: chunks } }],
    });
    const result = await createGeminiGateway(client).generate({
      model: 'm',
      contents: 'hello',
      json: true,
      systemInstruction: 'be kind',
    });
    expect(result).toEqual({ text: '{"ok":1}', groundingChunks: chunks });
    expect(generateContent).toHaveBeenCalledWith({
      model: 'm',
      contents: 'hello',
      config: { systemInstruction: 'be kind', responseMimeType: 'application/json' },
    });
  });

  it('maps chat history to role/parts turns', async () => {
    const { client, generateContent } = fakeClient({ text: 'hi' });
    await createGeminiGateway(client).generate({
      model: 'm',
      contents: [
        { role: 'user', text: 'Q' },
        { role: 'model', text: 'A' },
      ],
    });
    expect(generateContent.mock.calls[0]?.[0].contents).toEqual([
      { role: 'user', parts: [{ text: 'Q' }] },
      { role: 'model', parts: [{ text: 'A' }] },
    ]);
  });

  it('wraps multimodal parts and configures grounding tools without JSON mode', async () => {
    const { client, generateContent } = fakeClient({});
    const result = await createGeminiGateway(client).generate({
      model: 'm',
      contents: [{ inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } }, { text: 'what sign?' }],
      json: true,
      tool: 'googleMaps',
      latLng: { latitude: 1, longitude: 2 },
    });
    const request = generateContent.mock.calls[0]?.[0];
    expect(request?.contents).toEqual({
      parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } }, { text: 'what sign?' }],
    });
    expect(request?.config).toEqual({
      tools: [{ googleMaps: {} }],
      toolConfig: { retrievalConfig: { latLng: { latitude: 1, longitude: 2 } } },
    });
    expect(result).toEqual({ text: '', groundingChunks: [] });
  });

  it('creates no client without a key', () => {
    expect(createGeminiClient(null)).toBeNull();
    expect(createAuthTokenClient(null)).toBeNull();
  });
});

describe('createLiveTokenIssuer', () => {
  const context = { title: 'T', eventType: 'wedding', guestCount: 1, totalBudget: 1, venueName: 'V' };
  const fixedNow = () => Date.parse('2026-01-01T00:00:00Z');

  it('mints a single-use token with the session config locked', async () => {
    const create = vi.fn(async (_params: { config: Record<string, unknown> }) => ({ name: 'auth_tokens/xyz' }));
    const issuer = createLiveTokenIssuer(
      { authTokens: { create } } as unknown as AuthTokenClient,
      'live-model',
      fixedNow
    );
    await expect(issuer?.issue(context)).resolves.toEqual({
      token: 'auth_tokens/xyz',
      model: 'live-model',
      expiresAt: '2026-01-01T00:30:00.000Z',
    });
    const config = create.mock.calls[0]?.[0].config as { liveConnectConstraints: { config: Record<string, unknown> } };
    expect(config).toMatchObject({
      uses: 1,
      newSessionExpireTime: '2026-01-01T00:01:00.000Z',
      lockAdditionalFields: [],
      liveConnectConstraints: { model: 'live-model' },
    });
    expect(config.liveConnectConstraints.config.outputAudioTranscription).toEqual({});
  });

  it('rejects a token response without a name', async () => {
    const create = vi.fn(async () => ({}));
    const issuer = createLiveTokenIssuer({ authTokens: { create } } as unknown as AuthTokenClient, 'm', fixedNow);
    await expect(issuer?.issue(context)).rejects.toThrow(/without a name/);
  });

  it('is disabled without a client', () => {
    expect(createLiveTokenIssuer(null, 'm')).toBeNull();
  });
});
