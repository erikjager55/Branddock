"use client";

import { ArrowRight, FileEdit, Archive } from "lucide-react";
import { Button } from "@/components/shared";
import type { DraftSummary, DraftType } from "../../types/campaign-wizard.types";

// Step labels per wizard mode. Campaign = 6 steps, Content = 5 steps.
// The backend stores `type` on each draft so the row can label its step
// correctly. When `type` is missing (legacy payloads) we fall back to the
// campaign labels, which is a safe default for mixed lists.
const CAMPAIGN_STEP_LABELS = [
  "Setup",
  "Knowledge",
  "Strategy",
  "Concept",
  "Deliverables",
  "Review",
];
const CONTENT_STEP_LABELS = ["Setup", "Knowledge", "Strategy", "Concept", "Content"];

function stepLabelsForType(type: DraftType | undefined): string[] {
  return type === "CONTENT" ? CONTENT_STEP_LABELS : CAMPAIGN_STEP_LABELS;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "just now";
  const savedAt = new Date(iso).getTime();
  if (Number.isNaN(savedAt)) return "just now";
  const elapsedMs = Date.now() - savedAt;
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  if (elapsedSec < 5) return "just now";
  if (elapsedSec < 60) return `${elapsedSec}s ago`;
  const elapsedMin = Math.floor(elapsedSec / 60);
  if (elapsedMin < 60) return `${elapsedMin}m ago`;
  const elapsedHr = Math.floor(elapsedMin / 60);
  if (elapsedHr < 24) return `${elapsedHr}h ago`;
  const elapsedDay = Math.floor(elapsedHr / 24);
  return `${elapsedDay}d ago`;
}

interface DraftCampaignsListProps {
  drafts: DraftSummary[];
  limit: number;
  /** Called when the user clicks Continue on a specific draft. */
  onResume: (id: string) => void;
  /** Called when the user clicks Archive on a specific draft. */
  onArchive: (id: string) => void;
  /** Disables Continue + Archive buttons while a resume request is in flight. */
  busyDraftId?: string | null;
}

/**
 * Lists drafts-in-progress for the current user in the active workspace.
 * Rendered at the top of ActiveCampaignsPage, above the campaign grid.
 * Renders nothing when there are no drafts.
 */
export function DraftCampaignsList({
  drafts,
  limit,
  onResume,
  onArchive,
  busyDraftId,
}: DraftCampaignsListProps) {
  if (drafts.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/10">
        <FileEdit className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-gray-900">Drafts in progress</h3>
        <span className="text-xs text-gray-500">
          {drafts.length} of {limit}
        </span>
      </div>
      <ul className="divide-y divide-primary/10">
        {drafts.map((draft) => (
          <DraftRow
            key={draft.id}
            draft={draft}
            onResume={onResume}
            onArchive={onArchive}
            isBusy={busyDraftId === draft.id}
          />
        ))}
      </ul>
    </div>
  );
}

interface DraftRowProps {
  draft: DraftSummary;
  onResume: (id: string) => void;
  onArchive: (id: string) => void;
  isBusy: boolean;
}

function DraftRow({ draft, onResume, onArchive, isBusy }: DraftRowProps) {
  const labels = stepLabelsForType(draft.type);
  const stepLabel = labels[draft.wizardStep - 1] ?? `Step ${draft.wizardStep}`;
  const savedTime = formatRelativeTime(draft.wizardLastSavedAt);

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-primary/5 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
          <FileEdit className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{draft.name}</p>
          <p className="text-xs text-muted-foreground">
            Step {draft.wizardStep} of {labels.length} ({stepLabel}) · saved {savedTime}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => onArchive(draft.id)}
          disabled={isBusy}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Move to archive — can be restored later"
        >
          <Archive className="h-3.5 w-3.5" />
          Archive
        </button>
        <Button
          size="sm"
          onClick={() => onResume(draft.id)}
          disabled={isBusy}
          isLoading={isBusy}
          className="gap-1.5"
        >
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
