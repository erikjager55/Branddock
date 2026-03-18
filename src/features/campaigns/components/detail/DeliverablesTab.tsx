"use client";

import React from "react";
import { ProgressBar } from "@/components/shared";
import { DeliverableRow } from "./DeliverableRow";
import type { DeliverableResponse } from "@/types/campaign";

interface DeliverablesTabProps {
  deliverables: DeliverableResponse[];
  onOpenInStudio?: (deliverableId: string) => void;
}

export function DeliverablesTab({ deliverables, onOpenInStudio }: DeliverablesTabProps) {
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
      {safeDeliverables.length > 0 && (
        <div className="space-y-2">
          {safeDeliverables.map((d) => (
            <DeliverableRow
              key={d.id}
              deliverable={d}
              onOpenInStudio={() => onOpenInStudio?.(d.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
