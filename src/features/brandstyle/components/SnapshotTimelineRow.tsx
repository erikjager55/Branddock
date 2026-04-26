"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/shared";
import { useSnapshotDiff, useUpdateSnapshotNotes } from "../hooks/useSnapshots";
import { SnapshotDiffPanel } from "./SnapshotDiffPanel";
import type { SnapshotSummary } from "@/lib/brandstyle/snapshots/types";

interface Props {
  snapshot: SnapshotSummary;
  isLatest: boolean;
  isOldest: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  previousSnapshotId: string | null;
}

export function SnapshotTimelineRow({
  snapshot,
  isLatest,
  isOldest,
  expanded,
  onToggleExpand,
  previousSnapshotId,
}: Props) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(snapshot.notes ?? '');
  const updateNotes = useUpdateSnapshotNotes();

  const diffQuery = useSnapshotDiff(previousSnapshotId, snapshot.id);

  const formattedDate = new Date(snapshot.capturedAt).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const handleSaveNotes = () => {
    updateNotes.mutate(
      { id: snapshot.id, notes: draftNotes.trim() || null },
      { onSuccess: () => setIsEditingNotes(false) },
    );
  };

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        {/* Timeline dot + line */}
        <div className="flex flex-col items-center flex-shrink-0 mt-1">
          <div
            className={`w-3 h-3 rounded-full ${isLatest ? 'bg-teal-500' : 'bg-gray-300'}`}
            style={{ minWidth: 12 }}
          />
          {!isOldest && <div className="w-px h-full bg-gray-200 mt-1" style={{ minHeight: 24 }} />}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">{formattedDate}</span>
                {isLatest && (
                  <span className="inline-flex items-center text-[10px] font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                    Latest
                  </span>
                )}
                <span className="text-[10px] text-gray-400 font-mono">
                  {snapshot.tokensHash.slice(0, 8)}
                </span>
                <span className="text-[10px] text-gray-400">via {snapshot.triggerSource}</span>
                {snapshot.triggeredBy?.name && (
                  <span className="text-[10px] text-gray-500">by {snapshot.triggeredBy.name}</span>
                )}
              </div>
              {snapshot.changeSummary ? (
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">{snapshot.changeCount} change{snapshot.changeCount === 1 ? '' : 's'}</span>
                  <span className="text-gray-500"> · {snapshot.changeSummary}</span>
                </p>
              ) : isOldest ? (
                <p className="text-xs text-gray-500 mt-1">Initial snapshot</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1 italic">No significant changes</p>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleExpand}
              className="text-xs text-teal-700 hover:underline flex items-center gap-1 flex-shrink-0"
              disabled={!previousSnapshotId}
            >
              {expanded ? (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronRight className="w-3 h-3" />
                  {previousSnapshotId ? 'Show details' : 'Initial'}
                </>
              )}
            </button>
          </div>

          {/* Notes inline-edit */}
          <div className="mt-2">
            {isEditingNotes ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="Add a label (e.g. 'Pre-rebrand')"
                  className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  maxLength={200}
                  autoFocus
                />
                <Button variant="primary" size="sm" onClick={handleSaveNotes} disabled={updateNotes.isPending}>
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingNotes(false);
                    setDraftNotes(snapshot.notes ?? '');
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : snapshot.notes ? (
              <button
                type="button"
                onClick={() => setIsEditingNotes(true)}
                className="text-xs text-gray-700 hover:text-gray-900 flex items-center gap-1.5 group"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span className="font-medium">{snapshot.notes}</span>
                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingNotes(true)}
                className="text-[11px] text-gray-400 hover:text-teal-700 flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                Add label
              </button>
            )}
          </div>

          {/* Expanded diff */}
          {expanded && previousSnapshotId && (
            <div className="mt-4">
              {diffQuery.isLoading ? (
                <p className="text-xs text-gray-400">Loading diff…</p>
              ) : diffQuery.data ? (
                <SnapshotDiffPanel diff={diffQuery.data.diff} summary={diffQuery.data.summary} />
              ) : (
                <p className="text-xs text-gray-400">Failed to load diff.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
