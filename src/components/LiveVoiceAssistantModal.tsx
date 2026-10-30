import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EventPlan } from '../types';
import type { LiveEvent } from '../shared/liveProtocol';
import { LIVE_MAX_TEXT_CHARS } from '../shared/liveProtocol';
import { connectGeminiLive, type LiveConnection } from '../live/geminiLive';
import { ApiError, errorMessage } from '../utils/api';
import { LIVE_OUTPUT_RATE, base64PcmToFloat32, downsampleTo16kPcm, int16ToBase64, rms } from '../utils/pcm';
import { Modal } from './ui/Modal';
import { ErrorNotice } from './ui/SourceBadge';

interface LiveVoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: EventPlan;
}

type Status = 'idle' | 'connecting' | 'connected' | 'unavailable' | 'error' | 'closed';

interface Caption {
  id: number;
  speaker: 'user' | 'assistant';
  text: string;
}

const STATUS_TEXT: Record<Status, string> = {
  idle: 'Not connected',
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
export const LiveVoiceAssistantModal: React.FC<LiveVoiceAssistantModalProps> = ({ isOpen, onClose, currentPlan }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);

  const connectionRef = useRef<LiveConnection | null>(null);
  /** Bumped on every start/end so a slow connect that resolves after the dialog closed is discarded. */
  const sessionGen = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const isMicOnRef = useRef(false);
  const playingRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextPlayTimeRef = useRef(0);
  const levelRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captionId = useRef(0);
  /** Set at turn boundaries so the next fragment opens a new caption instead of extending the last. */
  const newCaptionRef = useRef(true);
  const planRef = useRef(currentPlan);
  planRef.current = currentPlan;

  // Streaming transcription arrives in fragments; append to the current caption while the same person is talking.
  const appendCaption = (speaker: Caption['speaker'], text: string) => {
    const startNew = newCaptionRef.current;
    newCaptionRef.current = false;
    setCaptions((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.speaker === speaker && !startNew) {
        return [...prev.slice(0, -1), { ...last, text: `${last.text}${text}` }];
      }
      return [...prev, { id: ++captionId.current, speaker, text: text.trimStart() }];
    });
  };

  const stopPlayback = () => {
    for (const source of playingRef.current) {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    playingRef.current.clear();
    nextPlayTimeRef.current = audioCtxRef.current?.currentTime ?? 0;
    setIsSpeaking(false);
  };

  const playChunk = (base64: string) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const samples = base64PcmToFloat32(base64);
    const buffer = ctx.createBuffer(1, samples.length, LIVE_OUTPUT_RATE);
    buffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    nextPlayTimeRef.current = startAt + buffer.duration;
    playingRef.current.add(source);
    source.onended = () => {
      playingRef.current.delete(source);
      if (playingRef.current.size === 0) setIsSpeaking(false);
    };
    setIsSpeaking(true);
    source.start(startAt);
  };

  const stopMic = () => {
    isMicOnRef.current = false;
    setIsMicOn(false);
    workletRef.current?.disconnect();
    workletRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    levelRef.current = 0;
  };

  const startMic = async () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    setError(null);
    try {
      await ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      micStreamRef.current = stream;
      await ctx.audioWorklet.addModule(new URL('../audio/pcm-capture.worklet.js', import.meta.url));
      const node = new AudioWorkletNode(ctx, 'pcm-capture');
      node.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (!isMicOnRef.current) return;
        levelRef.current = rms(e.data) * 5;
        connectionRef.current?.sendAudio(int16ToBase64(downsampleTo16kPcm(e.data, ctx.sampleRate)));
      };
      ctx.createMediaStreamSource(stream).connect(node);
      workletRef.current = node;
      isMicOnRef.current = true;
      setIsMicOn(true);
    } catch (err) {
      console.warn('Microphone unavailable:', err);
      stopMic();
      setError('Microphone unavailable. You can keep typing your questions instead.');
    }
  };

  const endSession = useCallback(() => {
    sessionGen.current++;
    stopMic();
    stopPlayback();
    connectionRef.current?.close();
    connectionRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
  }, []);

  const handleEvent = (event: LiveEvent) => {
    if (event.type === 'audio') playChunk(event.data);
    else if (event.type === 'caption') appendCaption(event.speaker, event.text);
    else if (event.type === 'interrupted') stopPlayback();
    else if (event.type === 'turnComplete') newCaptionRef.current = true;
  };

  const startSession = useCallback(async () => {
    endSession();
    const gen = sessionGen.current;
    setStatus('connecting');
    setError(null);
    setCaptions([]);

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtxRef.current = new AudioCtx();
    // Opened from a click, so resuming here satisfies browser autoplay rules.
    void audioCtxRef.current.resume().catch(() => undefined);

    const plan = planRef.current;
    try {
      const connection = await connectGeminiLive(
        {
          title: plan.title,
          eventType: plan.eventType,
          guestCount: plan.guestCount,
          totalBudget: plan.totalBudget,
          venueName: plan.venueName,
        },
        {
          onEvent: (event) => {
            if (gen === sessionGen.current) handleEvent(event);
          },
          onError: (message) => {
            if (gen !== sessionGen.current) return;
            setStatus('error');
            setError(message);
          },
          onClose: () => {
            if (gen !== sessionGen.current) return;
            setStatus((s) => (s === 'error' ? s : 'closed'));
            stopMic();
            stopPlayback();
          },
        }
      );
      if (gen !== sessionGen.current) {
        connection.close();
        return;
      }
      connectionRef.current = connection;
      setStatus('connected');
    } catch (err) {
      if (gen !== sessionGen.current) return;
      setStatus(err instanceof ApiError && err.status === 503 ? 'unavailable' : 'error');
      setError(errorMessage(err));
    }
  }, [endSession]);

  useEffect(() => {
    if (!isOpen) return;
    void startSession();
    return () => {
      endSession();
      setStatus('idle');
    };
  }, [isOpen, startSession, endSession]);

  // Decorative level ring. Static under prefers-reduced-motion; only runs while the dialog is open.
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let angle = 0;
    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const level = reduced ? 0.3 : Math.min(1.5, Math.max(0.1, levelRef.current || (isSpeaking ? 0.6 : 0.15)));
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
  }, [isOpen, isSpeaking]);

  const submitTyped = (e: React.FormEvent) => {
    e.preventDefault();
    const text = typed.trim();
    if (!text || status !== 'connected') return;
    connectionRef.current?.sendText(text);
    newCaptionRef.current = true;
    appendCaption('user', text);
    // The reply (or the next spoken fragment) belongs in its own caption.
    newCaptionRef.current = true;
    setTyped('');
  };

  const statusLine = status === 'connected' && isSpeaking ? 'Concierge is responding (captions below)' : STATUS_TEXT[status];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-xl"
      title="Live Planning Concierge"
      description="Real-time conversation with live captions for both sides. Speak, or type if you prefer."
    >
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-4">
          <canvas ref={canvasRef} width={112} height={112} aria-hidden="true" className="w-28 h-28 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white" role="status">
              {statusLine}
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
              {status === 'connected' ? 'Captions will appear here.' : 'Waiting for connection…'}
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
            disabled={status !== 'connected'}
            placeholder="Type a question instead of speaking…"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status !== 'connected' || !typed.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 disabled:opacity-50 cursor-pointer"
          >
            Send
          </button>
        </form>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => (isMicOn ? stopMic() : void startMic())}
            disabled={status !== 'connected'}
            aria-pressed={isMicOn}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50"
          >
            {isMicOn ? 'Turn microphone off' : 'Turn microphone on'}
          </button>
          {status === 'error' || status === 'closed' ? (
            <button
              onClick={() => void startSession()}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 cursor-pointer"
            >
              Reconnect
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 cursor-pointer"
            >
              End conversation
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
