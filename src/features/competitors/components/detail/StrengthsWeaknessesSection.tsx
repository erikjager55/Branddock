"use client";

import { useState } from "react";
import { Shield, Plus, X, ThumbsUp, ThumbsDown } from "lucide-react";
import { Input } from "@/components/shared";
import type { CompetitorDetail } from "../../types/competitor.types";

interface StrengthsWeaknessesSectionProps {
  competitor: CompetitorDetail;
  isEditing: boolean;
  editStrengths: string[];
  setEditStrengths: (v: string[]) => void;
  editWeaknesses: string[];
  setEditWeaknesses: (v: string[]) => void;
}

/** Strengths & weaknesses section with 2-column layout */
export function StrengthsWeaknessesSection({
  competitor,
  isEditing,
  editStrengths,
  setEditStrengths,
  editWeaknesses,
  setEditWeaknesses,
}: StrengthsWeaknessesSectionProps) {
  const [newStrength, setNewStrength] = useState("");
  const [newWeakness, setNewWeakness] = useState("");

  const addStrength = () => {
    const trimmed = newStrength.trim();
    if (trimmed && !editStrengths.includes(trimmed)) { setEditStrengths([...editStrengths, trimmed]); setNewStrength(""); }
  };

  const addWeakness = () => {
    const trimmed = newWeakness.trim();
    if (trimmed && !editWeaknesses.includes(trimmed)) { setEditWeaknesses([...editWeaknesses, trimmed]); setNewWeakness(""); }
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-500" />
          Strengths & Weaknesses
        </h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Strengths */}
          <div>
            <p className="text-xs font-medium text-emerald-700 mb-2 flex items-center gap-1">
              <ThumbsUp className="h-3.5 w-3.5" /> Strengths
            </p>
            <div className="space-y-2 mb-2">
              {editStrengths.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">
                  <span className="flex-1">{s}</span>
                  <button type="button" onClick={() => setEditStrengths(editStrengths.filter((_, i) => i !== idx))} className="text-emerald-400 hover:text-emerald-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Add strength..." value={newStrength} onChange={(e) => setNewStrength(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStrength(); } }} />
              <button type="button" onClick={addStrength} className="flex-shrink-0 rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weaknesses */}
          <div>
            <p className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1">
              <ThumbsDown className="h-3.5 w-3.5" /> Weaknesses
            </p>
            <div className="space-y-2 mb-2">
              {editWeaknesses.map((w, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-800">
                  <span className="flex-1">{w}</span>
                  <button type="button" onClick={() => setEditWeaknesses(editWeaknesses.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Add weakness..." value={newWeakness} onChange={(e) => setNewWeakness(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addWeakness(); } }} />
              <button type="button" onClick={addWeakness} className="flex-shrink-0 rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasContent = competitor.strengths.length > 0 || competitor.weaknesses.length > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4 text-gray-500" />
        Strengths & Weaknesses
      </h3>

      {!hasContent ? (
        <p className="text-sm text-gray-400 italic">No SWOT data available yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Strengths */}
          <div>
            <p className="text-xs font-medium text-emerald-700 mb-2 flex items-center gap-1">
              <ThumbsUp className="h-3.5 w-3.5" /> Strengths
            </p>
            {competitor.strengths.length > 0 ? (
              <ul className="space-y-1.5">
                {competitor.strengths.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">None identified</p>
            )}
          </div>

          {/* Weaknesses */}
          <div>
            <p className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1">
              <ThumbsDown className="h-3.5 w-3.5" /> Weaknesses
            </p>
            {competitor.weaknesses.length > 0 ? (
              <ul className="space-y-1.5">
                {competitor.weaknesses.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                    {w}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">None identified</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
