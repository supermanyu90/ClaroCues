export type NavTab = 'assistant' | 'ideas' | 'budget' | 'timeline' | 'vendors' | 'venues' | 'accessibility';

interface HeaderProps {
  onGoHome: () => void;
  onOpenGenerateModal: () => void;
  onOpenLiveVoiceModal: () => void;
}

export const Header = ({ onGoHome, onOpenGenerateModal, onOpenLiveVoiceModal }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-teal-400 focus:text-slate-950 focus:font-semibold"
      >
        Skip to main content
      </a>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        <button
          onClick={onGoHome}
          className="text-lg font-bold tracking-tight text-white hover:text-teal-400 transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer flex items-center gap-2"
        >
          <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-teal-400" />
          <span>ClaroCues</span>
        </button>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenLiveVoiceModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-teal-300 bg-slate-900 hover:bg-slate-800 border border-teal-500/40 hover:border-teal-400 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
          >
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-teal-400 motion-safe:animate-pulse" />
            <span>Live Concierge (captioned)</span>
          </button>
          <button
            onClick={onOpenGenerateModal}
            className="px-4 py-2 text-xs font-semibold tracking-wide text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            + Plan with AI
          </button>
        </div>
      </div>
    </header>
  );
};
