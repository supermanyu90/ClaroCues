export interface Caption {
  id: number;
  speaker: 'user' | 'assistant';
  text: string;
}

/**
 * Streaming transcription arrives in fragments. A fragment extends the last caption while the same
 * person is still talking, unless `startNew` marks a turn boundary.
 */
export function appendCaption(
  captions: Caption[],
  speaker: Caption['speaker'],
  text: string,
  startNew: boolean,
  nextId: number
): Caption[] {
  const last = captions[captions.length - 1];
  if (last && last.speaker === speaker && !startNew) {
    return [...captions.slice(0, -1), { ...last, text: last.text + text }];
  }
  return [...captions, { id: nextId, speaker, text: text.trimStart() }];
}
