import { useState, type FormEvent } from 'react';
import { type PersonalizedIdea, type EventPlan } from '../types';
import { generateIdeas } from '../services/apiClient';
import { errorMessage } from '../utils/api';
import { normalizeIdeas } from '../utils/planNormalizer';
import { ErrorNotice } from './ui/SourceBadge';
import { createId } from '../utils/id';

interface PersonalizedIdeasViewProps {
  ideas: PersonalizedIdea[];
  currentPlan: EventPlan;
  onUpdateIdeas: (ideas: PersonalizedIdea[]) => void;
}

export const PersonalizedIdeasView = ({ ideas, currentPlan, onUpdateIdeas }: PersonalizedIdeasViewProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customVibe, setCustomVibe] = useState<string>('');
  const [isBrainstorming, setIsBrainstorming] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'all',
    'Theme & Palette',
    'Food & Beverage',
    'Interactive Experience',
    'Atmosphere & Decor',
    'Inclusive Touch',
  ];

  const filteredIdeas = ideas.filter((idea) => selectedCategory === 'all' || idea.category === selectedCategory);

  const toggleSaveIdea = (id: string) => {
    const next = ideas.map((item) => (item.id === id ? { ...item, isSaved: !item.isSaved } : item));
    onUpdateIdeas(next);
  };

  const handleBrainstorm = async (e: FormEvent) => {
    e.preventDefault();
    if (!customVibe.trim() || isBrainstorming) return;

    setIsBrainstorming(true);
    setError(null);
    try {
      const data = await generateIdeas({
        eventType: currentPlan.eventType,
        vibe: customVibe,
        guestCount: currentPlan.guestCount,
        budget: currentPlan.totalBudget,
      });
      const newIdeas = normalizeIdeas(data.ideas, createId('idea')).map((i) => ({ ...i, isSaved: true }));
      onUpdateIdeas([...newIdeas, ...ideas]);
      setNotification(
        data.source === 'gemini'
          ? `Generated ${newIdeas.length} ideas for "${customVibe}".`
          : `AI is unavailable, so ${newIdeas.length} reference ideas were added instead.`
      );
      setTimeout(() => setNotification(null), 4000);
      setCustomVibe('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsBrainstorming(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Creative Conception</span>
            <span aria-hidden="true">·</span>
            <span>Personalized Inspiration</span>
            <span aria-hidden="true">·</span>
            <span>Multimodal Design</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Personalized Event Ideas & Inspiration Generator
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Curated concepts tailored specifically for weddings, birthdays, and community gatherings. From
            sensory-friendly lighting and interactive food stations to high-contrast palettes and memorable guest
            experiences.
          </p>
        </div>

        {/* Saved Count Badge */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs space-y-1 shrink-0">
          <div className="text-slate-400">Saved to Master Plan:</div>
          <div className="font-semibold text-teal-400 font-mono text-base tabular-nums">
            {ideas.filter((i) => i.isSaved).length} Ideas Bookmarked
          </div>
        </div>
      </div>

      {/* AI Brainstorm Custom Vibe Form */}
      <form onSubmit={handleBrainstorm} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-white">Brainstorm Custom Ideas with Gemini 2.5 Flash</div>
          <div className="text-[11px] text-slate-400">
            Current Plan: <span className="text-teal-400">{currentPlan.eventType}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            aria-label="Desired vibe or theme"
            maxLength={300}
            value={customVibe}
            onChange={(e) => setCustomVibe(e.target.value)}
            placeholder="Describe your desired vibe or theme (e.g., 'Warm Autumn Tuscan Garden', 'High-energy 80s Retro Neon', 'Zero-Waste Eco Community')..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-sans"
          />
          <button
            type="submit"
            disabled={isBrainstorming || !customVibe.trim()}
            className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-sm"
          >
            {isBrainstorming ? 'Brainstorming Ideas...' : 'Generate Personalized Ideas'}
          </button>
        </div>

        <div role="status">
          {notification && (
            <div className="text-xs font-medium text-teal-300 bg-teal-950/60 border border-teal-500/30 rounded p-2">
              {notification}
            </div>
          )}
        </div>
        <ErrorNotice message={error} onDismiss={() => setError(null)} />
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="text-xs font-semibold text-slate-300">Showing {filteredIdeas.length} Creative Concepts</div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs overflow-x-auto max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 font-medium capitalize rounded transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-teal-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredIdeas.map((idea) => {
          return (
            <div
              key={idea.id}
              className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between space-y-4 transition-all ${
                idea.isSaved
                  ? 'border-teal-500/50 bg-slate-900/90 shadow-md'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-teal-400 uppercase tracking-wider">
                      {idea.category}
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight">{idea.title}</h3>
                  </div>

                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border whitespace-nowrap ${
                      idea.budgetImpact === 'Low'
                        ? 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30'
                        : idea.budgetImpact === 'Medium'
                          ? 'text-amber-400 bg-amber-950/50 border-amber-500/30'
                          : 'text-rose-400 bg-rose-950/50 border-rose-500/30'
                    }`}
                  >
                    {idea.budgetImpact} Impact
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{idea.description}</p>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="bg-slate-950/70 border border-slate-800/60 rounded-lg p-3 text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">Implementation Advice:</div>
                  <div className="text-[11px] leading-relaxed">{idea.implementationTip}</div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {idea.isSaved ? '✓ Added to your master event book' : 'Available for inclusion'}
                  </span>
                  <button
                    onClick={() => toggleSaveIdea(idea.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      idea.isSaved
                        ? 'bg-slate-800 text-teal-300 hover:bg-slate-700'
                        : 'bg-teal-400 text-slate-950 hover:bg-teal-300'
                    }`}
                  >
                    {idea.isSaved ? 'Bookmarked' : '+ Save to Event Plan'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
