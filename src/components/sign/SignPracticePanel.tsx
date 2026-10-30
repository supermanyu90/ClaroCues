import { useState } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { recognizeSign } from '../../services/apiClient';
import type { SignRecognitionResult } from '../../shared/api';
import { errorMessage } from '../../utils/api';

interface SignPracticePanelProps {
  onError: (message: string | null) => void;
}

/** Camera feedback for hearing hosts learning a few signs. Frames go to Gemini only on request and are not stored. */
export const SignPracticePanel = ({ onError }: SignPracticePanelProps) => {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<SignRecognitionResult | null>(null);
  const { videoRef, isReady, captureJpeg } = useCamera(isCameraOn, (message) => {
    onError(message);
    setIsCameraOn(false);
  });

  const checkSign = async () => {
    const frame = captureJpeg();
    if (!frame) return;
    setIsChecking(true);
    onError(null);
    try {
      setResult(await recognizeSign(frame));
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Sign practice with camera feedback</h3>
          <p className="text-xs text-slate-400">
            For hearing hosts learning a few signs. Checks one still frame, so movement-based signs may be missed.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCameraOn((on) => !on);
            setResult(null);
          }}
          aria-pressed={isCameraOn}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer shrink-0 ${
            isCameraOn
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30'
          }`}
        >
          {isCameraOn ? 'Stop camera' : 'Start camera'}
        </button>
      </div>

      <div className="relative w-full aspect-[4/3] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
        {isCameraOn ? (
          <video
            ref={videoRef}
            playsInline
            muted
            aria-label="Your camera preview"
            className="absolute inset-0 w-full h-full object-cover -scale-x-100"
          />
        ) : (
          <p className="text-slate-400 text-xs p-6 text-center">
            Camera is off. Frames are only sent when you press “Check my sign” and are not stored.
          </p>
        )}
      </div>

      <button
        onClick={() => void checkSign()}
        disabled={!isReady || isChecking}
        className="w-full py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
      >
        {isChecking ? 'Checking…' : 'Check my sign'}
      </button>

      <div aria-live="polite">
        {result && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span>
                <span className="text-slate-400">Looks like: </span>
                <span className="text-teal-300 font-mono font-bold">{result.gloss}</span>
                {result.english && <span className="text-slate-300"> ({result.english})</span>}
              </span>
              <span className="text-slate-400">
                Model confidence:{' '}
                <span className="text-white font-mono tabular-nums">{Math.round(result.confidence * 100)}%</span>
              </span>
            </div>
            {!result.handsVisible && (
              <div className="text-amber-300">No hands detected. Step back so both hands are in frame.</div>
            )}
            {result.notes && <div className="text-slate-400">{result.notes}</div>}
          </div>
        )}
      </div>
    </div>
  );
};
