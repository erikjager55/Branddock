"use client";

import React from "react";
import { Plus, FileText } from "lucide-react";
import { Button, EmptyState, ProgressBar } from "@/components/shared";
import { DeliverableRow } from "./DeliverableRow";
import type { DeliverableResponse } from "@/types/campaign";

interface DeliverablesTabProps {
  deliverables: DeliverableResponse[];
  onAddDeliverable: () => void;
  onOpenInStudio?: (deliverableId: string) => void;
}

export function DeliverablesTab({ deliverables, onAddDeliverable, onOpenInStudio }: DeliverablesTabProps) {
  const safeDeliverables = Array.isArray(deliverables) ? deliverables : [];
  const completed = safeDeliverables.filter((d) => d.status === "COMPLETED").length;
  const total = safeDeliverables.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div data-testid="deliverables-tab">
      {/* Progress Header */}
      {total > 0 && (
        <div data-testid="deliverables-progress" className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {completed}/{total} completed
            </span>
            <span className="text-sm font-medium text-gray-500">{progress}%</span>
          </div>
          <ProgressBar value={progress} color="emerald" />
        </div>
      )}

      {/* Deliverable List */}
      {safeDeliverables.length > 0 ? (
        <div className="space-y-2">
          {safeDeliverables.map((d) => (
            <DeliverableRow
              key={d.id}
              deliverable={d}
              onOpenInStudio={() => onOpenInStudio?.(d.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No deliverables yet"
          description="Add deliverables to track your campaign content."
          action={{ label: "Add Deliverable", onClick: onAddDeliverable }}
        />
      )}

      {/* Add Button */}
      {deliverables.length > 0 && (
        <div className="mt-4">
          <Button data-testid="add-deliverable-button" variant="secondary" icon={Plus} onClick={onAddDeliverable} fullWidth>
            Add Deliverable
          </Button>
        </div>
      )}
    </div>
  );
}
