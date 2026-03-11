"use client";

import { useState } from "react";
import { Target, Plus, X } from "lucide-react";
import { Input } from "@/components/shared";
import type { CompetitorDetail } from "../../types/competitor.types";

interface PositioningSectionProps {
  competitor: CompetitorDetail;
  isEditing: boolean;
  editValueProposition: string;
  setEditValueProposition: (v: string) => void;
  editTargetAudience: string;
  setEditTargetAudience: (v: string) => void;
  editDifferentiators: string[];
  setEditDifferentiators: (v: string[]) => void;
}

/** Positioning section with value proposition, target audience, differentiators */
export function PositioningSection({
  competitor,
  isEditing,
  editValueProposition,
  setEditValueProposition,
  editTargetAudience,
  setEditTargetAudience,
  editDifferentiators,
  setEditDifferentiators,
}: PositioningSectionProps) {
  const [newDifferentiator, setNewDifferentiator] = useState("");

  const addDifferentiator = () => {
    const trimmed = newDifferentiator.trim();
    if (trimmed && !editDifferentiators.includes(trimmed)) {
      setEditDifferentiators([...editDifferentiators, trimmed]);
      setNewDifferentiator("");
    }
  };

  const removeDifferentiator = (idx: number) => {
    setEditDifferentiators(editDifferentiators.filter((_, i) => i !== idx));
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-gray-500" />
          Positioning
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Value Proposition</label>
            <textarea
              value={editValueProposition}
              onChange={(e) => setEditValueProposition(e.target.value)}
              rows={2}
              placeholder="What unique value do they offer?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Audience</label>
            <textarea
              value={editTargetAudience}
              onChange={(e) => setEditTargetAudience(e.target.value)}
              rows={2}
              placeholder="Who are they targeting?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Differentiators</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {editDifferentiators.map((d, idx) => (
                <span key={idx} className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  {d}
                  <button type="button" onClick={() => removeDifferentiator(idx)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add differentiator..."
                value={newDifferentiator}
                onChange={(e) => setNewDifferentiator(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDifferentiator(); } }}
              />
              <button type="button" onClick={addDifferentiator} className="flex-shrink-0 rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasContent = competitor.valueProposition || competitor.targetAudience || competitor.differentiators.length > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Target className="h-4 w-4 text-gray-500" />
        Positioning
      </h3>

      {!hasContent ? (
        <p className="text-sm text-gray-400 italic">No positioning data available yet.</p>
      ) : (
        <div className="space-y-4">
          {competitor.valueProposition && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Value Proposition</p>
              <p className="text-sm text-gray-700">{competitor.valueProposition}</p>
            </div>
          )}
          {competitor.targetAudience && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Target Audience</p>
              <p className="text-sm text-gray-700">{competitor.targetAudience}</p>
            </div>
          )}
          {competitor.differentiators.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Differentiators</p>
              <div className="flex flex-wrap gap-2">
                {competitor.differentiators.map((d, idx) => (
                  <span key={idx} className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
