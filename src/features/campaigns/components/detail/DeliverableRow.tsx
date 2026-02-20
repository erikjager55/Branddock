"use client";

import React from "react";
import { Badge, Button } from "@/components/shared";
import { ExternalLink } from "lucide-react";
import type { DeliverableResponse, DeliverableStatus } from "@/types/campaign";

interface DeliverableRowProps {
  deliverable: DeliverableResponse;
  onOpenInStudio?: () => void;
}

const STATUS_CONFIG: Record<DeliverableStatus, { label: string; variant: "success" | "warning" | "default" }> = {
  COMPLETED: { label: "Completed", variant: "success" },
  IN_PROGRESS: { label: "In Progress", variant: "warning" },
  NOT_STARTED: { label: "Not Started", variant: "default" },
};

export function DeliverableRow({ deliverable, onOpenInStudio }: DeliverableRowProps) {
  const statusConfig = STATUS_CONFIG[deliverable.status];

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{deliverable.title}</p>
          <p className="text-xs text-gray-500">{deliverable.contentType}</p>
        </div>
        {deliverable.assignedTo && (
          <span className="text-xs text-gray-400">
            Assigned: {deliverable.assignedTo}
          </span>
        )}
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        {deliverable.qualityScore != null && (
          <span className="text-xs font-medium text-gray-500">
            {deliverable.qualityScore.toFixed(0)}%
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        icon={ExternalLink}
        onClick={(e) => { e.stopPropagation(); onOpenInStudio?.(); }}
      >
        Open in Studio
      </Button>
    </div>
  );
}
