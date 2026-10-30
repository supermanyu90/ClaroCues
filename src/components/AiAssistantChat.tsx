import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, EventPlan, SearchSource } from '../types';
import type { ResponseSource } from '../shared/api';
import { blobToBase64, errorMessage, postJson, safeExternalUrl } from '../utils/api';
import { ErrorNotice, SourceBadge } from './ui/SourceBadge';
import { TabList, TabPanel } from './ui/Tabs';

interface AiAssistantChatProps {
  currentPlan: EventPlan;
  onOpenLiveVoice?: () => void;
  /** Hands a transcript to the ASL prep tool so interpreters get scripts ahead of time. */
  onSendToInterpreterPrep?: (text: string) => void;
}

/** Only the most recent turns are sent upstream to bound request size and cost. */
const MAX_HISTORY = 20;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const AiAssistantChat: React.FC<AiAssistantChatProps> = ({
  currentPlan,
  onOpenLiveVoice,
  onSendToInterpreterPrep,
}) => {
  const [activeMode, setActiveMode] = useState<'chat' | 'searchGrounding' | 'speechTranscription'>('chat');

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      sender: 'assistant',
      content: `Hello! I am your GenAI Event Planning Assistant. I am here to help coordinate every aspect of **${currentPlan.title}** (${currentPlan.eventType}, ${currentPlan.guestCount} guests, $${currentPlan.totalBudget.toLocaleString()} budget).\n\nWhether you need to brainstorm creative themes, negotiate vendor contracts, calculate cost cutbacks, or transcribe day-of speeches, just ask!`,
      timestamp: 'Just now',
      suggestions: [
        'How can I save $2,000 on catering without hurting guest experience?',
        'Draft a polite inquiry email to an acoustic venue',
        'Suggest 3 creative interactive guest activities',
        'Review our day-of timeline for flow and bottlenecks'
      ]
    }
  ]);
  const [inputVal, setInputVal] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Audio Recording & Gemini 3.5 Transcribe state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Speech / Vow Transcription Studio state
  const [dictatedVowText, setDictatedVowText] = useState<string>(
    '“Standing here today, surrounded by the people who mean the world to us, I promise to always listen, celebrate your laughter, and walk with you through every step of this journey.”'
  );
  const [speechType, setSpeechType] = useState<'vows' | 'welcome' | 'toast' | 'vendor_note'>('vows');

  // Google Search Grounding state
  const [searchTopic, setSearchTopic] = useState<string>(
    `Average catering costs per person and trending decor themes for ${currentPlan.eventType}`
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<{
    content: string;
    sources: SearchSource[];
    source: ResponseSource | 'sample';
  }>({
    source: 'sample',
    content: `### Real-World Pricing & Market Intelligence for ${currentPlan.eventType.toUpperCase()}\n\n` +
      `• **Catering & Beverage**: Average buffet service is currently **$48–$75 per guest**; premium multi-course seated dinner ranges from **$95–$165 per guest** including basic service fees.\n` +
      `• **Floral & Visual Styling**: Modern minimalist arrangements featuring high-contrast architectural foliage, stone vessels, and directional uplighting are saving planners 20–30% over traditional dense flower arches.\n` +
      `• **Certified ASL & CART Rates**: RID-certified interpreter teams average **$90–$140/hour** with 2-hour minimums per specialist. Real-time CART transcription averages **$160–$210/hour**.\n` +
      `• **Vendor Contract Terms**: Off-peak booking (Friday evening or Sunday noon) yields 15–25% reductions in venue facility fees across major metropolitan areas.`,
    sources: [
      { title: 'The Knot Real Weddings Cost Study', uri: 'https://www.theknot.com' },
      { title: 'Eventbrite Event Planning Trends & Pricing Index', uri: 'https://www.eventbrite.com' },
      { title: 'Registry of Interpreters for the Deaf (RID) Standards', uri: 'https://rid.org' }
    ]
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }, [messages, isLoading]);

  // Release the microphone and timer if the user navigates away mid-recording.
  useEffect(
    () => () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      recorder?.stream.getTracks().forEach((t) => t.stop());
    },
    []
  );

  // Audio recording handlers (for gemini-3.5-transcribe)
  const startRecording = async (targetField: 'input' | 'vow' = 'input') => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording is not supported in this browser. You can type instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        await processAudioTranscription(audioBlob, targetField);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone recording error:', err);
      setError('Could not access the microphone. Allow microphone permission, or type instead.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // Prevent callback
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const processAudioTranscription = async (blob: Blob, targetField: 'input' | 'vow') => {
    setIsTranscribing(true);
    try {
      const audioBase64 = await blobToBase64(blob);
      const mimeType = blob.type.split(';')[0] || 'audio/webm';
      const data = await postJson<{ transcription: string }>('/api/gemini/transcribe', { audioBase64, mimeType });
      const text = data.transcription || '';
      if (targetField === 'input') {
        setInputVal((prev) => (prev ? `${prev} ${text}` : text));
      } else {
        setDictatedVowText(text);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsTranscribing(false);
    }
  };

  // Google Search Grounding handler (gemini-3.8-flash + googleSearch)
  const handleSearchGrounding = async (overrideTopic?: string) => {
    const topicToUse = (overrideTopic || searchTopic).trim();
    if (!topicToUse || isSearching) return;

    setIsSearching(true);
    setError(null);
    try {
      const data = await postJson<{ content: string; sources: SearchSource[]; source: ResponseSource }>(
        '/api/gemini/search-intelligence',
        { topic: topicToUse, eventType: currentPlan.eventType }
      );
      setSearchResult({ content: data.content || '', sources: data.sources || [], source: data.source });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSearching(false);
    }
  };

  // Chat message send handler
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsLoading(true);

    setError(null);
    try {
      const history = [...messages, userMsg].slice(-MAX_HISTORY).map((m) => ({ sender: m.sender, content: m.content }));
      const data = await postJson<{ content: string; suggestions?: string[]; source: ResponseSource }>(
        '/api/gemini/assistant-chat',
        {
          messages: history,
          eventContext: {
            title: currentPlan.title,
            eventType: currentPlan.eventType,
            guestCount: currentPlan.guestCount,
            totalBudget: currentPlan.totalBudget,
            venueName: currentPlan.venueName,
            theme: currentPlan.theme,
            dhhPercentage: currentPlan.dhhPercentage,
          },
        }
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: data.suggestions,
          source: data.source,
        },
      ]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Could not copy to the clipboard.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
            <span className="text-teal-400 font-semibold">Gemini Multi-Modal Suite</span>
            <span aria-hidden="true">·</span>
            <span>Gemini 3.8 Flash (Search)</span>
            <span aria-hidden="true">·</span>
            <span>Gemini 3.5 Transcribe</span>
            <span aria-hidden="true">·</span>
            <span>Gemini 3.8 Live</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            GenAI Planning Assistant & Intelligence Suite
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Strategize timelines, conduct live web market research with Google Search Grounding, record voice notes transcribed verbatim via Gemini 3.5 Transcribe, or enter real-time voice conversations.
          </p>
        </div>

        {/* Live Voice CTA & Context Badge */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {onOpenLiveVoice && (
            <button
              onClick={onOpenLiveVoice}
              className="px-4 py-2.5 rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span><span aria-hidden="true">🎙️ </span>Live concierge (captioned)</span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-950/20">
                Gemini 3.8 Live
              </span>
            </button>
          )}

          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
            <div className="text-slate-400">Current Plan:</div>
            <div className="font-semibold text-white truncate max-w-xs">{currentPlan.title}</div>
            <div className="text-[11px] text-teal-400 font-mono">
              ${currentPlan.totalBudget.toLocaleString()} · {currentPlan.guestCount} Guests
            </div>
          </div>
        </div>
      </div>

      <TabList
        tabs={[
          { key: 'chat', label: 'Planning chat' },
          { key: 'searchGrounding', label: 'Market research (Google Search)' },
          { key: 'speechTranscription', label: 'Speech & vow dictation' },
        ]}
        active={activeMode}
        onChange={setActiveMode}
        idPrefix="assistant"
        label="Assistant modes"
        className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs font-medium overflow-x-auto"
        tabClassName={(selected) =>
          `px-4 py-2 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            selected ? 'bg-slate-800 text-teal-300 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`
        }
      />

      <ErrorNotice message={error} onDismiss={() => setError(null)} />

      <TabPanel idPrefix="assistant" tabKey={activeMode} className="focus:outline-none">
      {/* MODE 1: Interactive Chat with Mic Voice Input */}
      {activeMode === 'chat' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[650px]">
          {/* Messages Stream */}
          <div
            className="flex-1 overflow-y-auto p-6 space-y-5"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversation with the planning assistant"
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1 font-mono">
                    <span>{isUser ? 'You' : 'ClaroCues AI Assistant'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{msg.timestamp}</span>
                    {!isUser && msg.source && <SourceBadge source={msg.source} />}
                  </div>

                  <div
                    className={`max-w-3xl rounded-xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-teal-500/20 border border-teal-500/40 text-teal-50 rounded-br-none'
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans space-y-2">{msg.content}</div>

                    {!isUser && (
                      <div className="mt-3 pt-2 border-t border-slate-800 flex justify-end">
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                        >
                          {copiedId === msg.id ? '✓ Copied to clipboard' : 'Copy Response'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Assistant Suggestion Chips */}
                  {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 max-w-2xl">
                      {msg.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(suggestion)}
                          className="px-2.5 py-1 text-[11px] text-slate-300 hover:text-teal-200 bg-slate-950/70 border border-slate-800 hover:border-teal-500/50 rounded-full transition-colors cursor-pointer text-left"
                        >
                          &ldquo;{suggestion}&rdquo;
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex flex-col items-start space-y-1.5" role="status">
                <div className="text-[11px] text-slate-400 px-1 font-mono">
                  ClaroCues AI is analyzing...
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 motion-safe:animate-ping" />
                  <span>Formulating personalized event recommendation...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Recording Banner if active */}
          {isRecording && (
            <div role="status" className="bg-rose-950/70 border-t border-rose-800/80 px-4 py-2.5 flex items-center justify-between text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-rose-500 motion-safe:animate-ping" />
                <span className="font-semibold">Recording Voice Memo... ({recordingSeconds}s)</span>
                <span className="text-rose-400 text-[11px]">Speak clearly into your microphone</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={stopRecording}
                  className="px-3 py-1 rounded bg-rose-500 hover:bg-rose-400 text-white font-semibold transition-colors cursor-pointer"
                >
                  Done & Transcribe
                </button>
                <button
                  onClick={cancelRecording}
                  className="px-2 py-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isTranscribing && (
            <div role="status" className="bg-teal-950/70 border-t border-teal-800/80 px-4 py-2 flex items-center gap-2 text-xs text-teal-200">
              <span className="w-2 h-2 rounded-full bg-teal-400 motion-safe:animate-ping" />
              <span>Transcribing audio with Gemini 3.5 Transcribe...</span>
            </div>
          )}

          {/* Input Bar */}
          <div className="border-t border-slate-800 p-4 bg-slate-950/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 sm:gap-3"
            >
              <button
                type="button"
                onClick={isRecording ? stopRecording : () => startRecording('input')}
                title={isRecording ? 'Stop recording' : 'Dictate with Gemini 3.5 Transcribe'}
                aria-label={isRecording ? 'Stop recording and transcribe' : 'Dictate a message by voice'}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                  isRecording
                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-teal-300 hover:border-teal-500/50'
                }`}
              >
                <span aria-hidden="true">🎙️</span>
              </button>

              <input
                type="text"
                aria-label="Message the planning assistant"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask anything (e.g. 'Draft email to caterer', 'How to cut $1,500', 'Unique 40th birthday games')..."
                disabled={isLoading || isRecording}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-sans"
              />

              <button
                type="submit"
                disabled={isLoading || !inputVal.trim() || isRecording}
                className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-sm"
              >
                Ask AI
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODE 2: Google Search Grounding Market Intelligence */}
      {activeMode === 'searchGrounding' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Real-World Market Pricing & Industry Benchmarks
                </h3>
                <p className="text-xs text-slate-400">
                  Powered by Gemini 3.8 Flash with live Google Search Grounding
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                googleSearch Tool
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchGrounding();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                aria-label="Market research topic"
                value={searchTopic}
                onChange={(e) => setSearchTopic(e.target.value)}
                placeholder="Research market topic (e.g. Average wedding floral budget, DJ pricing, catering per-person rates)..."
                disabled={isSearching}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={isSearching || !searchTopic.trim()}
                className="px-6 py-2.5 text-sm font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                {isSearching ? 'Searching Live Web...' : 'Research Market'}
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-slate-400 font-medium">Quick Benchmarks:</span>
              {[
                `Per-person catering benchmarks for ${currentPlan.guestCount} guests`,
                `Average cost of certified ASL interpreter teams for events`,
                `Sound-to-light LED dance floor rental rates and setup time`,
                `Photographer hourly packages and contracts for ${currentPlan.eventType}`
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSearchTopic(preset);
                    handleSearchGrounding(preset);
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 hover:border-teal-500/50 text-slate-300 hover:text-teal-200 transition-colors cursor-pointer text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Search Results Display */}
          {isSearching ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm font-medium text-slate-200">
                Grounding with live Google Search results...
              </div>
              <div className="text-xs text-slate-400 max-w-md mx-auto">
                Consulting industry reports, vendor pricing sheets, and recent event benchmarks via Gemini 3.8 Flash.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Web Sources Strip */}
              {searchResult.sources.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex flex-wrap items-center gap-2">
                    <span>{searchResult.source === 'gemini' ? 'Google Search citations' : 'Reference links'} ({searchResult.sources.length})</span>
                    <SourceBadge source={searchResult.source} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchResult.sources.map((source, sIdx) => (
                      <a
                        key={sIdx}
                        href={safeExternalUrl(source.uri) ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-teal-500 text-teal-300 hover:text-teal-200 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="truncate max-w-xs font-medium">{source.title}</span>
                        <span aria-hidden="true" className="text-[11px]">↗</span>
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {searchResult.sources.length === 0 && <SourceBadge source={searchResult.source} />}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                {searchResult.content}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: Speech & Vow Dictation Studio (Gemini 3.5 Transcribe) */}
      {activeMode === 'speechTranscription' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Audio Speech & Vow Dictation Studio
                </h3>
                <p className="text-xs text-slate-400">
                  Accurate speech-to-text powered by Gemini 3.5 Transcribe
                </p>
              </div>

              {/* Dictation Category */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
                {(['vows', 'welcome', 'toast', 'vendor_note'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSpeechType(cat)}
                    aria-pressed={speechType === cat}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer capitalize ${
                      speechType === cat
                        ? 'bg-slate-800 text-teal-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Recording Controls */}
            <div className="flex flex-col items-center justify-center py-6 bg-slate-950/60 border border-slate-800 rounded-xl space-y-4">
              <button
                onClick={isRecording ? stopRecording : () => startRecording('vow')}
                aria-label={isRecording ? 'Stop recording and transcribe' : 'Start dictating'}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-transform cursor-pointer ${
                  isRecording
                    ? 'bg-rose-500 text-white scale-110 motion-safe:animate-pulse'
                    : 'bg-teal-400 hover:bg-teal-300 text-slate-950 hover:scale-105'
                }`}
              >
                <span aria-hidden="true">{isRecording ? '⏹️' : '🎙️'}</span>
              </button>

              <div className="text-center space-y-1" aria-live="polite">
                <div className="text-sm font-semibold text-white">
                  {isRecording ? `Recording in progress... (${recordingSeconds}s)` : 'Click to start dictating'}
                </div>
                <div className="text-xs text-slate-400">
                  {isRecording
                    ? 'Speak naturally—Gemini 3.5 Transcribe captures pauses, emotional pacing, and exact wording'
                    : 'Record your vows, welcoming address, host toasts, or verbal vendor briefings'}
                </div>
              </div>

              {isTranscribing && (
                <div role="status" className="text-xs text-teal-300 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 motion-safe:animate-ping" />
                  Transcribing via Gemini 3.5 Transcribe...
                </div>
              )}
            </div>

            {/* Verbatim Transcribed Text Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="dictation-transcript" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Verbatim Speech Transcript
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(dictatedVowText, 'vow-copy')}
                    className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedId === 'vow-copy' ? '✓ Copied' : 'Copy Text'}
                  </button>
                  <button
                    onClick={() => {
                      setInputVal(`Review and polish this speech draft for ${currentPlan.eventType}: "${dictatedVowText}"`);
                      setActiveMode('chat');
                    }}
                    className="text-xs text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    Send to AI Chat to Polish →
                  </button>
                  {onSendToInterpreterPrep && (
                    <button
                      onClick={() => onSendToInterpreterPrep(dictatedVowText)}
                      disabled={!dictatedVowText.trim()}
                      className="text-xs text-teal-400 hover:text-teal-300 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Send to Interpreter Prep (ASL gloss) →
                    </button>
                  )}
                </div>
              </div>

              <textarea
                id="dictation-transcript"
                value={dictatedVowText}
                onChange={(e) => setDictatedVowText(e.target.value)}
                rows={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 leading-relaxed font-sans"
              />
            </div>
          </div>
        </div>
      )}
      </TabPanel>
    </div>
  );
};
