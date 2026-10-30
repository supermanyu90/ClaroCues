import { useState } from 'react';
import type { ResponseSource } from '../../shared/api';
import { researchMarket } from '../../services/apiClient';
import type { EventPlan, SearchSource } from '../../types';
import { errorMessage, safeExternalUrl } from '../../utils/api';
import { SourceBadge } from '../ui/SourceBadge';

interface ResearchResult {
  content: string;
  sources: SearchSource[];
  source: ResponseSource | 'sample';
}

const SAMPLE_RESULT: ResearchResult = {
  source: 'sample',
  content:
    'Example ranges (search for live, cited figures):\n\n' +
    '• Catering: roughly $48–$75 per guest for buffet service; $95–$165 for a plated dinner.\n' +
    '• ASL interpreters: certified teams often bill $90–$140 per interpreter-hour with 2-hour minimums.\n' +
    '• CART captioning: commonly $160–$210 per hour.\n' +
    '• Venues: Friday evening or Sunday bookings are often 15–25% cheaper.',
  sources: [{ title: 'Registry of Interpreters for the Deaf (RID)', uri: 'https://rid.org' }],
};

interface MarketResearchPanelProps {
  plan: EventPlan;
  onError: (message: string | null) => void;
}

export const MarketResearchPanel = ({ plan, onError }: MarketResearchPanelProps) => {
  const [topic, setTopic] = useState(
    `Average catering costs per person and accessibility services for a ${plan.eventType}`
  );
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<ResearchResult>(SAMPLE_RESULT);

  const presets = [
    `Per-person catering benchmarks for ${plan.guestCount} guests`,
    'Average cost of certified ASL interpreter teams for events',
    'CART live captioning rates and booking lead times',
    `Photographer packages and contracts for a ${plan.eventType}`,
  ];

  const search = async (query = topic) => {
    const trimmed = query.trim();
    if (!trimmed || isSearching) return;
    setTopic(trimmed);
    setIsSearching(true);
    onError(null);
    try {
      setResult(await researchMarket(trimmed, plan.eventType));
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white">Market pricing & benchmarks</h3>
          <p className="text-xs text-slate-400">Gemini with Google Search grounding, with cited sources</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            aria-label="Market research topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={500}
            disabled={isSearching}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={isSearching || !topic.trim()}
            className="px-6 py-2.5 text-sm font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            {isSearching ? 'Searching…' : 'Research'}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-medium">Quick topics:</span>
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => void search(preset)}
              className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 hover:border-teal-500/50 text-slate-300 hover:text-teal-200 transition-colors cursor-pointer text-left"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {isSearching ? (
        <p
          role="status"
          className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-sm text-slate-300"
        >
          Searching the web with Google Search grounding…
        </p>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex flex-wrap items-center gap-2">
              <span>
                {result.source === 'gemini' ? 'Google Search citations' : 'Reference links'} ({result.sources.length})
              </span>
              <SourceBadge source={result.source} />
            </div>
            <div className="flex flex-wrap gap-2">
              {result.sources.map((source) => (
                <a
                  key={source.uri}
                  href={safeExternalUrl(source.uri) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-teal-500 text-teal-300 hover:text-teal-200 text-xs transition-colors"
                >
                  <span className="truncate max-w-xs font-medium">{source.title}</span>
                  <span aria-hidden="true"> ↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ))}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {result.content}
          </div>
        </div>
      )}
    </div>
  );
};
