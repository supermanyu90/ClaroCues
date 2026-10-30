import React, { useState, useEffect, useRef } from 'react';
import { ASL_VOCABULARY } from '../data/initialBlueprint';
import { AslSignItem, EventCategory } from '../types';
import type { ResponseSource, SignRecognitionResult } from '../shared/api';
import { errorMessage, postJson } from '../utils/api';
import { ErrorNotice, SourceBadge } from './ui/SourceBadge';

interface SignInterpreterEngineProps {
  /** Transcript handed over from the dictation studio, to prepare interpreter material. */
  prepText?: string | null;
  eventType?: EventCategory;
}

interface GlossResult {
  aslGloss: string;
  nonManualMarkers: string;
  spatialGrammarNotes: string;
  signBreakdown?: { gloss: string; description: string; timing: string; expression: string }[];
  source: ResponseSource | 'sample';
}

const SAMPLE_GLOSS: GlossResult = {
  source: 'sample',
  aslGloss: 'WELCOME ALL-OF-YOU OUR ACCESSIBLE WEDDING CELEBRATE TODAY',
  nonManualMarkers: 'Raised eyebrows on opening clause; warm expansive smile; affirmative head nod on conclusion.',
  spatialGrammarNotes: 'Establish Couple locus on IX-Right; establish Guests on IX-Arc.',
  signBreakdown: [
    { gloss: 'WELCOME', description: 'Flat open hands sweep smoothly inward toward chest', timing: '0.0s - 1.2s', expression: 'Warm smile' },
    { gloss: 'ALL-OF-YOU', description: 'Index finger sweeps wide inclusive semicircle', timing: '1.2s - 2.4s', expression: 'Eye contact across room' },
  ],
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const SignInterpreterEngine: React.FC<SignInterpreterEngineProps> = ({ prepText, eventType = 'wedding' }) => {
  const [selectedSign, setSelectedSign] = useState<AslSignItem>(ASL_VOCABULARY[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(() => !prefersReducedMotion());
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);

  const [inputText, setInputText] = useState<string>(prepText || 'Welcome everyone to our accessible wedding celebration!');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [glossResult, setGlossResult] = useState<GlossResult>(SAMPLE_GLOSS);
  const [error, setError] = useState<string | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [recognition, setRecognition] = useState<SignRecognitionResult | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (prepText) setInputText(prepText);
  }, [prepText]);

  useEffect(() => {
    if (!isPlaying || selectedSign.keyframes.length === 0) return;
    const intervalId = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % selectedSign.keyframes.length);
    }, 800 / playbackSpeed);
    return () => clearInterval(intervalId);
  }, [isPlaying, selectedSign, playbackSpeed]);

  // Camera stream lifecycle: tracks are always stopped when the camera is turned off or the tab unmounts.
  useEffect(() => {
    if (!isCameraActive) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 640, height: 480 } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      })
      .catch(() => {
        setError('Camera access was blocked. Allow camera permission to practise signs.');
        setIsCameraActive(false);
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [isCameraActive]);

  const handleTranslateText = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    setError(null);
    try {
      const data = await postJson<GlossResult>('/api/gemini/asl-gloss', {
        text: inputText,
        context: `Accessible ${eventType} announcement`,
      });
      setGlossResult(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsTranslating(false);
    }
  };

  /** Sends one JPEG frame to Gemini vision. Frames are not stored by ClaroCues. */
  const handleRecognizeSign = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * 480);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    setIsRecognizing(true);
    setError(null);
    try {
      setRecognition(await postJson<SignRecognitionResult>('/api/gemini/recognize-sign', { imageBase64, mimeType: 'image/jpeg' }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsRecognizing(false);
    }
  };

  const currentFrame = selectedSign.keyframes[currentFrameIndex] || selectedSign.keyframes[0];

  return (
    <div className="space-y-8">
      {/* Top Banner & Context */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>American Sign Language</span>
            <span aria-hidden="true">·</span>
            <span>Interpreter preparation</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            ASL Prep & Sign Practice
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Draft ASL gloss for speeches and announcements to send to your interpreter team ahead of the event, preview
            common event signs, and let hearing hosts practise signs with camera feedback. These are preparation aids:
            they do not replace qualified Deaf or hearing interpreters.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs">
          <div>
            <div className="text-slate-400">Active Vocabulary</div>
            <div className="text-base font-semibold text-teal-400 font-mono tabular-nums">
              {ASL_VOCABULARY.length} Signs
            </div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div>
            <div className="text-slate-400">Sign check</div>
            <div className="text-base font-semibold text-white font-mono">Gemini vision</div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Avatar Visualizer & Sign Recognition Camera */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: ASL Animated Avatar (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Interactive Signing Avatar</h3>
              <p className="text-xs text-slate-400">
                Sign: <span className="text-teal-400 font-semibold">{selectedSign.gloss}</span> ({selectedSign.english})
              </p>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                aria-pressed={isPlaying}
                className="px-3 py-1 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={() => setPlaybackSpeed(playbackSpeed === 1.0 ? 0.6 : playbackSpeed === 0.6 ? 1.4 : 1.0)}
                aria-label={`Playback speed ${playbackSpeed}x. Activate to change`}
                className="px-2 py-1 text-xs font-mono tabular-nums text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
              >
                {playbackSpeed}x Speed
              </button>
            </div>
          </div>

          {/* SVG Animated Avatar Canvas Container */}
          <div className="relative w-full h-80 bg-slate-950 border border-slate-800/80 rounded-lg overflow-hidden flex items-center justify-center">
            {/* Avatar Head, Torso & Articulated Hands SVG */}
            <svg
              role="img"
              aria-label={`Simplified avatar signing ${selectedSign.gloss} (${selectedSign.english}). ${selectedSign.handshape}; ${selectedSign.movement}.`}
              viewBox="0 0 100 100"
              className="w-full h-full max-w-xs transition-transform duration-300"
              style={{
                transform: `rotate(${currentFrame.headTilt}deg)`,
              }}
            >
              {/* Neutral Backdrop Silhouette Guide */}
              <circle cx="50" cy="50" r="48" fill="#0f172a" opacity="0.4" />

              {/* Torso / Shoulders */}
              <path
                d="M 28 85 C 28 68, 38 64, 50 64 C 62 64, 72 68, 72 85 Z"
                fill="#1e293b"
                stroke="#334155"
                strokeWidth="1.2"
              />

              {/* Neck */}
              <rect x="46" y="52" width="8" height="14" fill="#fcd34d" rx="2" />

              {/* Head / Face */}
              <ellipse cx="50" cy="40" rx="14" ry="17" fill="#fde68a" stroke="#d97706" strokeWidth="0.8" />

              {/* Hair */}
              <path
                d="M 36 38 C 36 24, 64 24, 64 38 C 64 30, 50 26, 36 38 Z"
                fill="#1e293b"
              />

              {/* Eyebrows (reactive to non-manual grammar) */}
              <path
                d={
                  currentFrame.brows === 'raised'
                    ? 'M 41 31 Q 44 28 47 31'
                    : currentFrame.brows === 'lowered'
                    ? 'M 41 33 Q 44 35 47 33'
                    : 'M 41 32 Q 44 32 47 32'
                }
                fill="none"
                stroke="#78350f"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d={
                  currentFrame.brows === 'raised'
                    ? 'M 53 31 Q 56 28 59 31'
                    : currentFrame.brows === 'lowered'
                    ? 'M 53 33 Q 56 35 59 33'
                    : 'M 53 32 Q 56 32 59 32'
                }
                fill="none"
                stroke="#78350f"
                strokeWidth="1.2"
                strokeLinecap="round"
              />

              {/* Eyes */}
              <ellipse cx="44" cy="36" rx="2" ry="2.5" fill="#1e293b" />
              <ellipse cx="56" cy="36" rx="2" ry="2.5" fill="#1e293b" />

              {/* Nose */}
              <path d="M 50 38 L 49 43 L 51 43" fill="none" stroke="#b45309" strokeWidth="0.8" strokeLinecap="round" />

              {/* Mouth (expressive) */}
              <path
                d="M 45 47 Q 50 51 55 47"
                fill="none"
                stroke="#991b1b"
                strokeWidth="1.2"
                strokeLinecap="round"
              />

              {/* Left Arm & Articulated Hand */}
              <line
                x1="32"
                y1="68"
                x2={currentFrame.leftHand.x}
                y2={currentFrame.leftHand.y}
                stroke="#475569"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle
                cx={currentFrame.leftHand.x}
                cy={currentFrame.leftHand.y}
                r={currentFrame.leftHand.open ? '5' : '4'}
                fill="#2dd4bf"
                stroke="#0f766e"
                strokeWidth="1"
              />

              {/* Right Arm & Articulated Hand */}
              <line
                x1="68"
                y1="68"
                x2={currentFrame.rightHand.x}
                y2={currentFrame.rightHand.y}
                stroke="#475569"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle
                cx={currentFrame.rightHand.x}
                cy={currentFrame.rightHand.y}
                r={currentFrame.rightHand.open ? '5' : '4'}
                fill="#2dd4bf"
                stroke="#0f766e"
                strokeWidth="1"
              />
            </svg>

            {/* Subtitle / Non-Manual Marker Overlay */}
            <div className="absolute bottom-3 left-4 right-4 bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded px-3 py-2 flex items-center justify-between text-xs">
              <div className="text-slate-300">
                <span className="text-teal-400 font-mono font-semibold">{selectedSign.gloss}</span>: {selectedSign.nonManual}
              </div>
              <div className="text-slate-400 font-mono tabular-nums">
                Frame {currentFrameIndex + 1}/{selectedSign.keyframes.length}
              </div>
            </div>
          </div>

          {/* Sign Vocabulary Selector Tabs */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-400">Quick Event Signs Library</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ASL_VOCABULARY.map((sign) => {
                const isSelected = selectedSign.gloss === sign.gloss;
                return (
                  <button
                    key={sign.gloss}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedSign(sign);
                      setCurrentFrameIndex(0);
                    }}
                    className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-950/60 border-teal-500/70 text-teal-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-mono text-xs font-semibold">{sign.gloss}</div>
                    <div className="text-[11px] text-slate-400 truncate">{sign.english}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Morphological Sign Details */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-semibold text-slate-300">Handshape:</span>
              <span>{selectedSign.handshape}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-semibold text-slate-300">Movement Pattern:</span>
              <span>{selectedSign.movement}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interpreter prep & sign practice (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <ErrorNotice message={error} onDismiss={() => setError(null)} />

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Speech to ASL gloss (interpreter prep)</h3>
              <p className="text-xs text-slate-400">
                Draft gloss and facial grammar notes to share with interpreters before the event.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="gloss-input" className="sr-only">
                English text to draft as ASL gloss
              </label>
              <textarea
                id="gloss-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter event speech, vow, or announcement..."
                rows={4}
                maxLength={1500}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-y font-sans"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setInputText('Marcus, I promise to love you and cherish our life together.')}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    Example vows
                  </button>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <button
                    onClick={() => setInputText('Dinner is served! Please join us at the banquet tables.')}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    Example dinner call
                  </button>
                </div>
                <button
                  onClick={handleTranslateText}
                  disabled={isTranslating || !inputText.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  {isTranslating ? 'Drafting…' : 'Draft ASL gloss'}
                </button>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 space-y-3 text-xs" aria-live="polite">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-400 font-medium">ASL gloss</div>
                <SourceBadge source={glossResult.source} />
              </div>
              <div className="font-mono text-teal-300 font-bold tracking-wide">{glossResult.aslGloss}</div>
              <div className="space-y-1">
                <div className="text-[11px] text-slate-400 font-medium">Facial grammar (non-manual markers)</div>
                <div className="text-slate-300 text-[11px] leading-relaxed">{glossResult.nonManualMarkers}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-slate-400 font-medium">Spatial referencing notes</div>
                <div className="text-slate-300 text-[11px] leading-relaxed">{glossResult.spatialGrammarNotes}</div>
              </div>
              {glossResult.signBreakdown && glossResult.signBreakdown.length > 0 && (
                <ol className="space-y-1.5 border-t border-slate-800 pt-2">
                  {glossResult.signBreakdown.map((step, idx) => (
                    <li key={idx} className="text-[11px] text-slate-300">
                      <span className="font-mono text-teal-300 font-semibold">{step.gloss}</span>{' '}
                      <span className="text-slate-400">({step.timing})</span>: {step.description}
                      {step.expression ? <span className="text-slate-400">; {step.expression}</span> : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

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
                  setIsCameraActive(!isCameraActive);
                  setRecognition(null);
                }}
                aria-pressed={isCameraActive}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
                  isCameraActive
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30'
                }`}
              >
                {isCameraActive ? 'Stop camera' : 'Start camera'}
              </button>
            </div>

            <div className="relative w-full aspect-[4/3] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
              {isCameraActive ? (
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
              onClick={handleRecognizeSign}
              disabled={!isCameraActive || isRecognizing}
              className="w-full py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              {isRecognizing ? 'Checking…' : 'Check my sign'}
            </button>

            <div aria-live="polite">
              {recognition && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      <span className="text-slate-400">Looks like: </span>
                      <span className="text-teal-300 font-mono font-bold">{recognition.gloss}</span>
                      {recognition.english && <span className="text-slate-300"> ({recognition.english})</span>}
                    </span>
                    <span className="text-slate-400">
                      Model confidence:{' '}
                      <span className="text-white font-mono tabular-nums">{Math.round(recognition.confidence * 100)}%</span>
                    </span>
                  </div>
                  {!recognition.handsVisible && <div className="text-amber-300">No hands detected. Step back so both hands are in frame.</div>}
                  {recognition.notes && <div className="text-slate-400">{recognition.notes}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
