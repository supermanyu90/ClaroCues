import React, { useState } from 'react';
import { EventPlan } from '../types';
import { errorMessage, postJson } from '../utils/api';
import { normalizeGeneratedPlan } from '../utils/planNormalizer';
import { Modal } from './ui/Modal';
import { ErrorNotice } from './ui/SourceBadge';

interface GeminiBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBlueprint: (plan: EventPlan) => void;
}

export const GeminiBlueprintModal: React.FC<GeminiBlueprintModalProps> = ({
  isOpen,
  onClose,
  onApplyBlueprint,
}) => {
  const [eventType, setEventType] = useState<string>('Accessible Wedding');
  const [guestCount, setGuestCount] = useState<number>(120);
  const [budget, setBudget] = useState<number>(25000);
  const [venueType, setVenueType] = useState<string>('Pavilion with Courtyard');
  const [theme, setTheme] = useState<string>('Warm Amber, Midnight Navy & Tactile Rhythm');
  const [dhhPercentage, setDhhPercentage] = useState<number>(30);
  const [specialRequests, setSpecialRequests] = useState<string>(
    'Include vendor checklists with key questions to ask, multi-month countdown tasks, sound-to-light dancefloor, and low-profile centerpieces under 9 inches.'
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    try {
      const data = await postJson<Record<string, unknown>>('/api/gemini/plan-event', {
        eventType,
        guestCount,
        budget,
        venueType,
        theme,
        dhhRatio: dhhPercentage,
        specialRequests,
      });
      onApplyBlueprint(
        normalizeGeneratedPlan(data, { eventLabel: eventType, guestCount, budget, venueType, theme, dhhPercentage })
      );
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const loadPreset = (presetType: 'wedding' | 'birthday' | 'community') => {
    if (presetType === 'wedding') {
      setEventType('Accessible Wedding & Reception');
      setGuestCount(130);
      setBudget(28500);
      setVenueType('The Atrium Pavilion (Daylight Glasshouse)');
      setTheme('Romantic Warm Amber & Midnight Navy');
      setDhhPercentage(45);
      setSpecialRequests('Teamed ASL interpreters on 20-min swaps, low centerpieces (<8.5"), single-bite finger food, and sound-to-light LED dance floor.');
    } else if (presetType === 'birthday') {
      setEventType('Maya\'s 40th Milestone Birthday Bash');
      setGuestCount(65);
      setBudget(9500);
      setVenueType('Skyline Loft & Rooftop Terrace');
      setTheme('Vibrant 90s Neon Glow & Tactile Rhythm');
      setDhhPercentage(30);
      setSpecialRequests('DJ with sound-reactive lighting, open craft cocktail/mocktail tasting bar, live interactive trivia with projector captions.');
    } else {
      setEventType('Harmony Valley Community Cultural Gathering');
      setGuestCount(240);
      setBudget(34000);
      setVenueType('Civic Cultural Center & Heritage Hall');
      setTheme('Unity in Diversity: Sights, Sounds & Shared Flavors');
      setDhhPercentage(35);
      setSpecialRequests('Dual 150-inch CART screens, 5 local diverse food truck partners, pro-tactile guides for DeafBlind guests, accessible 8ft corridors.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Plan a New Event with AI"
      description="Generates a budget, countdown, run-of-show, vendor checklist and access plan you can edit."
    >
      <div className="p-6 space-y-6">
        {/* Quick Presets Strip */}
        <div className="space-y-1.5">
          <div className="text-xs text-slate-400 font-medium">Quick Event Presets:</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => loadPreset('wedding')}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-teal-500 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              💍 Wedding (130 guests · $28.5k)
            </button>
            <button
              type="button"
              onClick={() => loadPreset('birthday')}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-teal-500 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              🎂 40th Birthday (65 guests · $9.5k)
            </button>
            <button
              type="button"
              onClick={() => loadPreset('community')}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-teal-500 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              🎪 Community Gala (240 guests · $34k)
            </button>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="plan-event-type" className="text-slate-300 font-medium">Event Title / Occasion</label>
              <input
                id="plan-event-type"
                type="text"
                required
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="e.g. Maya's 40th Birthday or Wedding"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="plan-venue" className="text-slate-300 font-medium">Venue Style / Location</label>
              <input
                id="plan-venue"
                type="text"
                required
                value={venueType}
                onChange={(e) => setVenueType(e.target.value)}
                placeholder="e.g. Garden Pavilion or Rooftop Loft"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="plan-guests" className="text-slate-300 font-medium">
                Guest Count: <span className="font-mono text-teal-400">{guestCount}</span>
              </label>
              <input
                id="plan-guests"
                type="range"
                min="20"
                max="400"
                step="5"
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="plan-dhh" className="text-slate-300 font-medium">
                Deaf / Hard-of-Hearing guests: <span className="font-mono text-teal-400">{dhhPercentage}%</span>
              </label>
              <input
                id="plan-dhh"
                type="range"
                min="0"
                max="100"
                step="5"
                value={dhhPercentage}
                onChange={(e) => setDhhPercentage(Number(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="plan-budget" className="text-slate-300 font-medium">Total Budget ($)</label>
              <input
                id="plan-budget"
                type="number"
                min="1000"
                max="250000"
                step="500"
                value={budget}
                onChange={(e) => setBudget(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono tabular-nums focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="plan-theme" className="text-slate-300 font-medium">Theme & Creative Vibe</label>
            <input
                id="plan-theme"
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. Romantic Warm Amber, Electric 90s Neon, Tuscan Garden"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="plan-requests" className="text-slate-300 font-medium">
              Special Wishes & Priorities (Catering, AV, Music, Surprises)
            </label>
            <textarea
                id="plan-requests"
              rows={3}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              maxLength={1500}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          <ErrorNotice message={error} onDismiss={() => setError(null)} />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-5 py-2 font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shadow-md"
            >
              {isGenerating ? 'Generating plan…' : 'Generate event plan'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
