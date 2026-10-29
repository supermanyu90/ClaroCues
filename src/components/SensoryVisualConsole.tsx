import React, { useState, useEffect, useRef } from 'react';
import { SensoryCue } from '../types';

interface SensoryVisualConsoleProps {
  cues: SensoryCue[];
}

export const SensoryVisualConsole: React.FC<SensoryVisualConsoleProps> = ({ cues }) => {
  const [activeCueId, setActiveCueId] = useState<string | null>(null);
  const [visualFlashEffect, setVisualFlashEffect] = useState<string | null>(null);
  const [isAudioLive, setIsAudioLive] = useState<boolean>(false);
  const [hapticFrequencyHz, setHapticFrequencyHz] = useState<number>(45);
  const [hapticIntensity, setHapticIntensity] = useState<number>(80);
  const [audioVolume, setAudioVolume] = useState<number>(65);

  // Audio Context & Analyser
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // 8x8 LED Dance Floor simulation state
  const [gridCells, setGridCells] = useState<number[][]>(() =>
    Array(8).fill(0).map(() => Array(8).fill(0))
  );

  // Trigger real hardware vibration if available (mobile/browsers)
  const triggerHapticFeedback = (pattern: number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Safe fallback
      }
    }
  };

  // Sound-to-light LED dance floor animation loop
  useEffect(() => {
    let animId: number;
    let tick = 0;

    const updateDanceFloor = () => {
      tick += 0.08;
      setGridCells((prev) => {
        const next = prev.map((row, r) =>
          row.map((_, c) => {
            const distFromCenter = Math.hypot(r - 3.5, c - 3.5);
            // Harmonic wave formula simulating sound-to-light bass resonance
            const val = Math.sin(distFromCenter * 0.9 - tick * 2) * 0.5 + 0.5;
            return Math.min(1, Math.max(0, val));
          })
        );
        return next;
      });

      animId = requestAnimationFrame(updateDanceFloor);
    };

    animId = requestAnimationFrame(updateDanceFloor);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Web Audio API initialization for live microphone reactive mode
  const toggleLiveMic = async () => {
    if (isAudioLive) {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setIsAudioLive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      setIsAudioLive(true);
    } catch (err) {
      console.warn('Microphone permission not granted or unsupported:', err);
      setIsAudioLive(false);
    }
  };

  // Trigger a full sensory cue
  const handleTriggerCue = (cue: SensoryCue) => {
    setActiveCueId(cue.id);
    setVisualFlashEffect(cue.id);

    if (cue.trigger.includes('Dinner')) {
      triggerHapticFeedback([100, 50, 100, 50, 100]);
    } else if (cue.trigger.includes('Entrance')) {
      triggerHapticFeedback([300, 100, 300]);
    } else {
      triggerHapticFeedback([150, 80, 150]);
    }

    setTimeout(() => {
      setVisualFlashEffect(null);
    }, 2800);
  };

  return (
    <div className="space-y-8">
      {/* Visual Flash Annunciator Overlay Test */}
      {visualFlashEffect && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-teal-400/15 backdrop-blur-[1px] animate-pulse">
          <div className="bg-slate-900/95 border border-teal-500 rounded-xl px-6 py-4 shadow-2xl text-center space-y-1">
            <div className="text-xs font-mono uppercase tracking-widest text-teal-400">
              Visual Cue Broadcasted
            </div>
            <div className="text-base font-bold text-white">
              {cues.find((c) => c.id === visualFlashEffect)?.trigger}
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Sensory Choreography</span>
            <span aria-hidden="true">·</span>
            <span>Sound-to-Light DMX Mapping</span>
            <span aria-hidden="true">·</span>
            <span>Sub-Floor Tactile Transducers</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Sound-to-Light & Haptic Sensory Execution Console
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Music and announcements experienced through dynamic visual illumination and resonant acoustic floor vibration. Manage real-time visual chimes, sound-to-light LED dance floor palettes, and tactile guest notification beacons.
          </p>
        </div>

        {/* Live Audio Reactive Mode Toggle */}
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div>
            <div className="text-xs font-medium text-slate-300">Live Mic Reactive</div>
            <div className="text-[11px] text-slate-500 font-mono">
              {isAudioLive ? 'Listening to Ambient Sound' : 'Simulated Rhythm Mode'}
            </div>
          </div>
          <button
            onClick={toggleLiveMic}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              isAudioLive
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-teal-400 text-slate-950 hover:bg-teal-300'
            }`}
          >
            {isAudioLive ? 'Stop Mic' : 'Enable Mic'}
          </button>
        </div>
      </div>

      {/* 2-Column Grid: LED Dance Floor Visualizer & Haptic/Visual Cues Controller */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 8x8 Modular LED Dance Floor Visualizer (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">16&times;16ft LED Sensory Dance Floor</h3>
              <p className="text-xs text-slate-400">Maps musical bass and rhythm into visual radiant ripples</p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-teal-400">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>DMX Active</span>
            </div>
          </div>

          {/* 8x8 LED Grid Viewport */}
          <div className="w-full aspect-square max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-xl p-3 shadow-inner grid grid-cols-8 gap-1.5">
            {gridCells.map((row, r) =>
              row.map((val, c) => {
                // Color mapping: warm amber to cyan chromatic gradient based on harmonic value
                const red = Math.round(200 * val + 30);
                const green = Math.round(150 * (1 - val) + 60);
                const blue = Math.round(220 * (1 - val) + 40);
                const opacity = 0.25 + val * 0.75;

                return (
                  <div
                    key={`${r}-${c}`}
                    className="rounded-sm transition-colors duration-150 relative overflow-hidden"
                    style={{
                      backgroundColor: `rgba(${red}, ${green}, ${blue}, ${opacity})`,
                      boxShadow: val > 0.6 ? `0 0 12px rgba(${red}, ${green}, ${blue}, 0.6)` : 'none'
                    }}
                  />
                );
              })
            )}
          </div>

          {/* Frequency & Audio Controls */}
          <div className="space-y-3 bg-slate-950/70 border border-slate-800 rounded-lg p-4 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>Bass Resonator Gain:</span>
              <span className="font-mono text-teal-400 font-bold tabular-nums">{audioVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={audioVolume}
              onChange={(e) => setAudioVolume(parseInt(e.target.value))}
              className="w-full accent-teal-400 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>Low Bass (Sub 40Hz)</span>
              <span>Mid-Kick (80Hz)</span>
              <span>Full Spectrum</span>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Cues & Haptic Transducers (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Visual Annunciator Triggers */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Event Visual Cues & Lighting Chimes</h3>
                <p className="text-xs text-slate-400">Broadcast room-wide visual signals to guests</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {cues.map((cue) => {
                const isActive = activeCueId === cue.id;
                return (
                  <div
                    key={cue.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-teal-950/40 border-teal-500/70'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="font-semibold text-xs text-slate-200">{cue.trigger}</div>
                      <button
                        onClick={() => handleTriggerCue(cue)}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-950 bg-teal-400 hover:bg-teal-300 rounded cursor-pointer transition-colors"
                      >
                        Test Broadcast
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-Floor & Tactile Transducer Calibration */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Tactile Transducer Calibration</h3>
              <p className="text-xs text-slate-400">Low-frequency resonance for tactile music enjoyment</p>
            </div>

            <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Resonant Frequency Target:</span>
                <span className="font-mono text-teal-400 font-bold tabular-nums">{hapticFrequencyHz} Hz</span>
              </div>
              <input
                type="range"
                min="20"
                max="120"
                step="5"
                value={hapticFrequencyHz}
                onChange={(e) => setHapticFrequencyHz(parseInt(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />

              <div className="flex items-center justify-between text-slate-300 pt-2 border-t border-slate-800">
                <span>Vibration Pulse Power:</span>
                <span className="font-mono text-teal-400 font-bold tabular-nums">{hapticIntensity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={hapticIntensity}
                onChange={(e) => setHapticIntensity(parseInt(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />

              <div className="pt-2">
                <button
                  onClick={() => triggerHapticFeedback([200, 80, 200])}
                  className="w-full py-2 text-xs font-semibold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded transition-colors cursor-pointer"
                >
                  Send Haptic Vibration Test (Floor + Wearables)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
