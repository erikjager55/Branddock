"use client";

import React from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/shared";
import { SelectionCard } from "@/components/ui/layout";
import type { AvailableAsset } from "../../types/research.types";

// ─── Types ───────────────────────────────────────────────────

interface AssetSelectorGridProps {
  assets: AvailableAsset[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

// ─── Component ───────────────────────────────────────────────

export function AssetSelectorGrid({
  assets,
  selectedIds,
  onToggle,
}: AssetSelectorGridProps) {
  return (
    <div data-testid="asset-selector-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {assets.map((asset) => {
        const isSelected = selectedIds.includes(asset.id);

        return (
          <div key={asset.id} data-testid="selectable-asset">
          <SelectionCard
            title={asset.name}
            subtitle={asset.category}
            selected={isSelected}
            onSelect={() => onToggle(asset.id)}
            selectionMode="checkbox"
            badges={
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {asset.estimatedDuration}
                </span>
                {asset.isRecommended && (
                  <Badge variant="success" size="sm">Recommended</Badge>
                )}
              </div>
            }
          />
          </div>
        );
      })}
    </div>
  );
}
