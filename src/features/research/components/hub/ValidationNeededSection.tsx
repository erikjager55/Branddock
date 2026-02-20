"use client";

import React from "react";
import { CheckCircle, ClipboardList } from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/shared";
import type { PendingValidationItem } from "../../types/research.types";

// ─── Types ───────────────────────────────────────────────────

interface ValidationNeededSectionProps {
  items: PendingValidationItem[] | undefined;
}

// ─── Component ───────────────────────────────────────────────

export function ValidationNeededSection({ items }: ValidationNeededSectionProps) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">Validation Needed</h3>
        <EmptyState
          icon={ClipboardList}
          title="No pending validations"
          description="All your brand assets are up to date."
        />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Validation Needed</h3>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg border p-4 flex items-center justify-between"
          >
            <div>
              <span className="font-medium text-gray-900">{item.assetName}</span>
              <span className="ml-2 text-xs text-gray-500">{item.assetType}</span>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="warning">Ready For Validation</Badge>
              <Button
                variant="secondary"
                size="sm"
                icon={CheckCircle}
                onClick={() => alert('Validation flow coming soon')}
              >
                Validate
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
