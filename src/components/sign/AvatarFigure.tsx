import type { AslSignItem } from '../../types';

type Keyframe = AslSignItem['keyframes'][number];

const BROW_PATHS: Record<Keyframe['brows'], [string, string]> = {
  raised: ['M 41 31 Q 44 28 47 31', 'M 53 31 Q 56 28 59 31'],
  lowered: ['M 41 33 Q 44 35 47 33', 'M 53 33 Q 56 35 59 33'],
  neutral: ['M 41 32 Q 44 32 47 32', 'M 53 32 Q 56 32 59 32'],
};

/** Simplified signing figure: hand positions, handshape (open/closed), head tilt and eyebrow grammar. */
export const AvatarFigure = ({ sign, frame }: { sign: AslSignItem; frame: Keyframe }) => {
  const [leftBrow, rightBrow] = BROW_PATHS[frame.brows];
  return (
    <svg
      role="img"
      aria-label={`Simplified avatar signing ${sign.gloss} (${sign.english}). ${sign.handshape}; ${sign.movement}.`}
      viewBox="0 0 100 100"
      className="w-full h-full max-w-xs transition-transform duration-300"
      style={{
        transform: `rotate(${frame.headTilt}deg)`,
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
      <path d="M 36 38 C 36 24, 64 24, 64 38 C 64 30, 50 26, 36 38 Z" fill="#1e293b" />

      {/* Eyebrows (reactive to non-manual grammar) */}
      <path d={leftBrow} fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round" />
      <path d={rightBrow} fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse cx="44" cy="36" rx="2" ry="2.5" fill="#1e293b" />
      <ellipse cx="56" cy="36" rx="2" ry="2.5" fill="#1e293b" />

      {/* Nose */}
      <path d="M 50 38 L 49 43 L 51 43" fill="none" stroke="#b45309" strokeWidth="0.8" strokeLinecap="round" />

      {/* Mouth (expressive) */}
      <path d="M 45 47 Q 50 51 55 47" fill="none" stroke="#991b1b" strokeWidth="1.2" strokeLinecap="round" />

      {/* Left Arm & Articulated Hand */}
      <line
        x1="32"
        y1="68"
        x2={frame.leftHand.x}
        y2={frame.leftHand.y}
        stroke="#475569"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle
        cx={frame.leftHand.x}
        cy={frame.leftHand.y}
        r={frame.leftHand.open ? '5' : '4'}
        fill="#2dd4bf"
        stroke="#0f766e"
        strokeWidth="1"
      />

      {/* Right Arm & Articulated Hand */}
      <line
        x1="68"
        y1="68"
        x2={frame.rightHand.x}
        y2={frame.rightHand.y}
        stroke="#475569"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle
        cx={frame.rightHand.x}
        cy={frame.rightHand.y}
        r={frame.rightHand.open ? '5' : '4'}
        fill="#2dd4bf"
        stroke="#0f766e"
        strokeWidth="1"
      />
    </svg>
  );
};
