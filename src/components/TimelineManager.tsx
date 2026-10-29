import React, { useState } from 'react';
import { CountdownPhase, TimelineMilestone } from '../types';

interface TimelineManagerProps {
  countdownPhases: CountdownPhase[];
  milestones: TimelineMilestone[];
  onUpdatePhases: (phases: CountdownPhase[]) => void;
  onUpdateMilestones: (milestones: TimelineMilestone[]) => void;
}

export const TimelineManager: React.FC<TimelineManagerProps> = ({
  countdownPhases,
  milestones,
  onUpdatePhases,
  onUpdateMilestones,
}) => {
  const [activeMode, setActiveMode] = useState<'countdown' | 'runOfShow'>('countdown');
  const [isAddingMilestone, setIsAddingMilestone] = useState<boolean>(false);
  const [isAddingTask, setIsAddingTask] = useState<string | null>(null);

  // New Day-of milestone state
  const [newTime, setNewTime] = useState<string>('17:30');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDetails, setNewDetails] = useState<string>('');
  const [newCueType, setNewCueType] = useState<TimelineMilestone['cueType']>('visual');

  // New Countdown task state
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskCategory, setNewTaskCategory] = useState<string>('Planning');

  // Calculate overall countdown progress
  const allTasks = countdownPhases.flatMap((p) => p.tasks);
  const completedTasks = allTasks.filter((t) => t.completed);
  const progressPercent = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

  const handleToggleTask = (phaseId: string, taskId: string) => {
    const next = countdownPhases.map((phase) => {
      if (phase.id !== phaseId) return phase;
      return {
        ...phase,
        tasks: phase.tasks.map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        ),
      };
    });
    onUpdatePhases(next);
  };

  const handleAddTask = (phaseId: string) => {
    if (!newTaskTitle.trim()) return;
    const next = countdownPhases.map((phase) => {
      if (phase.id !== phaseId) return phase;
      return {
        ...phase,
        tasks: [
          ...phase.tasks,
          {
            id: `task-${Date.now()}`,
            title: newTaskTitle.trim(),
            category: newTaskCategory,
            completed: false,
          },
        ],
      };
    });
    onUpdatePhases(next);
    setNewTaskTitle('');
    setIsAddingTask(null);
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newM: TimelineMilestone = {
      id: `t-${Date.now()}`,
      time: newTime,
      title: newTitle.trim(),
      details: newDetails.trim() || 'Scheduled timeline item',
      cueType: newCueType,
      interpreterRotation: newCueType === 'interpreter',
    };

    const sorted = [...milestones, newM].sort((a, b) => a.time.localeCompare(b.time));
    onUpdateMilestones(sorted);
    setNewTitle('');
    setNewDetails('');
    setIsAddingMilestone(false);
  };

  const handleDeleteMilestone = (id: string) => {
    onUpdateMilestones(milestones.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Dual-Horizon Scheduling</span>
            <span aria-hidden="true">·</span>
            <span>Months Countdown</span>
            <span aria-hidden="true">·</span>
            <span>Day-Of Run-of-Show</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Event Timelines & Run-of-Show Manager
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Manage both macro horizons: track multi-month milestone checklists leading up to the celebration, and orchestrate the minute-by-minute day-of schedule with visual cue transitions and team interpreter rotations.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs shrink-0">
          <button
            onClick={() => setActiveMode('countdown')}
            className={`px-4 py-2 font-semibold rounded-md transition-colors cursor-pointer ${
              activeMode === 'countdown'
                ? 'bg-slate-800 text-teal-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Multi-Month Countdown
          </button>
          <button
            onClick={() => setActiveMode('runOfShow')}
            className={`px-4 py-2 font-semibold rounded-md transition-colors cursor-pointer ${
              activeMode === 'runOfShow'
                ? 'bg-slate-800 text-teal-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Day-Of Run-of-Show
          </button>
        </div>
      </div>

      {/* MODE 1: Multi-Month Countdown Timeline */}
      {activeMode === 'countdown' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Progress Bar Strip */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Pre-Event Milestone Preparation</span>
              <span className="font-mono text-teal-400 font-bold tabular-nums">
                {completedTasks.length} of {allTasks.length} Tasks Completed ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-teal-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Phase Cards */}
          <div className="space-y-6">
            {countdownPhases.map((phase) => {
              const phaseCompleted = phase.tasks.filter((t) => t.completed).length;
              return (
                <div
                  key={phase.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
                          {phase.timeframe}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="text-xs text-slate-400">
                          {phaseCompleted}/{phase.tasks.length} Completed
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{phase.description}</p>
                    </div>

                    <button
                      onClick={() => setIsAddingTask(phase.id)}
                      className="text-xs font-semibold text-teal-400 hover:text-teal-300 cursor-pointer self-start sm:self-auto"
                    >
                      + Add Task
                    </button>
                  </div>

                  {/* Add Task Inline Form */}
                  {isAddingTask === phase.id && (
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3 animate-in fade-in">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="Task title (e.g. 'Finalize seating chart')"
                          className="flex-1 bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-teal-500"
                        />
                        <select
                          value={newTaskCategory}
                          onChange={(e) => setNewTaskCategory(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="Planning">Planning</option>
                          <option value="Vendors">Vendors</option>
                          <option value="Venue">Venue</option>
                          <option value="Decor">Decor</option>
                          <option value="Accessibility">Accessibility</option>
                          <option value="Catering">Catering</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setIsAddingTask(null)}
                          className="text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddTask(phase.id)}
                          className="px-3 py-1 bg-teal-400 text-slate-950 font-semibold rounded"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tasks List */}
                  <div className="space-y-2">
                    {phase.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          task.completed
                            ? 'bg-slate-950/40 border-slate-800/40 opacity-70'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => handleToggleTask(phase.id, task.id)}
                            className="rounded text-teal-500 bg-slate-900 border-slate-700 w-4 h-4 cursor-pointer"
                          />
                          <span
                            className={`text-xs sm:text-sm font-medium ${
                              task.completed ? 'line-through text-slate-500' : 'text-slate-200'
                            }`}
                          >
                            {task.title}
                          </span>
                        </label>

                        <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                          {task.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE 2: Day-Of Minute-by-Minute Run-of-Show */}
      {activeMode === 'runOfShow' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-300">
              Minute-by-Minute Day-Of Schedule ({milestones.length} Milestones)
            </div>
            <button
              onClick={() => setIsAddingMilestone(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors cursor-pointer"
            >
              + Add Schedule Milestone
            </button>
          </div>

          {/* Add Milestone Form */}
          {isAddingMilestone && (
            <form
              onSubmit={handleAddMilestone}
              className="bg-slate-900 border border-teal-500/50 rounded-xl p-5 space-y-4 shadow-lg animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Add Schedule Event Milestone</h3>
                <button
                  type="button"
                  onClick={() => setIsAddingMilestone(false)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300">Time (24h)</label>
                  <input
                    type="text"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="17:30"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300">Milestone Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Cake Cutting Visual Countdown"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300">Cue Type</label>
                  <select
                    value={newCueType}
                    onChange={(e) => setNewCueType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="interpreter">ASL Interpreter Rotation</option>
                    <option value="visual">Visual Lighting Cue</option>
                    <option value="haptic">Haptic / Vibration Signal</option>
                    <option value="caption">CART Captioning Transition</option>
                    <option value="milestone">General Schedule Milestone</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-slate-300">Execution Details & Technical Notes</label>
                <input
                  type="text"
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  placeholder="e.g. Spotlight focus on cake table, dim ambient to 50%"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg cursor-pointer"
                >
                  Add to Run-of-Show
                </button>
              </div>
            </form>
          )}

          {/* Vertical Run-of-Show Timeline */}
          <div className="relative border-l border-slate-800 ml-4 sm:ml-8 space-y-6">
            {milestones.map((item) => (
              <div key={item.id} className="relative pl-6 sm:pl-8 group">
                <div
                  className={`absolute -left-2 top-1.5 w-4 h-4 rounded-full border-2 bg-slate-950 transition-colors ${
                    item.cueType === 'interpreter'
                      ? 'border-emerald-400'
                      : item.cueType === 'visual'
                      ? 'border-amber-400'
                      : item.cueType === 'haptic'
                      ? 'border-orange-400'
                      : item.cueType === 'caption'
                      ? 'border-sky-400'
                      : 'border-slate-500'
                  }`}
                />

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-teal-400 tabular-nums">
                        {item.time}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                        {item.cueType}
                      </span>
                      {item.interpreterRotation && (
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                          Interpreter Swap (20m)
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteMilestone(item.id)}
                        className="text-[11px] text-slate-500 hover:text-rose-400 cursor-pointer ml-2"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{item.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
