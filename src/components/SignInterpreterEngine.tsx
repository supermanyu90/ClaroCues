import React, { useState, useEffect, useRef } from 'react';
import { ASL_VOCABULARY } from '../data/initialBlueprint';
import { AslSignItem } from '../types';

export const SignInterpreterEngine: React.FC = () => {
  const [selectedSign, setSelectedSign] = useState<AslSignItem>(ASL_VOCABULARY[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);

  // Custom text translator state
  const [inputText, setInputText] = useState<string>('Welcome everyone to our accessible wedding celebration!');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [glossResult, setGlossResult] = useState<{
    aslGloss: string;
    nonManualMarkers: string;
    spatialGrammarNotes: string;
    signBreakdown: { gloss: string; description: string; timing: string; expression: string }[];
  } | null>({
    aslGloss: 'WELCOME ALL-OF-YOU OUR ACCESSIBLE WEDDING CELEBRATE TODAY',
    nonManualMarkers: 'Raised eyebrows on opening clause; warm expansive smile; affirmative head nod on conclusion.',
    spatialGrammarNotes: 'Establish Couple locus on IX-Right; establish Guests on IX-Arc.',
    signBreakdown: [
      { gloss: 'WELCOME', description: 'Flat open hands sweep smoothly inward toward chest', timing: '0.0s - 1.2s', expression: 'Warm smile' },
      { gloss: 'ALL-OF-YOU', description: 'Index finger sweeps wide inclusive semicircle', timing: '1.2s - 2.4s', expression: 'Eye contact across room' },
      { gloss: 'WEDDING', description: 'Hands clasp gently in center forming union bond', timing: '2.4s - 3.8s', expression: 'Reverent joy' },
      { gloss: 'CELEBRATE', description: 'Both X-hands twirl in celebratory circles above shoulders', timing: '3.8s - 5.2s', expression: 'Vibrant celebratory eyes' }
    ]
  });

  // Camera sign detection simulator state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedSign, setDetectedSign] = useState<string>('CONGRATULATIONS');
  const [detectionConfidence, setDetectionConfidence] = useState<number>(96);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animation cycle for the ASL Avatar
  useEffect(() => {
    let intervalId: any;
    if (isPlaying && selectedSign.keyframes.length > 0) {
      intervalId = setInterval(() => {
        setCurrentFrameIndex((prev) => (prev + 1) % selectedSign.keyframes.length);
      }, (800 / playbackSpeed));
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, selectedSign, playbackSpeed]);

  // Webcam stream management
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraActive) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 480, height: 360 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.warn('Camera access error:', err);
          setCameraError('Camera preview simulated. Real camera permission may be blocked in preview sandbox.');
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isCameraActive]);

  // Canvas hand landmarks drawing loop
  useEffect(() => {
    let animId: number;
    let t = 0;
    const drawLandmarks = () => {
      t += 0.05;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          if (isCameraActive) {
            // Simulated 21-joint hand skeletal tracking points
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            // Hand 1 (Right)
            const rx = centerX + Math.sin(t) * 40 + 70;
            const ry = centerY + Math.cos(t * 1.5) * 30;

            // Hand 2 (Left)
            const lx = centerX - Math.sin(t) * 40 - 70;
            const ly = centerY + Math.sin(t * 1.5) * 30;

            const drawHand = (hx: number, hy: number) => {
              ctx.strokeStyle = '#2dd4bf'; // Teal-400
              ctx.fillStyle = '#14b8a6';
              ctx.lineWidth = 2;

              // Palm center
              ctx.beginPath();
              ctx.arc(hx, hy, 6, 0, Math.PI * 2);
              ctx.fill();

              // 5 fingers
              for (let i = 0; i < 5; i++) {
                const angle = (i - 2) * 0.35 - Math.PI / 2;
                const fx1 = hx + Math.cos(angle) * 22;
                const fy1 = hy + Math.sin(angle) * 22;
                const fx2 = hx + Math.cos(angle) * 42;
                const fy2 = hy + Math.sin(angle) * 42;

                ctx.beginPath();
                ctx.moveTo(hx, hy);
                ctx.lineTo(fx1, fy1);
                ctx.lineTo(fx2, fy2);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(fx2, fy2, 3.5, 0, Math.PI * 2);
                ctx.fill();
              }
            };

            drawHand(rx, ry);
            drawHand(lx, ly);
          }
        }
      }
      animId = requestAnimationFrame(drawLandmarks);
    };

    animId = requestAnimationFrame(drawLandmarks);
    return () => cancelAnimationFrame(animId);
  }, [isCameraActive]);

  const handleTranslateText = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);

    try {
      const res = await fetch('/api/gemini/asl-gloss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, context: 'Accessible event announcement' }),
      });
      if (res.ok) {
        const data = await res.json();
        setGlossResult(data);
      }
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const currentFrame = selectedSign.keyframes[currentFrameIndex] || selectedSign.keyframes[0];

  return (
    <div className="space-y-8">
      {/* Top Banner & Context */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Multimodal GenAI</span>
            <span aria-hidden="true">·</span>
            <span>American Sign Language</span>
            <span aria-hidden="true">·</span>
            <span>Real-Time Gloss Synthesis</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Sign Language Avatar & Recognition Engine
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Bidirectional translation between speech/text and American Sign Language. Features an expressive keyframe-articulated signing avatar, grammatical ASL Gloss translation, and webcam gesture recognition for interactive event engagement.
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
            <div className="text-slate-400">Recognition Model</div>
            <div className="text-base font-semibold text-white font-mono">
              21-Point Skeletal
            </div>
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
                className="px-3 py-1 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={() => setPlaybackSpeed(playbackSpeed === 1.0 ? 0.6 : playbackSpeed === 0.6 ? 1.4 : 1.0)}
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
              <div className="text-slate-500 font-mono tabular-nums">
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

        {/* Right Column: Sign Recognition & Translation (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Webcam Sign Input Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Live Camera Sign Recognition</h3>
                <p className="text-xs text-slate-400">Detect attendee sign responses & applause</p>
              </div>
              <button
                onClick={() => setIsCameraActive(!isCameraActive)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  isCameraActive
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30'
                }`}
              >
                {isCameraActive ? 'Stop Camera' : 'Start Camera'}
              </button>
            </div>

            {/* Video Viewport / Canvas */}
            <div className="relative w-full h-52 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={360}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                  <div className="absolute top-2 left-2 bg-slate-950/80 border border-slate-800 text-[11px] text-teal-300 px-2 py-0.5 rounded font-mono">
                    Tracking 2 Hands Active
                  </div>
                </>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <div className="text-slate-500 text-xs">
                    Camera inactive. Click "Start Camera" to enable interactive hand gesture tracking.
                  </div>
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => {
                        setDetectedSign('CELEBRATE');
                        setDetectionConfidence(98);
                      }}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                    >
                      Simulate "CELEBRATE"
                    </button>
                    <button
                      onClick={() => {
                        setDetectedSign('THANK-YOU');
                        setDetectionConfidence(94);
                      }}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                    >
                      Simulate "THANK-YOU"
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Real-time Recognition Output */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Detected Sign: </span>
                <span className="text-teal-400 font-mono font-bold">{detectedSign}</span>
              </div>
              <div className="text-slate-400">
                Confidence: <span className="text-white font-mono tabular-nums">{detectionConfidence}%</span>
              </div>
            </div>
          </div>

          {/* Text-to-ASL-Gloss Translator Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Speech & Text to ASL Gloss Translator</h3>
              <p className="text-xs text-slate-400">Generates authentic ASL syntax and non-manual markers</p>
            </div>

            <div className="space-y-2">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter event speech, vow, or announcement..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none font-sans"
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setInputText('Marcus, I promise to love you and cherish our life together.')}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    Preset Vows
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    onClick={() => setInputText('Dinner is served! Please join us at the banquet tables.')}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    Dinner Call
                  </button>
                </div>
                <button
                  onClick={handleTranslateText}
                  disabled={isTranslating}
                  className="px-3 py-1.5 text-xs font-medium text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  {isTranslating ? 'Synthesizing...' : 'Translate to ASL'}
                </button>
              </div>
            </div>

            {/* Gloss Result Output */}
            {glossResult && (
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 space-y-3 text-xs">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">ASL Gloss Representation</div>
                  <div className="font-mono text-teal-300 font-bold tracking-wide mt-0.5">
                    {glossResult.aslGloss}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 font-medium">Facial Grammar (NMM)</div>
                  <div className="text-slate-300 text-[11px] leading-relaxed">
                    {glossResult.nonManualMarkers}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 font-medium">Spatial Referencing Notes</div>
                  <div className="text-slate-300 text-[11px] leading-relaxed">
                    {glossResult.spatialGrammarNotes}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
