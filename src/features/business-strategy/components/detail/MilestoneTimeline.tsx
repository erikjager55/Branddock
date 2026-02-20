'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/shared';
import { MILESTONE_COLORS } from '../../constants/strategy-types';
import type { MilestoneItem } from '../../types/business-strategy.types';

interface MilestoneTimelineProps {
  milestones: MilestoneItem[];
  onAdd: () => void;
}

export function MilestoneTimeline({ milestones, onAdd }: MilestoneTimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
                          <div
                            key={m.id}
                            className="relative flex flex-col items-center"
                            onMouseEnter={() => setHoveredId(m.id)}
                            onMouseLeave={() => setHoveredId(null)}
                          >
                            {/* Dot */}
                            <div
                              className={`w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${
                                MILESTONE_COLORS[m.status]
                              } ${m.status === 'FUTURE' ? 'ring-2 ring-gray-300 bg-white' : ''}`}
                            />

                            {/* Title */}
                            <span className="text-xs text-gray-600 mt-2 max-w-[80px] truncate text-center">
                              {m.title}
                            </span>

                            {/* Tooltip */}
                            {hoveredId === m.id && (
                              <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-20 w-48">
                                <p className="font-medium">{m.title}</p>
                                <p className="text-gray-300 mt-0.5">
                                  {new Date(m.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </p>
                                {m.description && (
                                  <p className="text-gray-400 mt-1">{m.description}</p>
                                )}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                              </div>
                            )}
                          </div>
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
