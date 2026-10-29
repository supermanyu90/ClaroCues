import React from 'react';

export type NavTab =
  | 'assistant'
  | 'ideas'
  | 'budget'
  | 'timeline'
  | 'vendors'
  | 'venues'
  | 'accessibility';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenGenerateModal: () => void;
  onOpenLiveVoiceModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenGenerateModal,
  onOpenLiveVoiceModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => onSelectTab('assistant')}
          className="text-lg font-bold tracking-tight text-white hover:text-teal-400 transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
          <span>ClaroCues</span>
        </button>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-300">
          <button
            onClick={() => onSelectTab('assistant')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 cursor-pointer ${
              activeTab === 'assistant'
                ? 'text-teal-400 border-teal-400 font-semibold'
                : 'text-slate-400 hover:text-slate-100 border-transparent'
            }`}
          >
            AI Assistant
          </button>
          <button
            onClick={() => onSelectTab('ideas')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 cursor-pointer ${
              activeTab === 'ideas'
                ? 'text-teal-400 border-teal-400 font-semibold'
                : 'text-slate-400 hover:text-slate-100 border-transparent'
            }`}
          >
            Personalized Ideas
          </button>
          <button
            onClick={() => onSelectTab('budget')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 cursor-pointer ${
              activeTab === 'budget'
                ? 'text-teal-400 border-teal-400 font-semibold'
                : 'text-slate-400 hover:text-slate-100 border-transparent'
            }`}
          >
            Budgets
          </button>
          <button
            onClick={() => onSelectTab('timeline')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 cursor-pointer ${
              activeTab === 'timeline'
                ? 'text-teal-400 border-teal-400 font-semibold'
                : 'text-slate-400 hover:text-slate-100 border-transparent'
            }`}
          >
            Timelines
          </button>
          <button
            onClick={() => onSelectTab('vendors')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 cursor-pointer ${
              activeTab === 'vendors'
                ? 'text-teal-400 border-teal-400 font-semibold'
                : 'text-slate-400 hover:text-slate-100 border-transparent'
            }`}
          >
            Vendor Checklist
          </button>
          <button
            onClick={() => onSelectTab('venues')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'venues'
                ? 'text-teal-400 border-teal-400 font-semibold'
                : 'text-slate-400 hover:text-slate-100 border-transparent'
            }`}
          >
            <span>Venue Radar</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-teal-500/20 text-teal-300">
              Maps
            </span>
          </button>
          <button
            onClick={() => onSelectTab('accessibility')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 cursor-pointer ${
              activeTab === 'accessibility'
                ? 'text-teal-400 border-teal-400 font-semibold'
                : 'text-slate-400 hover:text-slate-100 border-transparent'
            }`}
          >
            Accessibility
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onOpenLiveVoiceModal && (
            <button
              onClick={onOpenLiveVoiceModal}
              title="Launch Live Voice Conversation with Gemini 3.8 Live"
              className="px-3.5 py-1.5 text-xs font-semibold text-teal-300 bg-slate-900 hover:bg-slate-800 border border-teal-500/40 hover:border-teal-400 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Live Voice</span>
            </button>
          )}

          <button
            onClick={onOpenGenerateModal}
            className="px-4 py-2 text-xs font-semibold tracking-wide text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
          >
            + Plan with AI
          </button>
        </div>
      </div>
    </header>
  );
};
