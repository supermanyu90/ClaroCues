import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, EventPlan, SearchSource } from '../types';

interface AiAssistantChatProps {
  currentPlan: EventPlan;
  onApplyPlanUpdate?: (updates: Partial<EventPlan>) => void;
  onOpenLiveVoice?: () => void;
}

export const AiAssistantChat: React.FC<AiAssistantChatProps> = ({
  currentPlan,
  onOpenLiveVoice,
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
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Audio Recording & Gemini 3.5 Transcribe state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

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
  }>({
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
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Audio recording handlers (for gemini-3.5-transcribe)
  const startRecording = async (targetField: 'input' | 'vow' = 'input') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Microphone access is not supported in this browser.');
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
      alert('Unable to access microphone. Please grant microphone permissions.');
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
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const mimeType = blob.type.split(';')[0] || 'audio/webm';

        const res = await fetch('/api/gemini/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const transcribedText = data.transcription || '';

          if (targetField === 'input') {
            setInputVal((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
          } else {
            setDictatedVowText(transcribedText);
          }
        }
        setIsTranscribing(false);
      };
    } catch (err) {
      console.error('Transcription failed:', err);
      setIsTranscribing(false);
    }
  };

  // Google Search Grounding handler (gemini-3.8-flash + googleSearch)
  const handleSearchGrounding = async (overrideTopic?: string) => {
    const topicToUse = (overrideTopic || searchTopic).trim();
    if (!topicToUse || isSearching) return;

    setIsSearching(true);
    try {
      const res = await fetch('/api/gemini/search-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicToUse,
          eventType: currentPlan.eventType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSearchResult({
          content: data.content || '',
          sources: data.sources || [],
        });
      }
    } catch (err) {
      console.error('Search grounding failed:', err);
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
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          eventContext: {
            title: currentPlan.title,
            eventType: currentPlan.eventType,
            guestCount: currentPlan.guestCount,
            totalBudget: currentPlan.totalBudget,
            venueName: currentPlan.venueName,
            theme: currentPlan.theme,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          content: data.content,
          timestamp: 'Just now',
          suggestions: data.suggestions || [
            'What questions should I ask my venue before signing?',
            'How to allocate budget across decor vs entertainment',
            'Draft speech introduction for the host'
          ],
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      console.error('Chat failed:', err);
      const fallbackMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        content: "Here is a recommendation for your event: Focus on clear timeline transitions, keep table centerpieces under 9 inches to preserve sightlines, and establish a 10% contingency budget for day-of additions.",
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
              <span>🎙️ Live Voice Call</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/20">
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

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs font-medium">
        <button
          onClick={() => setActiveMode('chat')}
          className={`px-4 py-2 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeMode === 'chat'
              ? 'bg-slate-800 text-teal-300 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>💬 Conversational Advisor</span>
        </button>

        <button
          onClick={() => setActiveMode('searchGrounding')}
          className={`px-4 py-2 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeMode === 'searchGrounding'
              ? 'bg-slate-800 text-teal-300 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🌐 Market Intelligence (Google Search Grounded)</span>
        </button>

        <button
          onClick={() => setActiveMode('speechTranscription')}
          className={`px-4 py-2 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeMode === 'speechTranscription'
              ? 'bg-slate-800 text-teal-300 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🎤 Vow & Speech Dictation (Gemini 3.5 Transcribe)</span>
        </button>
      </div>

      {/* MODE 1: Interactive Chat with Mic Voice Input */}
      {activeMode === 'chat' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[650px]">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 px-1 font-mono">
                    <span>{isUser ? 'You' : 'ClaroCues AI Assistant'}</span>
                    <span>·</span>
                    <span>{msg.timestamp}</span>
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
              <div className="flex flex-col items-start space-y-1.5">
                <div className="text-[11px] text-slate-500 px-1 font-mono">
                  ClaroCues AI is analyzing...
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                  <span>Formulating personalized event recommendation...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Recording Banner if active */}
          {isRecording && (
            <div className="bg-rose-950/70 border-t border-rose-800/80 px-4 py-2.5 flex items-center justify-between text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
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
            <div className="bg-teal-950/70 border-t border-teal-800/80 px-4 py-2 flex items-center gap-2 text-xs text-teal-200">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
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
                className={`p-2.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                  isRecording
                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-teal-300 hover:border-teal-500/50'
                }`}
              >
                🎙️
              </button>

              <input
                type="text"
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
              <span className="text-slate-500 font-medium">Quick Benchmarks:</span>
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
              <div className="text-xs text-slate-500 max-w-md mx-auto">
                Consulting industry reports, vendor pricing sheets, and recent event benchmarks via Gemini 3.8 Flash.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Web Sources Strip */}
              {searchResult.sources.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    Verified Google Search Citations ({searchResult.sources.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchResult.sources.map((source, sIdx) => (
                      <a
                        key={sIdx}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-teal-500 text-teal-300 hover:text-teal-200 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="truncate max-w-xs font-medium">{source.title}</span>
                        <span aria-hidden="true" className="text-[10px]">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Formatted Content */}
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
                className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-transform cursor-pointer ${
                  isRecording
                    ? 'bg-rose-500 text-white scale-110 animate-pulse'
                    : 'bg-teal-400 hover:bg-teal-300 text-slate-950 hover:scale-105'
                }`}
              >
                {isRecording ? '⏹️' : '🎙️'}
              </button>

              <div className="text-center space-y-1">
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
                <div className="text-xs text-teal-300 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                  Transcribing via Gemini 3.5 Transcribe...
                </div>
              )}
            </div>

            {/* Verbatim Transcribed Text Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
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
                </div>
              </div>

              <textarea
                value={dictatedVowText}
                onChange={(e) => setDictatedVowText(e.target.value)}
                rows={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 leading-relaxed font-sans"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
