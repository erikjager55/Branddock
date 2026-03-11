"use client";

import { useState } from "react";
import { Palette, Plus, X } from "lucide-react";
import { Input } from "@/components/shared";
import type { CompetitorDetail } from "../../types/competitor.types";

interface BrandSignalsSectionProps {
  competitor: CompetitorDetail;
  isEditing: boolean;
  editToneOfVoice: string;
  setEditToneOfVoice: (v: string) => void;
  editMessagingThemes: string[];
  setEditMessagingThemes: (v: string[]) => void;
  editVisualStyleNotes: string;
  setEditVisualStyleNotes: (v: string) => void;
}

/** Brand signals section with tone of voice, messaging themes, visual style notes */
export function BrandSignalsSection({
  competitor,
  isEditing,
  editToneOfVoice,
  setEditToneOfVoice,
  editMessagingThemes,
  setEditMessagingThemes,
  editVisualStyleNotes,
  setEditVisualStyleNotes,
}: BrandSignalsSectionProps) {
  const [newTheme, setNewTheme] = useState("");

  const addTheme = () => {
    const trimmed = newTheme.trim();
    if (trimmed && !editMessagingThemes.includes(trimmed)) {
      setEditMessagingThemes([...editMessagingThemes, trimmed]);
      setNewTheme("");
    }
  };

  const removeTheme = (idx: number) => {
    setEditMessagingThemes(editMessagingThemes.filter((_, i) => i !== idx));
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Palette className="h-4 w-4 text-gray-500" />
          Brand Signals
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tone of Voice</label>
            <textarea
              value={editToneOfVoice}
              onChange={(e) => setEditToneOfVoice(e.target.value)}
              rows={2}
              placeholder="How do they communicate?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Messaging Themes</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {editMessagingThemes.map((t, idx) => (
                <span key={idx} className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  {t}
                  <button type="button" onClick={() => removeTheme(idx)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add theme..."
                value={newTheme}
                onChange={(e) => setNewTheme(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTheme(); } }}
              />
              <button type="button" onClick={addTheme} className="flex-shrink-0 rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Visual Style Notes</label>
            <textarea
              value={editVisualStyleNotes}
              onChange={(e) => setEditVisualStyleNotes(e.target.value)}
              rows={2}
              placeholder="Visual brand characteristics..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    );
  }

  const hasContent = competitor.toneOfVoice || competitor.messagingThemes.length > 0 || competitor.visualStyleNotes;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Palette className="h-4 w-4 text-gray-500" />
        Brand Signals
      </h3>

      {!hasContent ? (
        <p className="text-sm text-gray-400 italic">No brand signal data available yet.</p>
      ) : (
        <div className="space-y-4">
          {competitor.toneOfVoice && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Tone of Voice</p>
              <p className="text-sm text-gray-700">{competitor.toneOfVoice}</p>
            </div>
          )}
          {competitor.messagingThemes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Messaging Themes</p>
              <div className="flex flex-wrap gap-2">
                {competitor.messagingThemes.map((t, idx) => (
                  <span key={idx} className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {competitor.visualStyleNotes && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Visual Style</p>
              <p className="text-sm text-gray-700">{competitor.visualStyleNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
