"use client";

import React from "react";
import { Badge, Button } from "@/components/shared";
import { ExternalLink } from "lucide-react";
import type { DeliverableResponse, DeliverableStatus, DeliverableBriefSettings } from "@/types/campaign";
import { getChannelColor } from "@/features/campaigns/lib/channel-colors";
import { normalizeChannel } from "@/features/campaigns/lib/channel-frequency";

interface DeliverableRowProps {
  deliverable: DeliverableResponse;
  onOpenInStudio?: () => void;
}

const STATUS_CONFIG: Record<DeliverableStatus, { label: string; variant: "success" | "warning" | "default" }> = {
  COMPLETED: { label: "Completed", variant: "success" },
  IN_PROGRESS: { label: "In Progress", variant: "warning" },
  NOT_STARTED: { label: "Not Started", variant: "default" },
};

const PRIORITY_HEX: Record<string, { dot: string; label: string; bg: string; text: string; border: string }> = {
  'must-have': { dot: '#10b981', label: 'Must-have', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  'should-have': { dot: '#f59e0b', label: 'Should-have', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  'nice-to-have': { dot: '#d1d5db', label: 'Nice-to-have', bg: '#f9fafb', text: '#4b5563', border: '#e5e7eb' },
};

const EFFORT_HEX: Record<string, { label: string; bg: string; text: string; border: string }> = {
  low: { label: 'Low', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  medium: { label: 'Med', bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  high: { label: 'High', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
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
            {settings?.channel && (() => {
              const chColor = getChannelColor(normalizeChannel(settings.channel));
              return (
                <span
                  className="text-xs px-1.5 py-0.5 rounded border font-medium"
                  style={{ backgroundColor: chColor.hex + '14', color: chColor.hex, borderColor: chColor.hex + '33' }}
                >
                  {settings.channel}
                </span>
              );
            })()}
          </div>
        </div>
        {settings?.productionPriority && (() => {
          const p = PRIORITY_HEX[settings.productionPriority];
          return (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium shrink-0"
              style={p
                ? { backgroundColor: p.bg, color: p.text, borderColor: p.border }
                : { backgroundColor: '#f9fafb', color: '#4b5563', borderColor: '#e5e7eb' }
              }
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p?.dot ?? '#d1d5db' }} />
              {p?.label ?? settings.productionPriority}
            </span>
          );
        })()}
        {settings?.estimatedEffort && (() => {
          const e = EFFORT_HEX[settings.estimatedEffort];
          return (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-medium shrink-0"
              style={e
                ? { backgroundColor: e.bg, color: e.text, borderColor: e.border }
                : { backgroundColor: '#f9fafb', color: '#4b5563', borderColor: '#e5e7eb' }
              }
            >
              {e?.label ?? settings.estimatedEffort}
            </span>
          );
        })()}
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
