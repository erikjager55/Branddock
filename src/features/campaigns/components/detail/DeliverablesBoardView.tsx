"use client";

import React, { useState, useCallback } from "react";
import { Badge, Button } from "@/components/shared";
import { ExternalLink, GripVertical } from "lucide-react";
import type { DeliverableResponse, DeliverableStatus, DeliverableBriefSettings } from "@/types/campaign";
import { getChannelColor } from "@/features/campaigns/lib/channel-colors";
import { normalizeChannel } from "@/features/campaigns/lib/channel-frequency";

interface DeliverablesBoardViewProps {
  deliverables: DeliverableResponse[];
  campaignId: string;
  onOpenInStudio?: (deliverableId: string) => void;
  onStatusChange: (deliverableId: string, newStatus: DeliverableStatus) => void;
  isUpdating: boolean;
}

const COLUMNS: { status: DeliverableStatus; label: string; headerColor: string }[] = [
  { status: "NOT_STARTED", label: "Not Started", headerColor: "bg-gray-100 text-gray-700" },
  { status: "IN_PROGRESS", label: "In Progress", headerColor: "bg-amber-50 text-amber-700" },
  { status: "COMPLETED", label: "Completed", headerColor: "bg-emerald-50 text-emerald-700" },
];

const PRIORITY_HEX: Record<string, { dot: string; label: string; bg: string; text: string; border: string }> = {
  "must-have": { dot: "#10b981", label: "Must-have", bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  "should-have": { dot: "#f59e0b", label: "Should-have", bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  "nice-to-have": { dot: "#d1d5db", label: "Nice-to-have", bg: "#f9fafb", text: "#4b5563", border: "#e5e7eb" },
};

export function DeliverablesBoardView({
  deliverables,
  campaignId,
  onOpenInStudio,
  onStatusChange,
  isUpdating,
}: DeliverablesBoardViewProps) {
  const [dragOverColumn, setDragOverColumn] = useState<DeliverableStatus | null>(null);

  const grouped = React.useMemo(() => {
    const map: Record<DeliverableStatus, DeliverableResponse[]> = {
      NOT_STARTED: [],
      IN_PROGRESS: [],
      COMPLETED: [],
    };
    for (const d of deliverables) {
      map[d.status]?.push(d);
    }
    return map;
  }, [deliverables]);

  const handleDragStart = useCallback((e: React.DragEvent, deliverable: DeliverableResponse) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ id: deliverable.id, currentStatus: deliverable.status }));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: DeliverableStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStatus: DeliverableStatus) => {
      e.preventDefault();
      setDragOverColumn(null);
      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        if (data.id && data.currentStatus !== targetStatus) {
          onStatusChange(data.id, targetStatus);
        }
      } catch {
        // invalid drag data
      }
    },
    [onStatusChange]
  );

  return (
    <div className="grid grid-cols-3 gap-4" data-testid="deliverables-board">
      {COLUMNS.map((col) => {
        const items = grouped[col.status];
        const isOver = dragOverColumn === col.status;
        return (
          <div
            key={col.status}
            className={`rounded-lg border transition-colors ${
              isOver ? "border-teal-400 bg-teal-50/30" : "border-gray-200 bg-gray-50/50"
            }`}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            {/* Column header */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${col.headerColor}`}>
              <span className="text-sm font-medium">{col.label}</span>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/60">
                {items.length}
              </span>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[120px]">
              {items.map((d) => (
                <BoardCard
                  key={d.id}
                  deliverable={d}
                  onDragStart={handleDragStart}
                  onOpenInStudio={onOpenInStudio}
                  isUpdating={isUpdating}
                />
              ))}
              {items.length === 0 && (
                <div className="flex items-center justify-center h-20 text-xs text-gray-400">
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardCard({
  deliverable,
  onDragStart,
  onOpenInStudio,
  isUpdating,
}: {
  deliverable: DeliverableResponse;
  onDragStart: (e: React.DragEvent, d: DeliverableResponse) => void;
  onOpenInStudio?: (id: string) => void;
  isUpdating: boolean;
}) {
  const settings = deliverable.settings as DeliverableBriefSettings | null;

  return (
    <div
      draggable={!isUpdating}
      onDragStart={(e) => onDragStart(e, deliverable)}
      className="bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:border-gray-300 transition-colors shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          <p className="text-sm font-medium text-gray-900 truncate">{deliverable.title}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={ExternalLink}
          onClick={(e) => { e.stopPropagation(); onOpenInStudio?.(deliverable.id); }}
          className="shrink-0 !p-1"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <span className="text-xs text-gray-500">{deliverable.contentType}</span>

        {settings?.channel && (() => {
          const chColor = getChannelColor(normalizeChannel(settings.channel));
          return (
            <span
              className="text-xs px-1.5 py-0.5 rounded border font-medium"
              style={{ backgroundColor: chColor.hex + "14", color: chColor.hex, borderColor: chColor.hex + "33" }}
            >
              {settings.channel}
            </span>
          );
        })()}

        {settings?.productionPriority && (() => {
          const p = PRIORITY_HEX[settings.productionPriority];
          return p ? (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium"
              style={{ backgroundColor: p.bg, color: p.text, borderColor: p.border }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.dot }} />
              {p.label}
            </span>
          ) : null;
        })()}

        {deliverable.qualityScore != null && (
          <span className="text-xs font-medium text-gray-500">
            {deliverable.qualityScore.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}
