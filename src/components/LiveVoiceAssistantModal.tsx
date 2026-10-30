import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLiveSession, type LiveStatus } from '../live/useLiveSession';
import { LIVE_MAX_TEXT_CHARS, type LiveEventContext } from '../shared/liveProtocol';
import type { EventPlan } from '../types';
import { prefersReducedMotion } from '../utils/motion';
import { Modal } from './ui/Modal';
import { ErrorNotice } from './ui/SourceBadge';

interface LiveVoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: EventPlan;
}

const STATUS_TEXT: Record<LiveStatus, string> = {
  connecting: 'Connecting…',
  connected: 'Connected. Speak or type below',
  unavailable: 'Live concierge unavailable',
  error: 'Connection interrupted',
  closed: 'Session ended',
};

/**
 * Captions-first live concierge. Every word, spoken by the user or by Gemini, is shown as text,
 * and users can type instead of speaking, so the feature works for Deaf and Hard-of-Hearing planners.
 */
export const LiveVoiceAssistantModal = ({ isOpen, onClose, currentPlan }: LiveVoiceAssistantModalProps) => {
  // Each attempt is a fresh mount, so reconnecting needs no manual state reset.
  const [attempt, setAttempt] = useState(0);
  const context: LiveEventContext = {
    title: currentPlan.title,
    eventType: currentPlan.eventType,
    guestCount: currentPlan.guestCount,
    totalBudget: currentPlan.totalBudget,
    venueName: currentPlan.venueName,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-xl"
      title="Live Planning Concierge"
      description="Real-time conversation with live captions for both sides. Speak, or type if you prefer."
    >
      {isOpen && (
        <LiveSessionPanel
          key={attempt}
          context={context}
          onReconnect={() => setAttempt((n) => n + 1)}
          onEnd={onClose}
        />
      )}
    </Modal>
  );
};

interface LiveSessionPanelProps {
  context: LiveEventContext;
  onReconnect: () => void;
  onEnd: () => void;
}

const LiveSessionPanel = ({ context, onReconnect, onEnd }: LiveSessionPanelProps) => {
  const { status, captions, error, setError, isMicOn, isSpeaking, startMic, stopMic, sendText, readMicLevel } =
    useLiveSession(context);
  const [typed, setTyped] = useState('');
  const connected = status === 'connected';

  const submitTyped = (e: FormEvent) => {
    e.preventDefault();
    const text = typed.trim();
    if (!text || !connected) return;
    sendText(text);
    setTyped('');
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-4">
        <LevelRing isSpeaking={isSpeaking} readLevel={readMicLevel} />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white" role="status">
            {connected && isSpeaking ? 'Concierge is responding (captions below)' : STATUS_TEXT[status]}
          </p>
          <p className="text-xs text-slate-400">
            {isMicOn ? 'Microphone on: your speech is captioned as you talk.' : 'Microphone off.'}
          </p>
        </div>
      </div>

      <ErrorNotice message={error} onDismiss={() => setError(null)} />

      <div
        role="log"
        aria-live="polite"
        aria-label="Live captions"
        className="bg-slate-950 border border-slate-800 rounded-xl p-4 h-64 overflow-y-auto space-y-3 text-base leading-relaxed"
      >
        {captions.length === 0 ? (
          <p className="text-sm text-slate-400">
            {connected ? 'Captions will appear here.' : 'Waiting for connection…'}
          </p>
        ) : (
          captions.map((c) => (
            <p key={c.id} className={c.speaker === 'assistant' ? 'text-slate-100' : 'text-teal-200'}>
              <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                {c.speaker === 'assistant' ? 'Concierge' : 'You'}
              </span>
              {c.text}
            </p>
          ))
        )}
      </div>

      <form onSubmit={submitTyped} className="flex gap-2">
        <label htmlFor="live-typed" className="sr-only">
          Type a message to the concierge
        </label>
        <input
          id="live-typed"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          maxLength={LIVE_MAX_TEXT_CHARS}
          disabled={!connected}
          placeholder="Type a question instead of speaking…"
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!connected || !typed.trim()}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 disabled:opacity-50 cursor-pointer"
        >
          Send
        </button>
      </form>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
        <button
          onClick={() => (isMicOn ? stopMic() : void startMic())}
          disabled={!connected}
          aria-pressed={isMicOn}
          className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50"
        >
          {isMicOn ? 'Turn microphone off' : 'Turn microphone on'}
        </button>
        {status === 'error' || status === 'closed' ? (
          <button
            onClick={onReconnect}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 cursor-pointer"
          >
            Reconnect
          </button>
        ) : (
          <button
            onClick={onEnd}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 cursor-pointer"
          >
            End conversation
          </button>
        )}
      </div>
    </div>
  );
};

/** Decorative input-level ring. Static under prefers-reduced-motion. */
const LevelRing = ({ isSpeaking, readLevel }: { isSpeaking: boolean; readLevel: () => number }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = prefersReducedMotion();
    let frame = 0;
    let angle = 0;
    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const level = reduced ? 0.3 : Math.min(1.5, Math.max(0.1, readLevel() || (isSpeaking ? 0.6 : 0.15)));
      const radius = 30 + level * 18;
      angle += 0.03;
      ctx.beginPath();
      for (let i = 0; i <= 360; i += 6) {
        const rad = (i * Math.PI) / 180;
        const r = radius + Math.sin(rad * 8 + angle) * level * 8;
        const x = width / 2 + r * Math.cos(rad);
        const y = height / 2 + r * Math.sin(rad);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = isSpeaking ? 'rgba(45, 212, 191, 0.2)' : 'rgba(56, 189, 248, 0.14)';
      ctx.fill();
      ctx.strokeStyle = isSpeaking ? '#2dd4bf' : '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [isSpeaking, readLevel]);

  return <canvas ref={canvasRef} width={112} height={112} aria-hidden="true" className="w-28 h-28 shrink-0" />;
};
