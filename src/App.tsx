import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { Header, type NavTab } from './components/Header';
import { TabList, TabPanel, type TabDef } from './components/ui/Tabs';
import { GeminiBlueprintModal } from './components/GeminiBlueprintModal';
import { PdfReportModal } from './components/PdfReportModal';
import { LiveVoiceAssistantModal } from './components/LiveVoiceAssistantModal';
import { INITIAL_TABLES, SAMPLE_BIRTHDAY, SAMPLE_COMMUNITY, SAMPLE_WEDDING } from './data/initialBlueprint';
import { type EventPlan, type SightlineTable, type VendorItem } from './types';
import { auditPlanAccessibility } from './utils/accessibilityAudit';
import IMG_WEDDING from './assets/images/wedding.jpg';
import IMG_DANCEFLOOR from './assets/images/dancefloor.jpg';
import IMG_GALA from './assets/images/gala.jpg';

// Each tab is its own chunk so the first paint only ships the assistant.
const AiAssistantChat = lazy(() =>
  import('./components/AiAssistantChat').then((m) => ({ default: m.AiAssistantChat }))
);
const PersonalizedIdeasView = lazy(() =>
  import('./components/PersonalizedIdeasView').then((m) => ({ default: m.PersonalizedIdeasView }))
);
const BudgetPlanner = lazy(() => import('./components/BudgetPlanner').then((m) => ({ default: m.BudgetPlanner })));
const TimelineManager = lazy(() =>
  import('./components/TimelineManager').then((m) => ({ default: m.TimelineManager }))
);
const VendorChecklist = lazy(() =>
  import('./components/VendorChecklist').then((m) => ({ default: m.VendorChecklist }))
);
const LocalVenueRadar = lazy(() =>
  import('./components/LocalVenueRadar').then((m) => ({ default: m.LocalVenueRadar }))
);
const SignInterpreterEngine = lazy(() =>
  import('./components/SignInterpreterEngine').then((m) => ({ default: m.SignInterpreterEngine }))
);
const FloorplanArchitect = lazy(() =>
  import('./components/FloorplanArchitect').then((m) => ({ default: m.FloorplanArchitect }))
);
const SensoryVisualConsole = lazy(() =>
  import('./components/SensoryVisualConsole').then((m) => ({ default: m.SensoryVisualConsole }))
);
const AccessReadinessAudit = lazy(() =>
  import('./components/AccessReadinessAudit').then((m) => ({ default: m.AccessReadinessAudit }))
);

type AccessSubTab = 'audit' | 'floorplan' | 'sensory' | 'avatar';

const PRESETS = [
  { plan: SAMPLE_WEDDING, label: 'Accessible Wedding ($28.5k)', icon: '💍' },
  { plan: SAMPLE_BIRTHDAY, label: '40th Birthday Bash ($9.5k)', icon: '🎂' },
  { plan: SAMPLE_COMMUNITY, label: 'Community Gala ($34k)', icon: '🎪' },
];

const HERO_IMAGES: Record<EventPlan['eventType'], string> = {
  wedding: IMG_WEDDING,
  birthday: IMG_DANCEFLOOR,
  community: IMG_GALA,
  corporate: IMG_GALA,
};

const mainTabClass = (selected: boolean) =>
  `px-4 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
    selected ? 'bg-slate-800 text-teal-300 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
  }`;

const subTabClass = (selected: boolean) =>
  `px-3 py-1.5 font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
    selected ? 'bg-slate-800 text-teal-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
  }`;

const PanelFallback = () => (
  <div role="status" className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-sm text-slate-400">
    Loading…
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('assistant');
  const [currentPlan, setCurrentPlan] = useState<EventPlan>(SAMPLE_WEDDING);
  const [accessSubTab, setAccessSubTab] = useState<AccessSubTab>('audit');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [interpreterPrepText, setInterpreterPrepText] = useState<string | null>(null);

  const updatePlan = useCallback((patch: Partial<EventPlan>) => setCurrentPlan((prev) => ({ ...prev, ...patch })), []);

  const seatingLayout = currentPlan.seatingLayout ?? INITIAL_TABLES;
  const audit = useMemo(() => auditPlanAccessibility(currentPlan, seatingLayout), [currentPlan, seatingLayout]);

  const totalAllocated = currentPlan.budgetAllocation.reduce((acc, b) => acc + b.amount, 0);
  const totalRemaining = currentPlan.totalBudget - totalAllocated;
  const bookedVendors = currentPlan.vendorChecklist.filter((v) => v.status === 'Booked' || v.status === 'Paid').length;
  const allCountdownTasks = currentPlan.countdownPhases.flatMap((p) => p.tasks);
  const completedTasks = allCountdownTasks.filter((t) => t.completed).length;
  const prepProgress = allCountdownTasks.length > 0 ? Math.round((completedTasks / allCountdownTasks.length) * 100) : 0;

  const openAccessTab = (sub: AccessSubTab) => {
    setAccessSubTab(sub);
    setActiveTab('accessibility');
  };

  const handleSendToInterpreterPrep = useCallback((text: string) => {
    setInterpreterPrepText(text);
    setAccessSubTab('avatar');
    setActiveTab('accessibility');
  }, []);

  const mainTabs: TabDef<NavTab>[] = [
    { key: 'assistant', label: 'AI Assistant' },
    { key: 'accessibility', label: `Accessibility Suite (${audit.score}/100)` },
    { key: 'budget', label: `Budget ($${currentPlan.totalBudget.toLocaleString()})` },
    { key: 'timeline', label: 'Timeline & Run-of-Show' },
    { key: 'vendors', label: `Vendors (${currentPlan.vendorChecklist.length})` },
    { key: 'venues', label: 'Venue Radar' },
    { key: 'ideas', label: `Ideas (${currentPlan.personalizedIdeas.length})` },
  ];

  const accessTabs: TabDef<AccessSubTab>[] = [
    { key: 'audit', label: 'Access Readiness Audit' },
    { key: 'floorplan', label: 'Sightline Floorplan' },
    { key: 'sensory', label: 'Visual & Haptic Cues' },
    { key: 'avatar', label: 'ASL Prep & Sign Practice' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        onGoHome={() => setActiveTab('assistant')}
        onOpenGenerateModal={() => setIsModalOpen(true)}
        onOpenLiveVoiceModal={() => setIsLiveVoiceOpen(true)}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8 focus:outline-none"
      >
        <section
          aria-labelledby="plan-title"
          className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
                  <span className="capitalize">{currentPlan.eventType} planning</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentPlan.guestCount} guests</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-teal-400 font-semibold">
                    ${currentPlan.totalBudget.toLocaleString()} budget
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{currentPlan.dhhPercentage}% Deaf / Hard-of-Hearing guests</span>
                </div>
                <h1 id="plan-title" className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                  {currentPlan.title}
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">{currentPlan.executiveSummary}</p>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="text-xs font-medium text-slate-400" id="preset-label">
                  Sample events
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs" role="group" aria-labelledby="preset-label">
                  {PRESETS.map(({ plan, label, icon }) => (
                    <button
                      key={plan.id}
                      onClick={() => setCurrentPlan(plan)}
                      aria-pressed={currentPlan.id === plan.id}
                      className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        currentPlan.id === plan.id
                          ? 'bg-teal-500/20 border-teal-500 text-teal-200 font-medium'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span aria-hidden="true">{icon} </span>
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-teal-400 text-slate-950 font-semibold hover:bg-teal-300 transition-colors cursor-pointer"
                  >
                    + New Custom Plan
                  </button>
                  <button
                    onClick={() => setIsPdfModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    Printable PDF Report
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative min-h-[240px] lg:min-h-full bg-slate-950 overflow-hidden border-t lg:border-t-0 lg:border-l border-slate-800">
              <img
                src={HERO_IMAGES[currentPlan.eventType]}
                alt=""
                width={1024}
                height={571}
                decoding="async"
                className="w-full h-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none"
              />
              <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-2 text-xs">
                <div className="font-semibold text-white truncate">{currentPlan.venueName}</div>
                <div className="text-[11px] text-teal-300 font-mono">{currentPlan.theme}</div>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Plan health" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => openAccessTab('audit')}
            className="text-left bg-slate-900 border border-slate-800 hover:border-teal-500/60 rounded-xl p-4 space-y-1 cursor-pointer transition-colors"
          >
            <div className="text-xs text-slate-400">Access readiness</div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums ${
                audit.score >= 85 ? 'text-emerald-400' : audit.score >= 60 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {audit.score}/100
            </div>
            <div className="text-[11px] text-slate-400">
              {audit.counts.fail} to fix · {audit.counts.warn} to review
            </div>
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="text-xs text-slate-400">Budget remaining</div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums ${totalRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              ${totalRemaining.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              ${totalAllocated.toLocaleString()} of ${currentPlan.totalBudget.toLocaleString()} allocated
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="text-xs text-slate-400">Confirmed vendors</div>
            <div className="text-2xl font-bold text-teal-400 font-mono tabular-nums">
              {bookedVendors} / {currentPlan.vendorChecklist.length}
            </div>
            <div className="text-[11px] text-slate-400">Booked or paid</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="text-xs text-slate-400">Preparation progress</div>
            <div className="text-2xl font-bold text-sky-400 font-mono tabular-nums">{prepProgress}%</div>
            <div className="text-[11px] text-slate-400">
              {completedTasks} of {allCountdownTasks.length} checklist items done
            </div>
          </div>
        </section>

        <TabList
          tabs={mainTabs}
          active={activeTab}
          onChange={setActiveTab}
          idPrefix="main"
          label="Planning workspace"
          className="border-b border-slate-800 flex items-center gap-1 overflow-x-auto pb-1 text-sm font-medium"
          tabClassName={mainTabClass}
        />

        <TabPanel idPrefix="main" tabKey={activeTab} className="focus:outline-none">
          <Suspense fallback={<PanelFallback />}>
            {activeTab === 'assistant' && (
              <AiAssistantChat
                key={currentPlan.id}
                currentPlan={currentPlan}
                onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
                onSendToInterpreterPrep={handleSendToInterpreterPrep}
              />
            )}

            {activeTab === 'ideas' && (
              <PersonalizedIdeasView
                ideas={currentPlan.personalizedIdeas}
                currentPlan={currentPlan}
                onUpdateIdeas={(ideas: EventPlan['personalizedIdeas']) => updatePlan({ personalizedIdeas: ideas })}
              />
            )}

            {activeTab === 'budget' && (
              <BudgetPlanner
                budgetItems={currentPlan.budgetAllocation}
                totalBudget={currentPlan.totalBudget}
                eventType={currentPlan.eventType}
                onUpdateItems={(items: EventPlan['budgetAllocation']) => updatePlan({ budgetAllocation: items })}
                onUpdateTotalBudget={(total: number) => updatePlan({ totalBudget: total })}
              />
            )}

            {activeTab === 'timeline' && (
              <TimelineManager
                countdownPhases={currentPlan.countdownPhases}
                milestones={currentPlan.timelineMilestones}
                onUpdatePhases={(phases: EventPlan['countdownPhases']) => updatePlan({ countdownPhases: phases })}
                onUpdateMilestones={(milestones: EventPlan['timelineMilestones']) =>
                  updatePlan({ timelineMilestones: milestones })
                }
              />
            )}

            {activeTab === 'vendors' && (
              <VendorChecklist
                vendors={currentPlan.vendorChecklist}
                onUpdateVendors={(vendors: VendorItem[]) => updatePlan({ vendorChecklist: vendors })}
              />
            )}

            {activeTab === 'venues' && (
              <LocalVenueRadar
                currentPlan={currentPlan}
                onUpdatePlanVenue={(venueName: string) => updatePlan({ venueName })}
                onAddVendor={(vendor: VendorItem) =>
                  setCurrentPlan((prev) => ({ ...prev, vendorChecklist: [vendor, ...prev.vendorChecklist] }))
                }
              />
            )}

            {activeTab === 'accessibility' && (
              <div className="space-y-6">
                <TabList
                  tabs={accessTabs}
                  active={accessSubTab}
                  onChange={setAccessSubTab}
                  idPrefix="access"
                  label="Accessibility tools"
                  className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs overflow-x-auto"
                  tabClassName={subTabClass}
                />
                <TabPanel idPrefix="access" tabKey={accessSubTab} className="focus:outline-none">
                  {accessSubTab === 'audit' && (
                    <AccessReadinessAudit
                      report={audit}
                      onOpenFloorplan={() => setAccessSubTab('floorplan')}
                      onOpenBudget={() => setActiveTab('budget')}
                    />
                  )}
                  {accessSubTab === 'floorplan' && (
                    <FloorplanArchitect
                      tables={seatingLayout}
                      onChangeTables={(tables: SightlineTable[]) => updatePlan({ seatingLayout: tables })}
                    />
                  )}
                  {accessSubTab === 'sensory' && <SensoryVisualConsole cues={currentPlan.sensoryAndVisualCues} />}
                  {accessSubTab === 'avatar' && (
                    <SignInterpreterEngine
                      key={interpreterPrepText ?? 'default'}
                      prepText={interpreterPrepText}
                      eventType={currentPlan.eventType}
                    />
                  )}
                </TabPanel>
              </div>
            )}
          </Suspense>
        </TabPanel>
      </main>

      <GeminiBlueprintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onApplyBlueprint={(newPlan) => {
          setCurrentPlan(newPlan);
          setActiveTab('accessibility');
          setAccessSubTab('audit');
        }}
      />

      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        plan={{ ...currentPlan, seatingLayout }}
      />

      <LiveVoiceAssistantModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        currentPlan={currentPlan}
      />

      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-8 text-xs text-slate-400 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-slate-300">ClaroCues</span> · Event planning built around Deaf,
            DeafBlind and Hard-of-Hearing guests
          </div>
          <div>
            AI drafts are planning aids. Always confirm access details with qualified interpreters and captioners.
          </div>
        </div>
      </footer>
    </div>
  );
}
