import React, { useState } from 'react';
import { TimelineMilestone } from '../types';

interface RunOfShowTimelineProps {
  milestones: TimelineMilestone[];
  onUpdateMilestones: (milestones: TimelineMilestone[]) => void;
}

export const RunOfShowTimeline: React.FC<RunOfShowTimelineProps> = ({
  milestones,
  onUpdateMilestones,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddingMilestone, setIsAddingMilestone] = useState<boolean>(false);
  const [newTime, setNewTime] = useState<string>('17:30');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDetails, setNewDetails] = useState<string>('');
  const [newCueType, setNewCueType] = useState<TimelineMilestone['cueType']>('visual');

  const filteredMilestones = milestones.filter(
    (m) => filterType === 'all' || m.cueType === filterType
  );

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newM: TimelineMilestone = {
      id: `t-${Date.now()}`,
      time: newTime,
      title: newTitle.trim(),
      details: newDetails.trim() || 'Visual cue synchronized milestone',
      cueType: newCueType,
      interpreterRotation: newCueType === 'interpreter',
    };

    const sorted = [...milestones, newM].sort((a, b) => a.time.localeCompare(b.time));
    onUpdateMilestones(sorted);
    setNewTitle('');
    setNewDetails('');
    setIsAddingMilestone(false);
  };

  const handleDelete = (id: string) => {
    onUpdateMilestones(milestones.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Accessible Run-of-Show</span>
            <span aria-hidden="true">·</span>
            <span>20-Minute Interpreter Rotation</span>
            <span aria-hidden="true">·</span>
            <span>Sensory Visual Buffers</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Smart Accessible Event Timeline & Run-of-Show
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Engineered to prevent visual exhaustion and maintain linguistic accuracy. Automatically schedules 20-minute team interpreter rotation intervals, visual chime announcements, and sensory buffer windows.
          </p>
        </div>

        <button
          onClick={() => setIsAddingMilestone(true)}
          className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          + Add Schedule Milestone
        </button>
      </div>

      {/* Filter Segmented Control */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="text-xs font-semibold text-slate-300">
          Timeline Milestones ({filteredMilestones.length})
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
          {['all', 'interpreter', 'visual', 'haptic', 'caption', 'milestone'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3 py-1 font-medium capitalize rounded transition-colors cursor-pointer ${
                filterType === tab
                  ? 'bg-slate-800 text-teal-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
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

      {/* Interactive Timeline List */}
      <div className="relative border-l border-slate-800 ml-4 sm:ml-8 space-y-6">
        {filteredMilestones.map((item) => {
          return (
            <div key={item.id} className="relative pl-6 sm:pl-8 group">
              {/* Dot on the timeline */}
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

              {/* Milestone Card */}
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
                        Interpreter Swap
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-[11px] text-slate-500 hover:text-rose-400 cursor-pointer ml-2"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{item.details}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
