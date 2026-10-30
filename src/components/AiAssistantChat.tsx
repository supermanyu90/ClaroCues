import { useState } from 'react';
import type { EventPlan } from '../types';
import { ChatPanel } from './assistant/ChatPanel';
import { DictationStudio } from './assistant/DictationStudio';
import { MarketResearchPanel } from './assistant/MarketResearchPanel';
import { ErrorNotice } from './ui/SourceBadge';
import { TabList, TabPanel } from './ui/Tabs';

type AssistantMode = 'chat' | 'research' | 'dictation';

const MODES: { key: AssistantMode; label: string }[] = [
  { key: 'chat', label: 'Planning chat' },
  { key: 'research', label: 'Market research (Google Search)' },
  { key: 'dictation', label: 'Speech & vow dictation' },
];

interface AiAssistantChatProps {
  currentPlan: EventPlan;
  onOpenLiveVoice?: () => void;
  /** Hands a transcript to the ASL prep tool so interpreters get scripts ahead of time. */
  onSendToInterpreterPrep?: (text: string) => void;
}

export const AiAssistantChat = ({ currentPlan, onOpenLiveVoice, onSendToInterpreterPrep }: AiAssistantChatProps) => {
  const [mode, setMode] = useState<AssistantMode>('chat');
  const [chatInput, setChatInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <h2 className="text-xl font-bold text-white tracking-tight">Planning Assistant</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Ask planning questions, research current prices with cited sources, or dictate speeches and send the
            transcript to your interpreter team.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {onOpenLiveVoice && (
            <button
              onClick={onOpenLiveVoice}
              className="px-4 py-2.5 rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              <span aria-hidden="true">🎙️ </span>Live concierge (captioned)
            </button>
          )}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
            <div className="text-slate-400">Current plan:</div>
            <div className="font-semibold text-white truncate max-w-xs">{currentPlan.title}</div>
            <div className="text-[11px] text-teal-400 font-mono">
              ${currentPlan.totalBudget.toLocaleString()} · {currentPlan.guestCount} guests
            </div>
          </div>
        </div>
      </div>

      <TabList
        tabs={MODES}
        active={mode}
        onChange={setMode}
        idPrefix="assistant"
        label="Assistant modes"
        className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs font-medium overflow-x-auto"
        tabClassName={(selected) =>
          `px-4 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            selected ? 'bg-slate-800 text-teal-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`
        }
      />

      <ErrorNotice message={error} onDismiss={() => setError(null)} />

      {/* All panels stay mounted so the conversation and drafts survive switching modes. */}
      <TabPanel idPrefix="assistant" tabKey="chat" hidden={mode !== 'chat'}>
        <ChatPanel plan={currentPlan} input={chatInput} onInputChange={setChatInput} onError={setError} />
      </TabPanel>
      <TabPanel idPrefix="assistant" tabKey="research" hidden={mode !== 'research'}>
        <MarketResearchPanel plan={currentPlan} onError={setError} />
      </TabPanel>
      <TabPanel idPrefix="assistant" tabKey="dictation" hidden={mode !== 'dictation'}>
        <DictationStudio
          eventType={currentPlan.eventType}
          onPolish={(prompt) => {
            setChatInput(prompt);
            setMode('chat');
          }}
          onSendToInterpreterPrep={onSendToInterpreterPrep}
          onError={setError}
        />
      </TabPanel>
    </div>
  );
};
