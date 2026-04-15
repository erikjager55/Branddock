"use client";

import React from "react";
import { List, LayoutGrid } from "lucide-react";
import { DeliverableRow } from "./DeliverableRow";
import { DeliverablesBoardView } from "./DeliverablesBoardView";
import { useCampaignStore } from "../../stores/useCampaignStore";
import { useUpdateDeliverable } from "../../hooks";
import type { DeliverableResponse, DeliverableStatus } from "@/types/campaign";

interface DeliverablesTabProps {
  deliverables: DeliverableResponse[];
  campaignId: string;
  onOpenInStudio?: (deliverableId: string) => void;
  onDelete?: (deliverableId: string) => void;
}

export function DeliverablesTab({ deliverables, campaignId, onOpenInStudio, onDelete }: DeliverablesTabProps) {
  const safeDeliverables = Array.isArray(deliverables) ? deliverables : [];
  const viewMode = useCampaignStore((s) => s.deliverablesViewMode);
  const setViewMode = useCampaignStore((s) => s.setDeliverablesViewMode);
  const updateDeliverable = useUpdateDeliverable(campaignId);

  const handleStatusChange = (deliverableId: string, newStatus: DeliverableStatus) => {
    updateDeliverable.mutate({ deliverableId, body: { status: newStatus } });
  };

  return (
    <div data-testid="deliverables-tab">
      {/* View toggle */}
      {safeDeliverables.length > 0 && (
        <div className="flex items-center justify-end mb-3">
          <div className="flex items-center rounded-lg border border-gray-200 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === "board"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {safeDeliverables.length > 0 && viewMode === "list" && (
        <div className="space-y-2">
          {safeDeliverables.map((d) => (
            <DeliverableRow
              key={d.id}
              deliverable={d}
              onOpenInStudio={() => onOpenInStudio?.(d.id)}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {safeDeliverables.length > 0 && viewMode === "board" && (
        <DeliverablesBoardView
          deliverables={safeDeliverables}
          campaignId={campaignId}
          onOpenInStudio={onOpenInStudio}
          onStatusChange={handleStatusChange}
          isUpdating={updateDeliverable.isPending}
        />
      )}
    </div>
  );
}
