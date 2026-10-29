import React, { useState, useEffect, useRef } from 'react';
import { EventPlan } from '../types';

interface LiveVoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: EventPlan;
}

export const LiveVoiceAssistantModal: React.FC<LiveVoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'error' | 'closed'
  >('idle');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false); // Model is speaking
  const [transcriptStream, setTranscriptStream] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<{ buffer: AudioBuffer; startTime: number }[]>([]);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioLevelRef = useRef<number>(0);

  // Helper to downsample audio buffer to 16kHz Int16 PCM
  const downsampleTo16kPCM = (inputData: Float32Array, inputSampleRate: number): Int16Array => {
    if (inputSampleRate === 16000) {
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return pcm16;
    }

    const ratio = inputSampleRate / 16000;
    const newLength = Math.round(inputData.length / ratio);
    const result = new Int16Array(newLength);
    let offsetResult = 0;
    let offsetInput = 0;

    while (offsetResult < result.length) {
      const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetInput; i < nextOffsetInput && i < inputData.length; i++) {
        accum += inputData[i];
        count++;
      }
      const avg = count > 0 ? accum / count : 0;
      const s = Math.max(-1, Math.min(1, avg));
      result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7fff;
      offsetResult++;
      offsetInput = nextOffsetInput;
    }
    return result;
  };

  // Convert ArrayBuffer or SharedArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer: ArrayBufferLike): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer as ArrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Convert Base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Stop & clear all currently playing / queued audio
  const stopAllAudioPlayback = () => {
    try {
      if (currentAudioSourceRef.current) {
        currentAudioSourceRef.current.stop();
        currentAudioSourceRef.current.disconnect();
        currentAudioSourceRef.current = null;
      }
      playbackQueueRef.current = [];
      if (audioContextRef.current) {
        nextPlayTimeRef.current = audioContextRef.current.currentTime;
      }
      setIsSpeaking(false);
    } catch (err) {
      console.warn('Error stopping playback:', err);
    }
  };

  // Playback raw 24kHz PCM from server
  const queueAudioChunkForPlayback = (base64Audio: string) => {
    try {
      const audioCtx = audioContextRef.current;
      if (!audioCtx) return;

      const arrayBuffer = base64ToArrayBuffer(base64Audio);
      const int16Array = new Int16Array(arrayBuffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      // Live API audio is 24000Hz mono
      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const now = audioCtx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      source.onended = () => {
        if (audioCtx.currentTime >= nextPlayTimeRef.current - 0.05) {
          setIsSpeaking(false);
        }
      };

      currentAudioSourceRef.current = source;
      setIsSpeaking(true);
      source.start(startTime);
    } catch (err) {
      console.error('Failed to queue audio playback:', err);
    }
  };

  // Establish WebSocket & Microphone connection
  const startLiveSession = async () => {
    setConnectionStatus('connecting');
    setErrorMessage(null);
    setTranscriptStream('');

    try {
      // 1. AudioContext setup
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // 2. Microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = stream;

      // 3. Connect to /live WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');

        // Send initial context greeting
        ws.send(
          JSON.stringify({
            type: 'text',
            data: `Hello! I am planning ${currentPlan.title} (${currentPlan.eventType}, ${currentPlan.guestCount} guests, $${currentPlan.totalBudget.toLocaleString()} budget, venue: ${currentPlan.venueName}). Please introduce yourself concisely and ask how you can help optimize our plans today.`,
          })
        );

        // 4. Set up Microphone audio processing pipeline
        const sourceNode = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (isMicMuted || ws.readyState !== WebSocket.OPEN) return;

          const inputChannel = e.inputBuffer.getChannelData(0);

          // Compute level for visualizer
          let sumSquares = 0;
          for (let i = 0; i < inputChannel.length; i++) {
            sumSquares += inputChannel[i] * inputChannel[i];
          }
          const rms = Math.sqrt(sumSquares / inputChannel.length);
          audioLevelRef.current = rms * 5;

          // Downsample to 16kHz PCM
          const pcm16 = downsampleTo16kPCM(inputChannel, audioCtx.sampleRate);
          const base64Chunk = arrayBufferToBase64(pcm16.buffer);

          ws.send(
            JSON.stringify({
              type: 'audio',
              data: base64Chunk,
            })
          );
        };

        sourceNode.connect(processor);
        processor.connect(audioCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'audio' && msg.data) {
            queueAudioChunkForPlayback(msg.data);
          } else if (msg.type === 'text' && msg.data) {
            setTranscriptStream((prev) => prev + ' ' + msg.data);
          } else if (msg.type === 'interrupted') {
            stopAllAudioPlayback();
          } else if (msg.type === 'error') {
            console.error('Server reported Live error:', msg.message);
            setErrorMessage(msg.message || 'Error occurred in live session');
          }
        } catch (err) {
          console.warn('Error parsing incoming WS message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        setConnectionStatus('error');
        setErrorMessage('Failed to connect to Live API server. Ensure dev server is active.');
      };

      ws.onclose = () => {
        setConnectionStatus('closed');
        stopAllAudioPlayback();
      };
    } catch (err: any) {
      console.error('Microphone or AudioContext initialization failed:', err);
      setConnectionStatus('error');
      setErrorMessage(
        err.message || 'Microphone access denied. Please allow microphone permissions.'
      );
    }
  };

  const endLiveSession = () => {
    // Stop recording & audio nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    stopAllAudioPlayback();
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus('idle');
  };

  // Launch on modal open, clean up on unmount or close
  useEffect(() => {
    if (isOpen) {
      startLiveSession();
    } else {
      endLiveSession();
    }
    return () => {
      endLiveSession();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen]);

  // Audio Visualizer Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angle = 0;
    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      angle += 0.03;

      // Base radius
      const baseRadius = 45;
      const level = Math.min(1.5, Math.max(0.1, audioLevelRef.current || (isSpeaking ? 0.6 : 0.15)));
      const dynamicRadius = baseRadius + level * 25;

      // Outer glowing ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicRadius + 18, 0, Math.PI * 2);
      ctx.strokeStyle = isSpeaking
        ? 'rgba(20, 184, 166, 0.4)'
        : 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Middle undulating circle
      ctx.beginPath();
      for (let i = 0; i < 360; i += 6) {
        const rad = (i * Math.PI) / 180;
        const wave = Math.sin(rad * 8 + angle) * (level * 12);
        const r = dynamicRadius + wave;
        const x = centerX + r * Math.cos(rad);
        const y = centerY + r * Math.sin(rad);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = isSpeaking
        ? 'rgba(45, 212, 191, 0.18)'
        : 'rgba(56, 189, 248, 0.12)';
      ctx.fill();
      ctx.strokeStyle = isSpeaking ? '#2dd4bf' : '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Core pulsating sphere
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(16, baseRadius * 0.45), 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        2,
        centerX,
        centerY,
        baseRadius * 0.6
      );
      if (isSpeaking) {
        gradient.addColorStop(0, '#5eead4');
        gradient.addColorStop(1, '#0f766e');
      } else {
        gradient.addColorStop(0, '#7dd3fc');
        gradient.addColorStop(1, '#0369a1');
      }
      ctx.fillStyle = gradient;
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSpeaking]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
            <div>
              <div className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Gemini 3.8 Live Voice Assistant</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  WebSocket 24kHz
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Natural real-time spoken planning conversation
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              endLiveSession();
              onClose();
            }}
            className="text-slate-400 hover:text-white text-lg p-1 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Visualizer & Orb Zone */}
        <div className="p-8 flex flex-col items-center justify-center space-y-6 bg-radial from-slate-900 via-slate-950 to-slate-950">
          <div className="relative w-56 h-56 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={224}
              height={224}
              className="w-full h-full block"
            />
          </div>

          {/* Status Label */}
          <div className="text-center space-y-1">
            <div className="text-sm font-semibold tracking-wide text-white">
              {connectionStatus === 'connecting' && 'Establishing Gemini 3.8 Live Connection...'}
              {connectionStatus === 'connected' &&
                (isSpeaking ? 'ClaroCues AI is speaking...' : isMicMuted ? 'Microphone Muted' : 'Listening... Speak naturally')}
              {connectionStatus === 'error' && 'Connection Interrupted'}
              {connectionStatus === 'closed' && 'Voice Session Ended'}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Voice: Zephyr (Natural Tone) · Latency: Real-Time Stream
            </div>
          </div>

          {/* Live Transcript Ticker */}
          <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 min-h-[90px] max-h-36 overflow-y-auto text-xs text-slate-300 leading-relaxed font-sans">
            {transcriptStream ? (
              <p className="whitespace-pre-wrap">{transcriptStream}</p>
            ) : (
              <span className="text-slate-500 italic">
                {connectionStatus === 'connected'
                  ? 'Transcribed speech response will stream here as you talk...'
                  : 'Waiting for connection to start...'}
              </span>
            )}
          </div>

          {errorMessage && (
            <div className="w-full bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Action Controls Bar */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setIsMicMuted((prev) => !prev)}
            disabled={connectionStatus !== 'connected'}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
              isMicMuted
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <span>{isMicMuted ? '🔇 Unmute Mic' : '🎙️ Mute Mic'}</span>
          </button>

          {connectionStatus === 'error' || connectionStatus === 'closed' ? (
            <button
              onClick={startLiveSession}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 transition-colors cursor-pointer"
            >
              Reconnect Voice
            </button>
          ) : (
            <button
              onClick={() => {
                endLiveSession();
                onClose();
              }}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors cursor-pointer"
            >
              End Conversation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
