import { useEffect, useState } from 'react';
import { ASL_VOCABULARY } from '../../data/initialBlueprint';
import type { AslSignItem } from '../../types';
import { prefersReducedMotion } from '../../utils/motion';
import { AvatarFigure } from './AvatarFigure';

/** Base time per keyframe at 1× speed. */
const FRAME_MS = 800;
const SPEEDS = [1, 0.6, 1.4] as const;

/** Previews common event signs on a simplified avatar, with playback controls and handshape notes. */
export const SignAvatarPanel = () => {
  const [sign, setSign] = useState<AslSignItem>(ASL_VOCABULARY[0]);
  const [isPlaying, setIsPlaying] = useState(() => !prefersReducedMotion());
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isPlaying || sign.keyframes.length === 0) return;
    const id = setInterval(() => setFrameIndex((i) => (i + 1) % sign.keyframes.length), FRAME_MS / speed);
    return () => clearInterval(id);
  }, [isPlaying, sign, speed]);

  const frame = sign.keyframes[frameIndex] ?? sign.keyframes[0];
  const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];

  return (
    <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Event sign preview</h3>
          <p className="text-xs text-slate-400">
            Sign: <span className="text-teal-400 font-semibold">{sign.gloss}</span> ({sign.english})
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            aria-pressed={isPlaying}
            className="px-3 py-1 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={() => setSpeed(nextSpeed)}
            aria-label={`Playback speed ${speed}x. Activate for ${nextSpeed}x`}
            className="px-2 py-1 text-xs font-mono tabular-nums text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
          >
            {speed}x Speed
          </button>
        </div>
      </div>

      <div className="relative w-full h-80 bg-slate-950 border border-slate-800/80 rounded-lg overflow-hidden flex items-center justify-center">
        {frame && <AvatarFigure sign={sign} frame={frame} />}
        <div className="absolute bottom-3 left-4 right-4 bg-slate-900/90 border border-slate-800 rounded px-3 py-2 flex items-center justify-between text-xs">
          <div className="text-slate-300">
            <span className="text-teal-400 font-mono font-semibold">{sign.gloss}</span>: {sign.nonManual}
          </div>
          <div className="text-slate-400 font-mono tabular-nums">
            Frame {frameIndex + 1}/{sign.keyframes.length}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-slate-400">Event signs library</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ASL_VOCABULARY.map((item) => {
            const isSelected = item.gloss === sign.gloss;
            return (
              <button
                key={item.gloss}
                aria-pressed={isSelected}
                onClick={() => {
                  setSign(item);
                  setFrameIndex(0);
                }}
                className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-teal-950/60 border-teal-500/70 text-teal-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-mono text-xs font-semibold">{item.gloss}</div>
                <div className="text-[11px] text-slate-400 truncate">{item.english}</div>
              </button>
            );
          })}
        </div>
      </div>

      <dl className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 space-y-2 text-xs text-slate-400">
        <div className="flex gap-2">
          <dt className="font-semibold text-slate-300">Handshape:</dt>
          <dd>{sign.handshape}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold text-slate-300">Movement:</dt>
          <dd>{sign.movement}</dd>
        </div>
      </dl>
    </div>
  );
};
