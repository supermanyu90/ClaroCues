import React, { useState } from 'react';
import { Header, NavTab } from './components/Header';
import { AiAssistantChat } from './components/AiAssistantChat';
import { PersonalizedIdeasView } from './components/PersonalizedIdeasView';
import { BudgetPlanner } from './components/BudgetPlanner';
import { TimelineManager } from './components/TimelineManager';
import { VendorChecklist } from './components/VendorChecklist';
import { LocalVenueRadar } from './components/LocalVenueRadar';
import { SignInterpreterEngine } from './components/SignInterpreterEngine';
import { FloorplanArchitect } from './components/FloorplanArchitect';
import { SensoryVisualConsole } from './components/SensoryVisualConsole';
import { GeminiBlueprintModal } from './components/GeminiBlueprintModal';
import { PdfReportModal } from './components/PdfReportModal';
import { LiveVoiceAssistantModal } from './components/LiveVoiceAssistantModal';
import { SAMPLE_WEDDING, SAMPLE_BIRTHDAY, SAMPLE_COMMUNITY } from './data/initialBlueprint';
import { EventPlan, VendorItem } from './types';

// High-fidelity domain photography assets
const IMG_WEDDING = '/src/assets/images/event_accessible_wedding_1793278067907.jpg';
const IMG_DANCEFLOOR = '/src/assets/images/sensory_visual_dancefloor_1793278069214.jpg';
const IMG_GALA = '/src/assets/images/community_gala_stage_1793278069893.jpg';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('assistant');
  const [currentPlan, setCurrentPlan] = useState<EventPlan>(SAMPLE_WEDDING);
  const [accessibilitySubTab, setAccessibilitySubTab] = useState<'avatar' | 'floorplan' | 'sensory' | 'audit'>('avatar');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState<boolean>(false);

  // Quick preset event switch
  const switchEvent = (eventKey: 'wedding' | 'birthday' | 'community') => {
    if (eventKey === 'wedding') setCurrentPlan(SAMPLE_WEDDING);
    else if (eventKey === 'birthday') setCurrentPlan(SAMPLE_BIRTHDAY);
    else setCurrentPlan(SAMPLE_COMMUNITY);
  };

  // Financial calculations
  const totalAllocated = currentPlan.budgetAllocation.reduce((acc, b) => acc + b.amount, 0);
  const totalRemaining = currentPlan.totalBudget - totalAllocated;
  const bookedVendors = currentPlan.vendorChecklist.filter((v) => v.status === 'Booked' || v.status === 'Paid').length;
  const allCountdownTasks = currentPlan.countdownPhases.flatMap((p) => p.tasks);
  const completedTasks = allCountdownTasks.filter((t) => t.completed).length;
  const prepProgress = allCountdownTasks.length > 0 ? Math.round((completedTasks / allCountdownTasks.length) * 100) : 0;

  // Active hero image based on current event
  const heroImage =
    currentPlan.eventType === 'wedding'
      ? IMG_WEDDING
      : currentPlan.eventType === 'birthday'
      ? IMG_DANCEFLOOR
      : IMG_GALA;

  const handleAddVendorFromRadar = (newVendor: VendorItem) => {
    setCurrentPlan((prev) => ({
      ...prev,
      vendorChecklist: [newVendor, ...prev.vendorChecklist],
    }));
  };

  const handleUpdatePlanVenue = (venueName: string) => {
    setCurrentPlan((prev) => ({
      ...prev,
      venueName,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/20 selection:text-teal-200">
      {/* Top Bar Contract Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenGenerateModal={() => setIsModalOpen(true)}
        onOpenLiveVoiceModal={() => setIsLiveVoiceOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Banner with Dynamic Photography & Event Preset Switcher */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Left Content Column */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
                  <span className="capitalize">{currentPlan.eventType} Planning</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentPlan.guestCount} Guests</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-teal-400 font-semibold">${currentPlan.totalBudget.toLocaleString()} Budget</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentPlan.dhhPercentage}% Accessibility Ratio</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                  {currentPlan.title}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                  {currentPlan.executiveSummary}
                </p>
              </div>

              {/* Event Switcher Segmented Control & Live CTAs */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-medium text-slate-400">Switch Active Event Demo:</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsLiveVoiceOpen(true)}
                      className="px-2.5 py-1 rounded-md bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                      <span>Live Voice Mode</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('venues')}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>📍 Maps Radar</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    onClick={() => switchEvent('wedding')}
                    className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      currentPlan.id === 'event-wedding'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-200 font-medium'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    💍 Accessible Wedding ($28.5k)
                  </button>
                  <button
                    onClick={() => switchEvent('birthday')}
                    className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      currentPlan.id === 'event-birthday'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-200 font-medium'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    🎂 40th Birthday Bash ($9.5k)
                  </button>
                  <button
                    onClick={() => switchEvent('community')}
                    className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      currentPlan.id === 'event-community'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-200 font-medium'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    🎪 Community Gala ($34k)
                  </button>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-teal-400 text-slate-950 font-semibold hover:bg-teal-300 transition-colors cursor-pointer"
                  >
                    + New Custom Plan
                  </button>
                  <button
                    onClick={() => setIsPdfModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Printable PDF Report</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Media Column */}
            <div className="lg:col-span-5 relative min-h-[240px] lg:min-h-full bg-slate-950 overflow-hidden border-t lg:border-t-0 lg:border-l border-slate-800">
              <img
                src={heroImage}
                alt={currentPlan.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-all duration-700"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-2 text-xs">
                <div className="font-semibold text-white truncate">{currentPlan.venueName}</div>
                <div className="text-[11px] text-teal-400 font-mono">{currentPlan.theme}</div>
              </div>
            </div>
          </div>
        </section>

        {/* 4-Column KPI Health Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="text-xs text-slate-400">Total Budget Remaining</div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums ${
                totalRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ${totalRemaining.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              ${totalAllocated.toLocaleString()} allocated of ${currentPlan.totalBudget.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="text-xs text-slate-400">Confirmed Vendors</div>
            <div className="text-2xl font-bold text-teal-400 font-mono tabular-nums">
              {bookedVendors} / {currentPlan.vendorChecklist.length}
            </div>
            <div className="text-[11px] text-slate-500">Booked & contracted partners</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="text-xs text-slate-400">Milestone Preparation</div>
            <div className="text-2xl font-bold text-sky-400 font-mono tabular-nums">
              {prepProgress}%
            </div>
            <div className="text-[11px] text-slate-500">
              {completedTasks} of {allCountdownTasks.length} checklist items done
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="text-xs text-slate-400">Run-of-Show Milestones</div>
            <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
              {currentPlan.timelineMilestones.length} Cues
            </div>
            <div className="text-[11px] text-slate-500">Visual & sensory choreography points</div>
          </div>
        </section>

        {/* Navigation Tabs Bar */}
        <div className="border-b border-slate-800 flex items-center gap-1 overflow-x-auto pb-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'assistant'
                ? 'bg-slate-800 text-teal-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Assistant & Strategy
          </button>
          <button
            onClick={() => setActiveTab('ideas')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'ideas'
                ? 'bg-slate-800 text-teal-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Personalized Ideas ({currentPlan.personalizedIdeas.length})
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'budget'
                ? 'bg-slate-800 text-teal-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Budget Planner (${currentPlan.totalBudget.toLocaleString()})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-slate-800 text-teal-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Timelines & Run-of-Show
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'vendors'
                ? 'bg-slate-800 text-teal-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Vendor Checklist ({currentPlan.vendorChecklist.length})
          </button>
          <button
            onClick={() => setActiveTab('venues')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'venues'
                ? 'bg-slate-800 text-teal-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Venue Radar</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Google Maps
            </span>
          </button>
          <button
            onClick={() => setActiveTab('accessibility')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'accessibility'
                ? 'bg-slate-800 text-teal-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Accessibility & Sensory Suite
          </button>
        </div>

        {/* TAB 1: AI Assistant Conversational Planner with Mic & Search Grounding */}
        {activeTab === 'assistant' && (
          <AiAssistantChat
            currentPlan={currentPlan}
            onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
          />
        )}

        {/* TAB 2: Personalized Creative Ideas Generator */}
        {activeTab === 'ideas' && (
          <PersonalizedIdeasView
            ideas={currentPlan.personalizedIdeas}
            currentPlan={currentPlan}
            onUpdateIdeas={(ideas) => setCurrentPlan({ ...currentPlan, personalizedIdeas: ideas })}
          />
        )}

        {/* TAB 3: Automated Budget Planner */}
        {activeTab === 'budget' && (
          <BudgetPlanner
            budgetItems={currentPlan.budgetAllocation}
            totalBudget={currentPlan.totalBudget}
            eventType={currentPlan.eventType}
            onUpdateItems={(items) => setCurrentPlan({ ...currentPlan, budgetAllocation: items })}
            onUpdateTotalBudget={(total) => setCurrentPlan({ ...currentPlan, totalBudget: total })}
          />
        )}

        {/* TAB 4: Dual-Horizon Timelines & Run-of-Show */}
        {activeTab === 'timeline' && (
          <TimelineManager
            countdownPhases={currentPlan.countdownPhases}
            milestones={currentPlan.timelineMilestones}
            onUpdatePhases={(phases) => setCurrentPlan({ ...currentPlan, countdownPhases: phases })}
            onUpdateMilestones={(milestones) => setCurrentPlan({ ...currentPlan, timelineMilestones: milestones })}
          />
        )}

        {/* TAB 5: Vendor Checklist & Procurement Manager */}
        {activeTab === 'vendors' && (
          <VendorChecklist
            vendors={currentPlan.vendorChecklist}
            onUpdateVendors={(vendors) => setCurrentPlan({ ...currentPlan, vendorChecklist: vendors })}
          />
        )}

        {/* TAB 6: Venue Radar (Google Maps Grounded with Gemini 3.8 Flash) */}
        {activeTab === 'venues' && (
          <LocalVenueRadar
            currentPlan={currentPlan}
            onUpdatePlanVenue={handleUpdatePlanVenue}
            onAddVendor={handleAddVendorFromRadar}
          />
        )}

        {/* TAB 7: Accessibility & Sensory Suite */}
        {activeTab === 'accessibility' && (
          <div className="space-y-6">
            {/* Accessibility Sub-Navigation */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                onClick={() => setAccessibilitySubTab('avatar')}
                className={`px-3 py-1.5 font-medium rounded transition-colors cursor-pointer ${
                  accessibilitySubTab === 'avatar'
                    ? 'bg-slate-800 text-teal-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ASL Avatar & Sign Recognition
              </button>
              <button
                onClick={() => setAccessibilitySubTab('floorplan')}
                className={`px-3 py-1.5 font-medium rounded transition-colors cursor-pointer ${
                  accessibilitySubTab === 'floorplan'
                    ? 'bg-slate-800 text-teal-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sightline Floorplan Raycaster
              </button>
              <button
                onClick={() => setAccessibilitySubTab('sensory')}
                className={`px-3 py-1.5 font-medium rounded transition-colors cursor-pointer ${
                  accessibilitySubTab === 'sensory'
                    ? 'bg-slate-800 text-teal-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sound-to-Light Dance Floor & Cues
              </button>
            </div>

            {accessibilitySubTab === 'avatar' && <SignInterpreterEngine />}
            {accessibilitySubTab === 'floorplan' && <FloorplanArchitect />}
            {accessibilitySubTab === 'sensory' && <SensoryVisualConsole cues={currentPlan.sensoryAndVisualCues} />}
          </div>
        )}
      </main>

      {/* Gemini AI Event Blueprint / Plan Modal */}
      <GeminiBlueprintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onApplyBlueprint={(newPlan) => {
          setCurrentPlan(newPlan);
          setActiveTab('assistant');
        }}
      />

      {/* Printable PDF Summary Report Modal */}
      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        plan={currentPlan}
      />

      {/* Gemini 3.8 Live Voice Assistant Modal */}
      <LiveVoiceAssistantModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        currentPlan={currentPlan}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-8 text-xs text-slate-500 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">ClaroCues</span>
            <span aria-hidden="true">·</span>
            <span>GenAI Event Planning Platform</span>
            <span aria-hidden="true">·</span>
            <span>Weddings, Birthdays & Community Gatherings</span>
          </div>
          <div>
            Powered by Gemini 3.8 Flash, Gemini 3.8 Live, Gemini 3.5 Transcribe & Google Maps Grounding.
          </div>
        </div>
      </footer>
    </div>
  );
}
