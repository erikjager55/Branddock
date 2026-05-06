"use client";

import { useState } from "react";
import { Plus, Trash2, Quote, FileText, Edit2, Check, X, RefreshCcw } from "lucide-react";
import { Button } from "@/components/shared";
import { AiContentBanner } from "../AiContentBanner";
import { useUpdateVoiceguide, useRecomputeCentroid } from "../../hooks";
import type { BrandVoiceguide } from "../../types/voiceguide.types";

interface ReferencesSectionProps {
  voiceguide: BrandVoiceguide;
}

const RECOMMENDED_MIN = 5;
const RECOMMENDED_MAX = 10;

export function ReferencesSection({ voiceguide }: ReferencesSectionProps) {
  const update = useUpdateVoiceguide();
  const recompute = useRecomputeCentroid();
  const [draft, setDraft] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const samples = voiceguide.writingSamples;

  const handleAdd = () => {
    const text = draft.trim();
    if (text.length < 30) return; // min 30 chars to be useful as fingerprint input
    update.mutate({ writingSamples: [...samples, text] });
    setDraft("");
  };

  const handleRemove = (idx: number) => {
    update.mutate({ writingSamples: samples.filter((_, i) => i !== idx) });
  };

  const handleStartEdit = (idx: number) => {
    setEditIndex(idx);
    setEditText(samples[idx]);
  };

  const handleSaveEdit = () => {
    if (editIndex === null) return;
    const text = editText.trim();
    if (text.length < 30) return;
    const next = samples.map((s, i) => (i === editIndex ? text : s));
    update.mutate({ writingSamples: next });
    setEditIndex(null);
    setEditText("");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-1">
          <Quote className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-gray-900">Writing samples</h3>
          <span className="text-xs text-gray-400 ml-auto">{samples.length}</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Curated examples of how the brand should sound. {RECOMMENDED_MIN}-{RECOMMENDED_MAX} samples is ideal — used as the
          embedding source for the F-VAL Pillar 1 voice fingerprint. Default OFF for AI prompt
          injection (verbose); the centroid is what matters.
        </p>

        {samples.length < RECOMMENDED_MIN && (
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 mb-3">
            Add at least {RECOMMENDED_MIN} samples for a reliable centroid. Currently: {samples.length}.
          </div>
        )}
        {samples.length > RECOMMENDED_MAX && (
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 mb-3">
            More than {RECOMMENDED_MAX} samples adds little. Curate to your strongest examples.
          </div>
        )}

        <div className="space-y-2">
          {samples.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No writing samples yet.</p>
              <p className="text-xs text-gray-400">Paste a snippet below to get started.</p>
            </div>
          )}
          {samples.map((sample, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3">
              {editIndex === i ? (
                <>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditIndex(null)}>
                      <X className="w-3.5 h-3.5 mr-1" />
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Save
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {sample.length > 600 ? sample.slice(0, 600) + "…" : sample}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>{sample.length} chars · ~{Math.round(sample.split(/\s+/).length)} words</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStartEdit(i)}
                        className="px-2 py-1 hover:bg-gray-100 rounded transition-colors"
                        aria-label="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemove(i)}
                        className="px-2 py-1 hover:bg-rose-50 hover:text-rose-600 rounded transition-colors"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="Paste a paragraph of brand-true content (min 30 chars)…"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <div className="mt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdd}
              disabled={draft.trim().length < 30}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add sample
            </Button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-700 font-medium">Voice centroid</p>
            <p className="text-xs text-gray-500">
              {voiceguide.centroidComputedAt
                ? `Last computed ${new Date(voiceguide.centroidComputedAt).toLocaleString()}`
                : "Not yet computed"}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => recompute.mutate()}
            isLoading={recompute.isPending}
            disabled={samples.length === 0}
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
            Recompute centroid
          </Button>
        </div>
      </div>

      <AiContentBanner section="references" savedForAi={voiceguide.referencesSavedForAi} />
    </div>
  );
}
