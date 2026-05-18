"use client";

import React from "react";
import { X, FileSearch } from "lucide-react";
import type { StrategyObservationResponse } from "../api/brandclaw-observations.api";

interface EvidenceModalProps {
  observation: StrategyObservationResponse;
  onClose: () => void;
}

/**
 * EvidenceModal toont DataSnapshot ids + tool-calls die de observation
 * onderbouwen. Phase A: minimaal — alleen lijst van snapshot-ids +
 * tool-namen. Phase B uitbreiden met DataSnapshot.payload drill-down
 * (renderen welke alignment-scan / fidelity-score / review-log row de
 * agent als evidence gebruikte).
 */
export function EvidenceModal({ observation, onClose }: EvidenceModalProps) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const snapshotIds = observation.evidence?.snapshotIds ?? [];
  const toolCalls = observation.evidence?.toolCalls ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-gray-700" />
            <h2 className="text-sm font-semibold text-gray-900">Evidence-trail</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Summary</p>
            <p className="text-sm text-gray-900">{observation.summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-gray-50 rounded">
              <p className="font-semibold text-gray-500">Agent version</p>
              <p className="text-gray-800 font-mono text-[11px]">{observation.agentVersion}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <p className="font-semibold text-gray-500">Prompt version</p>
              <p className="text-gray-800 font-mono text-[11px]">{observation.promptVersion}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">
              DataSnapshot evidence ({snapshotIds.length})
            </p>
            {snapshotIds.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No snapshot evidence linked.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {snapshotIds.map((id) => (
                  <li
                    key={id}
                    className="font-mono text-[11px] text-gray-700 bg-gray-50 px-2 py-1 rounded break-all"
                  >
                    {id}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-gray-500 italic mt-2">
              Phase B uitbreiding: klik op een snapshot-id om de gepersisteerde DataSnapshot.payload
              JSON in te zien (alignment-scan / fidelity-score / review-log content op snapshot-moment).
            </p>
          </div>

          {toolCalls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">
                Tool-calls referenced ({toolCalls.length})
              </p>
              <ul className="space-y-1 text-xs">
                {toolCalls.map((tc, i) => (
                  <li
                    key={`${tc.name}-${i}`}
                    className="font-mono text-[11px] text-gray-700 bg-gray-50 px-2 py-1 rounded"
                  >
                    {tc.name}
                    {tc.inputHash && <span className="text-gray-500"> · {tc.inputHash}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
