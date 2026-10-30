import React, { useEffect, useRef, useState } from 'react';
import { SensoryCue } from '../types';

interface SensoryVisualConsoleProps {
  cues: SensoryCue[];
}

const GRID = 8;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Amber↔cyan colour for a cell brightness in [0, 1]. */
export function cellColor(val: number): string {
  const red = Math.round(200 * val + 30);
  const green = Math.round(150 * (1 - val) + 60);
  const blue = Math.round(220 * (1 - val) + 40);
  return `rgba(${red}, ${green}, ${blue}, ${0.25 + val * 0.75})`;
}

function vibrate(pattern: number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Vibration unsupported (desktop / iOS); the visual cue still fires.
  }
}

export const SensoryVisualConsole: React.FC<SensoryVisualConsoleProps> = ({ cues }) => {
  const [activeCueId, setActiveCueId] = useState<string | null>(null);
  const [broadcastCue, setBroadcastCue] = useState<SensoryCue | null>(null);
  const [isAudioLive, setIsAudioLive] = useState(false);
  const [isAnimating, setIsAnimating] = useState(() => !prefersReducedMotion());
  const [micError, setMicError] = useState<string | null>(null);
  const [hapticFrequencyHz, setHapticFrequencyHz] = useState(45);
  const [hapticIntensity, setHapticIntensity] = useState(80);
  const [sensitivity, setSensitivity] = useState(65);

  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;
  const broadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Paint cells straight to the DOM: animating 64 cells through React state re-rendered the
  // whole console every frame.
  useEffect(() => {
    const paint = (tick: number, energy: number) => {
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const dist = Math.hypot(r - 3.5, c - 3.5);
          const wave = Math.sin(dist * 0.9 - tick * 2) * 0.5 + 0.5;
          const val = Math.min(1, Math.max(0, wave * (0.35 + energy)));
          const el = cellRefs.current[r * GRID + c];
          if (el) el.style.backgroundColor = cellColor(val);
        }
      }
    };

    if (!isAnimating) {
      paint(0, 0.65);
      return;
    }

    let frame = 0;
    let tick = 0;
    const bins = new Uint8Array(32);
    const loop = () => {
      tick += 0.04;
      let energy = 0.65;
      const analyser = analyserRef.current;
      if (analyser) {
        analyser.getByteFrequencyData(bins);
        // Bass bins drive the floor, like a real sound-to-light controller.
        const bass = (bins[0] + bins[1] + bins[2] + bins[3]) / (4 * 255);
        energy = Math.min(1, bass * (sensitivityRef.current / 50));
      }
      paint(tick, energy);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [isAnimating]);

  const stopMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    analyserRef.current = null;
    setIsAudioLive(false);
  };

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close().catch(() => undefined);
      if (broadcastTimer.current) clearTimeout(broadcastTimer.current);
    },
    []
  );

  const toggleLiveMic = async () => {
    if (isAudioLive) {
      stopMic();
      return;
    }
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(analyser);
      streamRef.current = stream;
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      setIsAudioLive(true);
      setIsAnimating(true);
    } catch {
      setMicError('Microphone permission was not granted, so the floor keeps its built-in rhythm.');
    }
  };

  const scaled = (pattern: number[]) => pattern.map((ms, i) => (i % 2 === 0 ? Math.round((ms * hapticIntensity) / 100) : ms));

  const handleTriggerCue = (cue: SensoryCue) => {
    setActiveCueId(cue.id);
    setBroadcastCue(cue);
    if (/dinner/i.test(cue.trigger)) vibrate(scaled([100, 50, 100, 50, 100]));
    else if (/entrance|procession/i.test(cue.trigger)) vibrate(scaled([300, 100, 300]));
    else vibrate(scaled([150, 80, 150]));
    if (broadcastTimer.current) clearTimeout(broadcastTimer.current);
    broadcastTimer.current = setTimeout(() => setBroadcastCue(null), 2800);
  };

  return (
    <div className="space-y-8">
      {/* A steady tint, never a flash: photosensitive guests may be in the room (WCAG 2.3.1). */}
      {broadcastCue && (
        <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-teal-400/15">
          <div className="bg-slate-900/95 border border-teal-500 rounded-xl px-6 py-4 shadow-2xl text-center space-y-1">
            <div className="text-xs font-mono uppercase tracking-widest text-teal-300">Visual cue broadcast</div>
            <div className="text-base font-bold text-white">{broadcastCue.trigger}</div>
          </div>
        </div>
      )}
      <p role="status" className="sr-only">
        {broadcastCue ? `Visual cue broadcast: ${broadcastCue.trigger}. ${broadcastCue.visualCue}` : ''}
      </p>

      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Sensory choreography</span>
            <span aria-hidden="true">·</span>
            <span>Sound-to-light</span>
            <span aria-hidden="true">·</span>
            <span>Tactile transducers</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Visual & Haptic Cue Console</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Every audible moment needs a visual or tactile equivalent. Rehearse room-wide visual chimes, preview how the
            sound-to-light floor responds to music, and set vibration strength for wearables and floor transducers.
          </p>
        </div>

        <div className="flex flex-col gap-2 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-3">
            <div>
              <div className="font-medium text-slate-300">Music-reactive preview</div>
              <div className="text-[11px] text-slate-400 font-mono">{isAudioLive ? 'Listening to the room' : 'Built-in rhythm'}</div>
            </div>
            <button
              onClick={toggleLiveMic}
              aria-pressed={isAudioLive}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer ${
                isAudioLive ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-teal-400 text-slate-950 hover:bg-teal-300'
              }`}
            >
              {isAudioLive ? 'Stop mic' : 'Use mic'}
            </button>
          </div>
          {micError && (
            <p role="alert" className="text-amber-300 text-[11px] max-w-[240px]">
              {micError}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">16×16 ft LED dance floor preview</h3>
              <p className="text-xs text-slate-400">Bass and rhythm shown as slow colour ripples, never strobing</p>
            </div>
            <button
              onClick={() => setIsAnimating((v) => !v)}
              aria-pressed={!isAnimating}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
            >
              {isAnimating ? 'Pause animation' : 'Play animation'}
            </button>
          </div>

          <div
            role="img"
            aria-label="Animated preview of the sound-to-light dance floor"
            className="w-full aspect-square max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-xl p-3 shadow-inner grid grid-cols-8 gap-1.5"
          >
            {Array.from({ length: GRID * GRID }, (_, i) => (
              <div
                key={i}
                ref={(el) => {
                  cellRefs.current[i] = el;
                }}
                className="rounded-sm"
              />
            ))}
          </div>

          <div className="space-y-3 bg-slate-950/70 border border-slate-800 rounded-lg p-4 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <label htmlFor="floor-sensitivity">Floor sensitivity to bass</label>
              <span className="font-mono text-teal-400 font-bold tabular-nums">{sensitivity}%</span>
            </div>
            <input
              id="floor-sensitivity"
              type="range"
              min="0"
              max="100"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full accent-teal-400 cursor-pointer"
            />
          </div>
        </div>

        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Event visual cues & lighting chimes</h3>
              <p className="text-xs text-slate-400">Rehearse each room-wide signal with your lighting and AV team</p>
            </div>

            {cues.length === 0 ? (
              <p className="text-xs text-amber-200 bg-amber-950/40 border border-amber-600/50 rounded-lg p-3">
                No visual cues are defined for this plan yet. Add a visual equivalent for the dinner call, toasts and
                emergency alerts.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {cues.map((cue) => (
                  <li
                    key={cue.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      activeCueId === cue.id ? 'bg-teal-950/40 border-teal-500/70' : 'bg-slate-950 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h4 className="font-semibold text-xs text-slate-200">{cue.trigger}</h4>
                      <button
                        onClick={() => handleTriggerCue(cue)}
                        aria-label={`Test broadcast: ${cue.trigger}`}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-950 bg-teal-400 hover:bg-teal-300 rounded cursor-pointer transition-colors"
                      >
                        Test broadcast
                      </button>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-400">
                      <div>
                        <span className="text-teal-300 font-medium">Visual: </span>
                        {cue.visualCue}
                      </div>
                      <div>
                        <span className="text-orange-300 font-medium">Haptic: </span>
                        {cue.hapticCue}
                      </div>
                      {cue.captionMode && (
                        <div>
                          <span className="text-sky-300 font-medium">Caption: </span>
                          {cue.captionMode}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Tactile transducer settings</h3>
              <p className="text-xs text-slate-400">Targets to share with your floor-transducer and wearable vendor</p>
            </div>

            <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <label htmlFor="haptic-frequency">Resonant frequency target</label>
                <span className="font-mono text-teal-400 font-bold tabular-nums">{hapticFrequencyHz} Hz</span>
              </div>
              <input
                id="haptic-frequency"
                type="range"
                min="20"
                max="120"
                step="5"
                value={hapticFrequencyHz}
                onChange={(e) => setHapticFrequencyHz(Number(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />

              <div className="flex items-center justify-between text-slate-300 pt-2 border-t border-slate-800">
                <label htmlFor="haptic-intensity">Vibration strength</label>
                <span className="font-mono text-teal-400 font-bold tabular-nums">{hapticIntensity}%</span>
              </div>
              <input
                id="haptic-intensity"
                type="range"
                min="10"
                max="100"
                step="5"
                value={hapticIntensity}
                onChange={(e) => setHapticIntensity(Number(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />

              <button
                onClick={() => vibrate(scaled([200, 80, 200]))}
                className="w-full mt-2 py-2 text-xs font-semibold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded transition-colors cursor-pointer"
              >
                Test vibration on this device
              </button>
              <p className="text-[11px] text-slate-400">Works on phones that support vibration; desktops will show the visual cue only.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
