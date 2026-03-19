'use client';

import { useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/shared';
import { MILESTONE_COLORS } from '../../constants/strategy-types';
import { useUpdateMilestone, useDeleteMilestone } from '../../hooks';
import type { MilestoneItem, MilestoneStatus } from '../../types/business-strategy.types';

interface MilestoneTimelineProps {
  milestones: MilestoneItem[];
  strategyId: string;
  onAdd: () => void;
}

const NEXT_STATUS: Record<MilestoneStatus, MilestoneStatus> = {
  UPCOMING: 'DONE',
  DONE: 'UPCOMING',
  FUTURE: 'UPCOMING',
};

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  DONE: 'Done',
  UPCOMING: 'Upcoming',
  FUTURE: 'Future',
};

function MilestoneItemWithHooks({
  milestone,
  strategyId,
}: {
  milestone: MilestoneItem;
  strategyId: string;
}) {
  const updateMilestone = useUpdateMilestone(strategyId, milestone.id);
  const deleteMilestone = useDeleteMilestone(strategyId, milestone.id);
  const [hoveredId, setHoveredId] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(milestone.title);

  const handleStatusToggle = () => {
    const newStatus = NEXT_STATUS[milestone.status];
    updateMilestone.mutate({ status: newStatus });
  };

  const handleSaveTitle = () => {
    if (!editTitle.trim() || editTitle.trim() === milestone.title) {
      setIsEditing(false);
      setEditTitle(milestone.title);
      return;
    }
    updateMilestone.mutate(
      { title: editTitle.trim() },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleDelete = () => {
    if (confirm(`Delete milestone "${milestone.title}"?`)) {
      deleteMilestone.mutate(undefined);
    }
  };

  return (
    <div
      className="group relative flex flex-col items-center"
      onMouseEnter={() => setHoveredId(true)}
      onMouseLeave={() => setHoveredId(false)}
    >
      {/* Clickable dot for status toggle */}
      <button
        type="button"
        onClick={handleStatusToggle}
        className={`w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 transition-transform hover:scale-125 ${
          MILESTONE_COLORS[milestone.status]
        } ${milestone.status === 'FUTURE' ? 'ring-2 ring-gray-300 bg-white' : ''}`}
        title={`Click to toggle (${STATUS_LABEL[milestone.status]} \u2192 ${STATUS_LABEL[NEXT_STATUS[milestone.status]]})`}
      />

      {/* Title (inline edit or display) */}
      {isEditing ? (
        <div className="flex items-center gap-0.5 mt-1.5">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') { setIsEditing(false); setEditTitle(milestone.title); }
            }}
            className="w-[80px] px-1 py-0.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <button type="button" onClick={handleSaveTitle} className="p-0.5 text-emerald-600">
            <Check className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => { setIsEditing(false); setEditTitle(milestone.title); }}
            className="p-0.5 text-gray-400"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setEditTitle(milestone.title); setIsEditing(true); }}
          className="text-xs text-gray-600 mt-2 max-w-[80px] truncate text-center hover:text-gray-900 cursor-text"
          title="Click to edit title"
        >
          {milestone.title}
        </button>
      )}

      {/* Delete button on hover */}
      <button
        type="button"
        onClick={handleDelete}
        className={`mt-1 p-0.5 text-gray-400 hover:text-red-500 rounded transition-opacity ${
          hoveredId ? 'opacity-100' : 'opacity-0'
        }`}
        title="Delete milestone"
      >
        <Trash2 className="w-3 h-3" />
      </button>

      {/* Tooltip */}
      {hoveredId && !isEditing && (
        <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-20 w-48">
          <p className="font-medium">{milestone.title}</p>
          <p className="text-gray-300 mt-0.5">
            {new Date(milestone.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="text-gray-400 mt-0.5 text-[10px]">
            {STATUS_LABEL[milestone.status]} &middot; Click dot to toggle
          </p>
          {milestone.description && (
            <p className="text-gray-400 mt-1">{milestone.description}</p>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

export function MilestoneTimeline({ milestones, strategyId, onAdd }: MilestoneTimelineProps) {
  // Collect unique quarters and sort them
  const quarters = Array.from(new Set(milestones.map((m) => m.quarter))).sort();

  // If no quarters, generate default for current year
  const currentYear = new Date().getFullYear();
  const displayQuarters =
    quarters.length > 0
      ? quarters
      : [`Q1 ${currentYear}`, `Q2 ${currentYear}`, `Q3 ${currentYear}`, `Q4 ${currentYear}`];

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Milestones</h2>
        <Button variant="ghost" size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" /> Add Milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No milestones defined yet</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Quarter labels */}
            <div className="flex justify-between mb-2 px-2">
              {displayQuarters.map((q) => (
                <span key={q} className="text-xs font-medium text-gray-500">
                  {q}
                </span>
              ))}
            </div>

            {/* Timeline bar */}
            <div className="relative">
              <div className="h-0.5 bg-gray-200 absolute top-3 left-0 right-0" />

              <div className="flex justify-between relative px-2">
                {displayQuarters.map((q) => {
                  const qMilestones = milestones.filter((m) => m.quarter === q);

                  return (
                    <div key={q} className="flex flex-col items-center relative">
                      {qMilestones.length > 0 ? (
                        qMilestones.map((m) => (
                          <MilestoneItemWithHooks
                            key={m.id}
                            milestone={m}
                            strategyId={strategyId}
                          />
                        ))
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
