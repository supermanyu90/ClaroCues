import { useState } from 'react';
import { useDictation } from '../../hooks/useDictation';
import type { EventCategory } from '../../types';
import { CopyButton } from './CopyButton';

type SpeechKind = 'vows' | 'welcome' | 'toast' | 'vendor_note';
const SPEECH_KINDS: { value: SpeechKind; label: string }[] = [
  { value: 'vows', label: 'Vows' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'toast', label: 'Toast' },
  { value: 'vendor_note', label: 'Vendor note' },
];

const SAMPLE_TRANSCRIPT =
  '“Standing here today, surrounded by the people who mean the world to us, I promise to always listen, celebrate your laughter, and walk with you through every step of this journey.”';

interface DictationStudioProps {
  eventType: EventCategory;
  /** Sends the transcript to the chat with a request to polish it. */
  onPolish: (prompt: string) => void;
  onSendToInterpreterPrep?: (text: string) => void;
  onError: (message: string | null) => void;
}

export const DictationStudio = ({ eventType, onPolish, onSendToInterpreterPrep, onError }: DictationStudioProps) => {
  const [kind, setKind] = useState<SpeechKind>('vows');
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT);
  const dictation = useDictation({ onTranscript: setTranscript, onError });
  const kindLabel = SPEECH_KINDS.find((k) => k.value === kind)?.label.toLowerCase() ?? 'speech';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white">Speech & vow dictation</h3>
          <p className="text-xs text-slate-400">
            Record a speech, get a verbatim transcript, and share it with interpreters and captioners ahead of time.
          </p>
        </div>
        <div
          role="group"
          aria-label="Type of speech"
          className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs"
        >
          {SPEECH_KINDS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setKind(value)}
              aria-pressed={kind === value}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                kind === value ? 'bg-slate-800 text-teal-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-6 bg-slate-950/60 border border-slate-800 rounded-xl space-y-4">
        <button
          onClick={dictation.isRecording ? dictation.stop : () => void dictation.start()}
          aria-label={dictation.isRecording ? 'Stop recording and transcribe' : `Start dictating ${kindLabel}`}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-colors cursor-pointer ${
            dictation.isRecording ? 'bg-rose-500 text-white' : 'bg-teal-400 hover:bg-teal-300 text-slate-950'
          }`}
        >
          <span aria-hidden="true">{dictation.isRecording ? '⏹️' : '🎙️'}</span>
        </button>
        <p className="text-sm font-semibold text-white" aria-live="polite">
          {dictation.isRecording
            ? `Recording… (${dictation.seconds}s)`
            : dictation.isTranscribing
              ? 'Transcribing…'
              : 'Press to start dictating'}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="dictation-transcript"
            className="text-xs font-semibold text-slate-300 uppercase tracking-wider"
          >
            Verbatim transcript
          </label>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <CopyButton text={transcript} label="Copy text" onError={onError} />
            <button
              onClick={() => onPolish(`Review and polish this ${kindLabel} for a ${eventType}: "${transcript}"`)}
              disabled={!transcript.trim()}
              className="text-teal-400 hover:text-teal-300 disabled:opacity-50 cursor-pointer"
            >
              Polish in AI chat →
            </button>
            {onSendToInterpreterPrep && (
              <button
                onClick={() => onSendToInterpreterPrep(transcript)}
                disabled={!transcript.trim()}
                className="text-teal-400 hover:text-teal-300 disabled:opacity-50 cursor-pointer"
              >
                Send to interpreter prep (ASL gloss) →
              </button>
            )}
          </div>
        </div>
        <textarea
          id="dictation-transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={6}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-100 focus:outline-none focus:border-teal-500 leading-relaxed"
        />
      </div>
    </div>
  );
};
