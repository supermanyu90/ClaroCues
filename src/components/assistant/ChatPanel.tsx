import { useEffect, useRef, useState } from 'react';
import { useDictation } from '../../hooks/useDictation';
import { sendChat } from '../../services/apiClient';
import type { ChatMessage, EventPlan } from '../../types';
import { errorMessage } from '../../utils/api';
import { createId } from '../../utils/id';
import { prefersReducedMotion } from '../../utils/motion';
import { SourceBadge } from '../ui/SourceBadge';
import { CopyButton } from './CopyButton';

/** Only the most recent turns are sent upstream, to bound request size and cost. */
const MAX_HISTORY = 20;

const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function greeting(plan: EventPlan): ChatMessage {
  return {
    id: 'greeting',
    sender: 'assistant',
    content:
      `Hello! I can help with every part of **${plan.title}** (${plan.eventType}, ${plan.guestCount} guests, ` +
      `$${plan.totalBudget.toLocaleString()} budget): budgets, vendors, timelines and making sure every guest can follow along.`,
    timestamp: 'Just now',
    suggestions: [
      'How can I save $2,000 on catering without cutting access?',
      'What should I ask an interpreter agency before booking?',
      'Suggest 3 activities Deaf and hearing guests can enjoy together',
      'Review our day-of timeline for interpreter swaps',
    ],
  };
}

interface ChatPanelProps {
  plan: EventPlan;
  /** Controlled input so other panels can hand text to the chat (e.g. "polish this speech"). */
  input: string;
  onInputChange: (value: string) => void;
  onError: (message: string | null) => void;
}

export const ChatPanel = ({ plan, input, onInputChange, onError }: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greeting(plan)]);
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const dictation = useDictation({
    onTranscript: (text) => onInputChange(input ? `${input} ${text}` : text),
    onError,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }, [messages, isLoading]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isLoading) return;
    const userMessage: ChatMessage = { id: createId('u'), sender: 'user', content: text, timestamp: timeNow() };
    const history = [...messages, userMessage].slice(-MAX_HISTORY).map(({ sender, content }) => ({ sender, content }));
    setMessages((prev) => [...prev, userMessage]);
    onInputChange('');
    onError(null);
    setIsLoading(true);
    try {
      const reply = await sendChat(history, plan);
      setMessages((prev) => [
        ...prev,
        {
          id: createId('a'),
          sender: 'assistant',
          content: reply.content,
          timestamp: timeNow(),
          suggestions: reply.suggestions,
          source: reply.source,
        },
      ]);
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[650px]">
      <div
        className="flex-1 overflow-y-auto p-6 space-y-5"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversation with the planning assistant"
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onSuggestion={(s) => void send(s)} onCopyError={onError} />
        ))}
        {isLoading && (
          <p role="status" className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 w-fit">
            The assistant is thinking…
          </p>
        )}
        <div ref={endRef} />
      </div>

      {dictation.isRecording && (
        <div
          role="status"
          className="bg-rose-950/70 border-t border-rose-800/80 px-4 py-2.5 flex items-center justify-between text-xs text-rose-200"
        >
          <span className="font-semibold">Recording voice message… ({dictation.seconds}s)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={dictation.stop}
              className="px-3 py-1 rounded bg-rose-500 hover:bg-rose-400 text-white font-semibold cursor-pointer"
            >
              Done & transcribe
            </button>
            <button onClick={dictation.cancel} className="px-2 py-1 text-slate-300 hover:text-white cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}
      {dictation.isTranscribing && (
        <p role="status" className="bg-teal-950/70 border-t border-teal-800/80 px-4 py-2 text-xs text-teal-200">
          Transcribing your recording…
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="border-t border-slate-800 p-4 bg-slate-950/80 flex items-center gap-2 sm:gap-3"
      >
        <button
          type="button"
          onClick={dictation.isRecording ? dictation.stop : () => void dictation.start()}
          aria-label={dictation.isRecording ? 'Stop recording and transcribe' : 'Dictate a message by voice'}
          className={`p-2.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
            dictation.isRecording
              ? 'bg-rose-500 text-white border-rose-400'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-teal-300 hover:border-teal-500/50'
          }`}
        >
          <span aria-hidden="true">🎙️</span>
        </button>
        <input
          type="text"
          aria-label="Message the planning assistant"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          maxLength={4000}
          placeholder="Ask anything, e.g. 'Draft an email to our caterer' or 'How do we cut $1,500?'"
          disabled={isLoading || dictation.isRecording}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || dictation.isRecording}
          className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          Ask AI
        </button>
      </form>
    </div>
  );
};

interface MessageBubbleProps {
  message: ChatMessage;
  onSuggestion: (text: string) => void;
  onCopyError: (message: string) => void;
}

const MessageBubble = ({ message, onSuggestion, onCopyError }: MessageBubbleProps) => {
  const isUser = message.sender === 'user';
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}>
      <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1 font-mono">
        <span>{isUser ? 'You' : 'ClaroCues AI Assistant'}</span>
        <span aria-hidden="true">·</span>
        <span>{message.timestamp}</span>
        {!isUser && message.source && <SourceBadge source={message.source} />}
      </div>
      <div
        className={`max-w-3xl rounded-xl p-4 text-xs sm:text-sm leading-relaxed ${
          isUser
            ? 'bg-teal-500/20 border border-teal-500/40 text-teal-50 rounded-br-none'
            : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {!isUser && (
          <div className="mt-3 pt-2 border-t border-slate-800 flex justify-end">
            <CopyButton text={message.content} label="Copy response" onError={onCopyError} />
          </div>
        )}
      </div>
      {!isUser && message.suggestions && message.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 max-w-2xl">
          {message.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestion(suggestion)}
              className="px-2.5 py-1 text-[11px] text-slate-300 hover:text-teal-200 bg-slate-950/70 border border-slate-800 hover:border-teal-500/50 rounded-full transition-colors cursor-pointer text-left"
            >
              &ldquo;{suggestion}&rdquo;
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
