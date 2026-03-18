"use client";

import React from "react";
import { DeliverableRow } from "./DeliverableRow";
import type { DeliverableResponse } from "@/types/campaign";

interface DeliverablesTabProps {
  deliverables: DeliverableResponse[];
  onOpenInStudio?: (deliverableId: string) => void;
}

export function DeliverablesTab({ deliverables, onOpenInStudio }: DeliverablesTabProps) {
  const safeDeliverables = Array.isArray(deliverables) ? deliverables : [];

  return (
    <div data-testid="deliverables-tab">
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
