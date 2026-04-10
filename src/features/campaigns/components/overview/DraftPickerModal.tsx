"use client";

import { Plus, AlertCircle } from "lucide-react";
import { Modal, Button } from "@/components/shared";
import { DraftCampaignsList } from "./DraftCampaignsList";
import type { DraftSummary } from "../../types/campaign-wizard.types";

interface DraftPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: DraftSummary[];
  limit: number;
  /** Called when the user picks a draft to resume. */
  onResume: (id: string) => void;
  /** Called when the user archives a draft. */
  onArchive: (id: string) => void;
  /** Called when the user chooses to start a fresh wizard. */
  onStartNew: () => void;
  busyDraftId?: string | null;
}

/**
 * Decision point shown when the user clicks "New Campaign" while they have
 * one or more drafts in progress. Offers to resume an existing draft or
 * start fresh. When at the 5-draft limit, "Start new" is replaced by a
 * helper message explaining how to free up a slot.
 */
export function DraftPickerModal({
  isOpen,
  onClose,
  drafts,
  limit,
  onResume,
  onArchive,
  onStartNew,
  busyDraftId,
}: DraftPickerModalProps) {
  const atLimit = drafts.length >= limit;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={atLimit ? "Maximum drafts reached" : "Continue a draft or start new?"}
      subtitle={
        atLimit
          ? `You have ${limit} drafts in progress (the maximum). Resume or archive one before starting a new campaign.`
          : `You have ${drafts.length} draft${drafts.length === 1 ? "" : "s"} in progress. Resume one or start a new campaign.`
      }
      size="lg"
      footer={
        atLimit ? (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Archived drafts can be restored from the archived campaigns view.</span>
          </div>
        ) : (
          <div className="flex items-center justify-end">
            <Button variant="primary" icon={Plus} onClick={onStartNew}>
              Start new campaign
            </Button>
          </div>
        )
      }
    >
      <DraftCampaignsList
        drafts={drafts}
        limit={limit}
        onResume={onResume}
        onArchive={onArchive}
        busyDraftId={busyDraftId}
      />
    </Modal>
  );
}
