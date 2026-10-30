import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveEventContext } from '../shared/liveProtocol';
import { ApiError, errorMessage } from '../utils/api';
import { MicCapture, PcmPlayer, createAudioContext } from './audio';
import { appendCaption, type Caption } from './captions';
import { connectGeminiLive, type LiveConnection } from './geminiLive';

export type LiveStatus = 'connecting' | 'connected' | 'unavailable' | 'error' | 'closed';

/**
 * One live concierge session. It connects on mount and tears everything down (socket, mic, audio)
 * on unmount, so callers start a fresh session by remounting with a new `key`.
 */
export function useLiveSession(context: LiveEventContext) {
  const [initialContext] = useState(context);
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const connectionRef = useRef<LiveConnection | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const nextCaptionId = useRef(1);
  /** Set at turn boundaries so the next fragment opens a new caption. */
  const turnBoundary = useRef(true);

  const addCaption = useCallback((speaker: Caption['speaker'], text: string) => {
    const startNew = turnBoundary.current;
    turnBoundary.current = false;
    const id = nextCaptionId.current++;
    setCaptions((prev) => appendCaption(prev, speaker, text, startNew, id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ctx = createAudioContext();
    audioCtxRef.current = ctx;
    // Opened from a click, so resuming here satisfies browser autoplay rules.
    void ctx.resume().catch(() => undefined);
    const player = new PcmPlayer(ctx, setIsSpeaking);

    connectGeminiLive(initialContext, {
      onEvent: (event) => {
        if (cancelled) return;
        if (event.type === 'audio') player.play(event.data);
        else if (event.type === 'caption') addCaption(event.speaker, event.text);
        else if (event.type === 'interrupted') player.stop();
        else turnBoundary.current = true;
      },
      onError: (message) => {
        if (cancelled) return;
        setStatus('error');
        setError(message);
      },
      onClose: () => {
        if (cancelled) return;
        setStatus((s) => (s === 'error' ? s : 'closed'));
        micRef.current?.stop();
        setIsMicOn(false);
        player.stop();
      },
    })
      .then((connection) => {
        if (cancelled) return connection.close();
        connectionRef.current = connection;
        setStatus('connected');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus(err instanceof ApiError && err.status === 503 ? 'unavailable' : 'error');
        setError(errorMessage(err));
      });

    return () => {
      cancelled = true;
      micRef.current?.stop();
      micRef.current = null;
      player.stop();
      connectionRef.current?.close();
      connectionRef.current = null;
      void ctx.close().catch(() => undefined);
      audioCtxRef.current = null;
    };
  }, [initialContext, addCaption]);

  const startMic = async () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    setError(null);
    const mic = new MicCapture(ctx);
    try {
      await mic.start((chunk) => connectionRef.current?.sendAudio(chunk));
      micRef.current = mic;
      setIsMicOn(true);
    } catch (err) {
      console.warn('Microphone unavailable:', err);
      mic.stop();
      setError('Microphone unavailable. You can keep typing your questions instead.');
    }
  };

  const stopMic = () => {
    micRef.current?.stop();
    micRef.current = null;
    setIsMicOn(false);
  };

  const sendText = (text: string) => {
    connectionRef.current?.sendText(text);
    turnBoundary.current = true;
    addCaption('user', text);
    // The reply, or the next spoken fragment, belongs in its own caption.
    turnBoundary.current = true;
  };

  /** Current mic input level for the visualiser; read inside animation frames, not during render. */
  const readMicLevel = useCallback(() => micRef.current?.level ?? 0, []);

  return { status, captions, error, setError, isMicOn, isSpeaking, startMic, stopMic, sendText, readMicLevel };
}
