"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Send,
  Globe,
  MessageSquare,
  Download,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/shared";
import { useContentCanvasStore } from "@/features/campaigns/stores/useContentCanvasStore";
import {
  useBulkApprove,
  useBulkPublish,
  useExportDeliverables,
} from "@/features/campaigns/hooks/content-canvas.hooks";
import type { DeliverableResponse } from "@/types/campaign";

interface BulkActionBarProps {
  campaignId: string;
  deliverables: DeliverableResponse[];
  onDeleteDeliverables?: (ids: string[]) => void;
}

/** Floating action bar for bulk deliverable operations */
export function BulkActionBar({ campaignId, deliverables, onDeleteDeliverables }: BulkActionBarProps) {
  const { selectedDeliverableIds, clearSelection } = useContentCanvasStore();
  const bulkApprove = useBulkApprove(campaignId);
  const bulkPublish = useBulkPublish(campaignId);
  const exportDeliverables = useExportDeliverables(campaignId);

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [note, setNote] = useState("");

  const count = selectedDeliverableIds.size;
  if (count === 0) return null;

  // Get selected deliverables
  const selected = deliverables.filter((d) => selectedDeliverableIds.has(d.id));
  const selectedIds = selected.map((d) => d.id);

  // Determine which actions are valid (all selected must have same status)
  const allDraft = selected.length > 0 && selected.every((d) => (d.approvalStatus || "DRAFT") === "DRAFT");
  const allInReview = selected.length > 0 && selected.every((d) => d.approvalStatus === "IN_REVIEW");
  const allApproved = selected.length > 0 && selected.every((d) => d.approvalStatus === "APPROVED");

  const isPending = bulkApprove.isPending || bulkPublish.isPending || exportDeliverables.isPending;

  const handleSubmit = () => {
    bulkApprove.mutate(
      { ids: selectedIds, action: "submit" },
      { onSuccess: () => clearSelection() },
    );
  };

  const handleApprove = () => {
    bulkApprove.mutate(
      { ids: selectedIds, action: "approve" },
      { onSuccess: () => clearSelection() },
    );
  };

  const handleRequestChanges = () => {
    setNoteModalOpen(true);
  };

  const handleSubmitChanges = () => {
    bulkApprove.mutate(
      { ids: selectedIds, action: "request-changes", note: note.trim() || undefined },
      {
        onSuccess: () => {
          clearSelection();
          setNoteModalOpen(false);
          setNote("");
        },
      },
    );
  };

  const handlePublish = () => {
    bulkPublish.mutate(
      { ids: selectedIds },
      { onSuccess: () => clearSelection() },
    );
  };

  const handleExport = () => {
    exportDeliverables.mutate(selectedIds, {
      onSuccess: (data) => {
        const text = data.items.map((item) => item.text).join("\n\n---\n\n");
        navigator.clipboard.writeText(text);
      },
    });
  };

  const handleDelete = () => {
    if (!onDeleteDeliverables) return;
    const confirmed = window.confirm(
      `Delete ${count} deliverable${count !== 1 ? 's' : ''}? This cannot be undone.`,
    );
    if (confirmed) {
      onDeleteDeliverables(selectedIds);
      clearSelection();
    }
  };

  return (
    <>
      {/* Floating bar */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3 bg-white rounded-xl shadow-lg border border-gray-200"
        style={{ minWidth: 420 }}
      >
        {/* Left: count + deselect */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-900">
            {count} selected
          </span>
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            onClick={clearSelection}
          >
            Deselect all
          </button>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">
          <ActionButton
            icon={Send}
            label="Submit"
            disabled={!allDraft || isPending}
            title={allDraft ? "Submit for review" : "All selected must be Draft"}
            onClick={handleSubmit}
          />
          <ActionButton
            icon={CheckCircle2}
            label="Approve"
            disabled={!allInReview || isPending}
            title={allInReview ? "Approve selected" : "All selected must be In Review"}
            onClick={handleApprove}
          />
          <ActionButton
            icon={MessageSquare}
            label="Changes"
            disabled={!allInReview || isPending}
            title={allInReview ? "Request changes" : "All selected must be In Review"}
            onClick={handleRequestChanges}
          />
          <ActionButton
            icon={Globe}
            label="Publish"
            disabled={!allApproved || isPending}
            title={allApproved ? "Publish selected" : "All selected must be Approved"}
            onClick={handlePublish}
          />
          <ActionButton
            icon={Download}
            label="Export"
            disabled={isPending}
            title="Copy to clipboard"
            onClick={handleExport}
          />

          {onDeleteDeliverables && (
            <>
              <div className="w-px h-6 bg-gray-200" />
              <ActionButton
                icon={Trash2}
                label="Delete"
                disabled={isPending}
                title={`Delete ${count} deliverable${count !== 1 ? 's' : ''}`}
                onClick={handleDelete}
                danger
              />
            </>
          )}
        </div>
      </div>

      {/* Request Changes note modal */}
      <Modal
        isOpen={noteModalOpen}
        onClose={() => { setNoteModalOpen(false); setNote(""); }}
        title="Request Changes"
        subtitle={`Add a note for ${count} deliverable${count !== 1 ? "s" : ""}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              onClick={() => { setNoteModalOpen(false); setNote(""); }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-1.5 text-sm font-medium text-white rounded-md transition-colors"
              style={{ backgroundColor: "#0d9488" }}
              onClick={handleSubmitChanges}
              disabled={bulkApprove.isPending}
            >
              {bulkApprove.isPending ? "Sending..." : "Request Changes"}
            </button>
          </div>
        }
      >
        <textarea
          className="w-full h-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          placeholder="Describe what changes are needed..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
    </>
  );
}

/** Small action button for the bulk bar */
function ActionButton({
  icon: Icon,
  label,
  disabled,
  title,
  onClick,
  danger = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled: boolean;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const activeStyle = danger
    ? { color: "#dc2626", backgroundColor: "#fef2f2" }
    : { color: "#0f766e", backgroundColor: "#f0fdfa" };

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={disabled ? { color: "#9ca3af" } : activeStyle}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
