import type { LiveServerMessage } from '@google/genai';
import { describe, expect, it } from 'vitest';
import { toLiveEvents } from './geminiLive';

const msg = (serverContent: unknown) => ({ serverContent }) as LiveServerMessage;

describe('toLiveEvents', () => {
  it('extracts audio chunks and captions for both speakers', () => {
    expect(
      toLiveEvents(
        msg({
          modelTurn: { parts: [{ inlineData: { data: 'AAA' } }, { text: 'ignored' }, { inlineData: { data: 'BBB' } }] },
          inputTranscription: { text: 'How many interpreters?' },
          outputTranscription: { text: 'Two, ' },
        })
      )
    ).toEqual([
      { type: 'audio', data: 'AAA' },
      { type: 'audio', data: 'BBB' },
      { type: 'caption', speaker: 'user', text: 'How many interpreters?' },
      { type: 'caption', speaker: 'assistant', text: 'Two, ' },
    ]);
  });

  it('reports interruptions and turn boundaries', () => {
    expect(toLiveEvents(msg({ interrupted: true, turnComplete: true }))).toEqual([{ type: 'interrupted' }, { type: 'turnComplete' }]);
  });

  it('ignores messages without server content (setup, tool calls)', () => {
    expect(toLiveEvents({ setupComplete: {} } as LiveServerMessage)).toEqual([]);
  });
});
