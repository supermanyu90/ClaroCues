import { useState } from 'react';
import { ASL_VOCABULARY } from '../data/initialBlueprint';
import type { EventCategory } from '../types';
import { GlossDraftPanel } from './sign/GlossDraftPanel';
import { SignAvatarPanel } from './sign/SignAvatarPanel';
import { SignPracticePanel } from './sign/SignPracticePanel';
import { ErrorNotice } from './ui/SourceBadge';

const DEFAULT_PREP_TEXT = 'Welcome everyone to our accessible wedding celebration!';

interface SignInterpreterEngineProps {
  /** Transcript handed over from the dictation studio, to prepare interpreter material. */
  prepText?: string | null;
  eventType?: EventCategory;
}

export const SignInterpreterEngine = ({ prepText, eventType = 'wedding' }: SignInterpreterEngineProps) => {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <h2 className="text-xl font-bold text-white tracking-tight">ASL Prep & Sign Practice</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Draft ASL gloss for speeches and announcements to send to your interpreter team ahead of the event, preview
            common event signs, and let hearing hosts practise signs with camera feedback. These are preparation aids:
            they do not replace qualified Deaf or hearing interpreters.
          </p>
        </div>
        <dl className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs">
          <div>
            <dt className="text-slate-400">Event signs</dt>
            <dd className="text-base font-semibold text-teal-400 font-mono tabular-nums">{ASL_VOCABULARY.length}</dd>
          </div>
          <div aria-hidden="true" className="w-px h-8 bg-slate-800" />
          <div>
            <dt className="text-slate-400">Sign check</dt>
            <dd className="text-base font-semibold text-white font-mono">Gemini vision</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <SignAvatarPanel />
        <div className="lg:col-span-5 space-y-6">
          <ErrorNotice message={error} onDismiss={() => setError(null)} />
          <GlossDraftPanel initialText={prepText || DEFAULT_PREP_TEXT} eventType={eventType} onError={setError} />
          <SignPracticePanel onError={setError} />
        </div>
      </div>
    </div>
  );
};
