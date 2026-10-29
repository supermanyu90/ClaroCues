import React, { useState } from 'react';
import { EventPlan } from '../types';

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

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const res = await fetch('/api/gemini/plan-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          guestCount,
          budget,
          venueType,
          theme,
          dhhRatio: `${dhhPercentage}%`,
          specialRequests,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const transformed: EventPlan = {
          id: `plan-${Date.now()}`,
          title: data.title || `${eventType} Master Plan`,
          eventType: (eventType.toLowerCase().includes('wedding')
            ? 'wedding'
            : eventType.toLowerCase().includes('birthday')
            ? 'birthday'
            : 'community') as any,
          guestCount,
          dhhPercentage,
          totalBudget: budget,
          venueName: venueType,
          dateStr: 'Upcoming Celebration',
          theme: data.theme || theme,
          executiveSummary: data.executiveSummary || 'Comprehensive event plan with budgets, timelines, and vendor checklists.',
          budgetAllocation: (data.budgetAllocation || []).map((b: any, idx: number) => ({
            id: `b-gen-${idx}`,
            category: b.category,
            amount: b.amount,
            priority: b.priority || 'High',
            notes: b.notes || 'Allocated expense',
            status: 'Estimated' as const,
          })),
          countdownPhases: (data.countdownPhases || []).map((p: any, idx: number) => ({
            id: `phase-gen-${idx}`,
            timeframe: p.timeframe,
            description: p.description,
            tasks: (p.tasks || []).map((t: any, tIdx: number) => ({
              id: `task-gen-${idx}-${tIdx}`,
              title: t.title,
              category: t.category || 'Planning',
              completed: false,
            })),
          })),
          vendorChecklist: (data.vendorChecklist || []).map((v: any, idx: number) => ({
            id: `v-gen-${idx}`,
            category: v.category || 'General',
            name: v.name || 'Vendor Partner',
            contact: v.contact || 'Lead Representative',
            emailPhone: v.emailPhone || 'contact@vendor.com',
            status: v.status || 'To Research',
            estimatedCost: v.estimatedCost || 1500,
            keyQuestions: v.keyQuestions || ['What is your cancellation policy?'],
            deadline: v.deadline || '4 Months Out',
            notes: v.notes || 'Custom procurement note',
          })),
          timelineMilestones: (data.timelineMilestones || []).map((m: any, idx: number) => ({
            id: `m-gen-${idx}`,
            time: m.time,
            title: m.title,
            details: m.details,
            cueType: (m.cueType || 'milestone') as any,
            interpreterRotation: m.interpreterRotation || false,
          })),
          personalizedIdeas: (data.personalizedIdeas || []).map((idea: any, idx: number) => ({
            id: `idea-gen-${idx}`,
            category: idea.category || 'Theme & Palette',
            title: idea.title,
            description: idea.description,
            budgetImpact: idea.budgetImpact || 'Medium',
            implementationTip: idea.implementationTip || 'Coordinate with vendor team.',
            isSaved: true,
          })),
          sightlineAndSeating: data.sightlineAndSeating || {
            recommendedLayout: 'Radial Semi-Circle Seating',
            focalZones: ['Main Stage Center', 'Interpreter Dias Left', 'Dual Caption Screens'],
            lightingGuidance: '5000K daylight wash; zero silhouette backlight.',
          },
          interpreterStaffing: data.interpreterStaffing || {
            teamSize: 2,
            rotationIntervalMinutes: 20,
            qualifications: 'RID Certified Interpreter Pair',
            prepMaterialWindowDays: 7,
          },
          sensoryAndVisualCues: (data.sensoryAndVisualCues || []).map((c: any, idx: number) => ({
            id: `cue-gen-${idx}`,
            trigger: c.trigger,
            visualCue: c.visualCue,
            hapticCue: c.hapticCue,
            captionMode: c.captionMode,
          })),
          readinessChecklist: (data.readinessChecklist || []).map((r: any) => ({
            item: r.item,
            status: r.status === 'Verified' ? 'Verified' : 'Ready',
            detail: r.detail,
          })),
        };

        onApplyBlueprint(transformed);
        onClose();
      }
    } catch (err) {
      console.error('Failed to generate plan:', err);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Plan New Event with GenAI Assistant
            </h2>
            <p className="text-xs text-slate-400">
              Generates complete budgets, multi-month countdowns, day-of schedules, vendor checklists, and personalized ideas
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

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
              <label className="text-slate-300 font-medium">Event Title / Occasion</label>
              <input
                type="text"
                required
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="e.g. Maya's 40th Birthday or Wedding"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Venue Style / Location</label>
              <input
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
              <label className="text-slate-300 font-medium">
                Guest Count: <span className="font-mono text-teal-400">{guestCount}</span>
              </label>
              <input
                type="range"
                min="20"
                max="400"
                step="5"
                value={guestCount}
                onChange={(e) => setGuestCount(parseInt(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">
                Accessibility Ratio: <span className="font-mono text-teal-400">{dhhPercentage}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={dhhPercentage}
                onChange={(e) => setDhhPercentage(parseInt(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Total Budget ($)</label>
              <input
                type="number"
                min="1000"
                max="250000"
                step="500"
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value) || 20000)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono tabular-nums focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Theme & Creative Vibe</label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. Romantic Warm Amber, Electric 90s Neon, Tuscan Garden"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">
              Special Wishes & Priorities (Catering, AV, Music, Surprises)
            </label>
            <textarea
              rows={3}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

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
              {isGenerating ? 'Synthesizing Full Event Plan...' : 'Generate Comprehensive Event Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
