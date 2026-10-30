import { useState } from 'react';
import { draftAslGloss, type AslGloss } from '../../services/apiClient';
import type { EventCategory } from '../../types';
import { errorMessage } from '../../utils/api';
import { SourceBadge } from '../ui/SourceBadge';

type GlossResult = Omit<AslGloss, 'source'> & { source: AslGloss['source'] | 'sample' };

const SAMPLE_GLOSS: GlossResult = {
  source: 'sample',
  aslGloss: 'WELCOME ALL-OF-YOU OUR ACCESSIBLE WEDDING CELEBRATE TODAY',
  nonManualMarkers: 'Raised eyebrows on opening clause; warm expansive smile; affirmative head nod on conclusion.',
  spatialGrammarNotes: 'Establish Couple locus on IX-Right; establish Guests on IX-Arc.',
  signBreakdown: [
    {
      gloss: 'WELCOME',
      description: 'Flat open hands sweep smoothly inward toward chest',
      timing: '0.0s - 1.2s',
      expression: 'Warm smile',
    },
    {
      gloss: 'ALL-OF-YOU',
      description: 'Index finger sweeps wide inclusive semicircle',
      timing: '1.2s - 2.4s',
      expression: 'Eye contact across room',
    },
  ],
};

const EXAMPLES = [
  { label: 'Example vows', text: 'Marcus, I promise to love you and cherish our life together.' },
  { label: 'Example dinner call', text: 'Dinner is served! Please join us at the banquet tables.' },
];

interface GlossDraftPanelProps {
  initialText: string;
  eventType: EventCategory;
  onError: (message: string | null) => void;
}

/** Drafts ASL gloss and facial-grammar notes to share with interpreters before the event. */
export const GlossDraftPanel = ({ initialText, eventType, onError }: GlossDraftPanelProps) => {
  const [text, setText] = useState(initialText);
  const [isDrafting, setIsDrafting] = useState(false);
  const [result, setResult] = useState<GlossResult>(SAMPLE_GLOSS);

  const draft = async () => {
    if (!text.trim()) return;
    setIsDrafting(true);
    onError(null);
    try {
      setResult(await draftAslGloss(text, `Accessible ${eventType} announcement`));
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Speech to ASL gloss (interpreter prep)</h3>
        <p className="text-xs text-slate-400">
          Draft gloss and facial grammar notes to share with interpreters before the event.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="gloss-input" className="sr-only">
          English text to draft as ASL gloss
        </label>
        <textarea
          id="gloss-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter an event speech, vow, or announcement…"
          rows={4}
          maxLength={1500}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-y"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-3">
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                onClick={() => setText(example.text)}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                {example.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => void draft()}
            disabled={isDrafting || !text.trim()}
            className="px-3 py-1.5 text-xs font-medium text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
          >
            {isDrafting ? 'Drafting…' : 'Draft ASL gloss'}
          </button>
        </div>
      </div>

      <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 space-y-3 text-xs" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-400 font-medium">ASL gloss</div>
          <SourceBadge source={result.source} />
        </div>
        <div className="font-mono text-teal-300 font-bold tracking-wide">{result.aslGloss}</div>
        <dl className="space-y-2 text-[11px]">
          <div>
            <dt className="text-slate-400 font-medium">Facial grammar (non-manual markers)</dt>
            <dd className="text-slate-300 leading-relaxed">{result.nonManualMarkers}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium">Spatial referencing notes</dt>
            <dd className="text-slate-300 leading-relaxed">{result.spatialGrammarNotes}</dd>
          </div>
        </dl>
        {result.signBreakdown && result.signBreakdown.length > 0 && (
          <ol className="space-y-1.5 border-t border-slate-800 pt-2">
            {result.signBreakdown.map((step) => (
              <li key={`${step.gloss}-${step.timing}`} className="text-[11px] text-slate-300">
                <span className="font-mono text-teal-300 font-semibold">{step.gloss}</span>{' '}
                <span className="text-slate-400">({step.timing})</span>: {step.description}
                {step.expression && <span className="text-slate-400">; {step.expression}</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
