"use client";

import React from "react";
import { Badge, Button } from "@/components/shared";
import { ExternalLink } from "lucide-react";
import type { DeliverableResponse, DeliverableStatus, DeliverableBriefSettings } from "@/types/campaign";

interface DeliverableRowProps {
  deliverable: DeliverableResponse;
  onOpenInStudio?: () => void;
}

const STATUS_CONFIG: Record<DeliverableStatus, { label: string; variant: "success" | "warning" | "default" }> = {
  COMPLETED: { label: "Completed", variant: "success" },
  IN_PROGRESS: { label: "In Progress", variant: "warning" },
  NOT_STARTED: { label: "Not Started", variant: "default" },
};

const PRIORITY_COLORS: Record<string, string> = {
  'must-have': 'bg-emerald-500',
  'should-have': 'bg-amber-400',
  'nice-to-have': 'bg-gray-300',
};

const EFFORT_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Med',
  high: 'High',
};

export function DeliverableRow({ deliverable, onOpenInStudio }: DeliverableRowProps) {
  const statusConfig = STATUS_CONFIG[deliverable.status];
  const settings = deliverable.settings as DeliverableBriefSettings | null;

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{deliverable.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">{deliverable.contentType}</span>
            {settings?.channel && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {settings.channel}
              </span>
            )}
          </div>
        </div>
        {settings?.productionPriority && (
          <span
            className={`inline-block w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[settings.productionPriority] ?? 'bg-gray-300'}`}
            title={`Priority: ${settings.productionPriority}`}
          />
        )}
        {settings?.estimatedEffort && (
          <span className="text-xs text-gray-400 shrink-0">
            {EFFORT_LABELS[settings.estimatedEffort] ?? settings.estimatedEffort}
          </span>
        )}
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
