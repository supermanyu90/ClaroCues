import { describe, expect, it } from 'vitest';
import { LIVE_MAX_AUDIO_CHUNK_CHARS, LIVE_MAX_TEXT_CHARS } from '../src/shared/liveProtocol';
import { isOriginAllowed, parseClientMessage } from './live';

describe('parseClientMessage', () => {
  it('accepts well-formed audio, text and start frames', () => {
    expect(parseClientMessage('{"type":"audio","data":"AAAA"}')).toEqual({ type: 'audio', data: 'AAAA' });
    expect(parseClientMessage('{"type":"text","data":"  hi  "}')).toEqual({ type: 'text', data: 'hi' });
    expect(
      parseClientMessage(JSON.stringify({ type: 'start', context: { title: 'W', eventType: 'wedding', guestCount: 10, totalBudget: 5, venueName: 'V', extra: 'x' } }))
    ).toEqual({ type: 'start', context: { title: 'W', eventType: 'wedding', guestCount: 10, totalBudget: 5, venueName: 'V' } });
  });

  it('sanitises start context field types', () => {
    const msg = parseClientMessage(JSON.stringify({ type: 'start', context: { title: 5, guestCount: 'many' } }));
    expect(msg).toEqual({ type: 'start', context: { title: '', eventType: '', guestCount: 0, totalBudget: 0, venueName: '' } });
  });

  it.each([
    ['not json'],
    ['null'],
    ['{"type":"audio"}'],
    ['{"type":"text","data":"   "}'],
    ['{"type":"shutdown"}'],
    [JSON.stringify({ type: 'audio', data: 'A'.repeat(LIVE_MAX_AUDIO_CHUNK_CHARS + 1) })],
    [JSON.stringify({ type: 'text', data: 'a'.repeat(LIVE_MAX_TEXT_CHARS + 1) })],
  ])('rejects %s', (raw) => {
    expect(parseClientMessage(raw)).toBeNull();
  });
});

describe('isOriginAllowed', () => {
  it('allows same-origin connections', () => {
    expect(isOriginAllowed('http://localhost:3000', 'localhost:3000', [])).toBe(true);
  });

  it('allows explicitly configured origins', () => {
    expect(isOriginAllowed('https://app.example.com', 'internal:8080', ['https://app.example.com'])).toBe(true);
  });

  it('blocks cross-site and missing origins', () => {
    expect(isOriginAllowed('https://evil.example', 'localhost:3000', [])).toBe(false);
    expect(isOriginAllowed(undefined, 'localhost:3000', [])).toBe(false);
    expect(isOriginAllowed('garbage', 'localhost:3000', [])).toBe(false);
  });
});
