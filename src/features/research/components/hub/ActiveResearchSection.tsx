"use client";

import React from "react";
import { Badge, Button, EmptyState } from "@/components/shared";
import { FlaskConical } from "lucide-react";
import type { ActiveResearchItem } from "../../types/research.types";

// ─── Types ───────────────────────────────────────────────────

interface ActiveResearchSectionProps {
  items: ActiveResearchItem[] | undefined;
}

// ─── Helpers ─────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ─── Component ───────────────────────────────────────────────

export function ActiveResearchSection({ items }: ActiveResearchSectionProps) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">Active Research</h3>
        <EmptyState
          icon={FlaskConical}
          title="No active research"
          description="Start a research plan to begin validating your brand strategy."
        />
      </div>
    );
  }

  return (
    <div data-testid="active-research">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">Active Research</h3>
        <Badge variant="info">{items.length}</Badge>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">
                  {item.personaName || item.assetName}
                </span>
                <Badge variant="default">{item.method}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {formatRelativeTime(item.lastActivityAt)}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => alert('Navigate to study detail')}
                >
                  Resume
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.min(item.progress, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-500 w-10 text-right">
                {Math.round(item.progress)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
