"use client";

import React from "react";
import { Sparkles, Shield, Users, Package, TrendingUp, Database } from "lucide-react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import type { KnowledgeAssetResponse } from "@/types/campaign";

interface KnowledgeContextPanelProps {
  assets: KnowledgeAssetResponse[];
  confidence: number | null;
}

const ASSET_TYPE_ICONS: Record<string, typeof Shield> = {
  Brand: Shield,
  Persona: Users,
  Product: Package,
  Trend: TrendingUp,
  DetectedTrend: TrendingUp,
};

export function KnowledgeContextPanel({ assets, confidence }: KnowledgeContextPanelProps) {
  const campaignBlueprint = useContentStudioStore((s) => s.campaignBlueprint);
  const campaignName = useContentStudioStore((s) => s.campaignName);
  const safeAssets = Array.isArray(assets) ? assets : [];

  if (safeAssets.length === 0) {
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Knowledge Context
        </label>
        <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center">
          <Database className="h-5 w-5 text-gray-300 mx-auto mb-1" />
          <p className="text-xs text-gray-400">No knowledge assets linked</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-gray-900">
          Knowledge Context
        </label>
        {confidence != null && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            {Math.round(confidence)}%
          </span>
        )}
      </div>
      {/* Campaign context indicator */}
      {campaignBlueprint && (
        <div className="mb-2 px-2.5 py-1.5 rounded-md bg-primary-50 border border-primary-100">
          <p className="text-xs font-medium text-primary-700">
            Campaign: {campaignName}
          </p>
          <p className="text-[10px] text-primary mt-0.5">
            Strategy context will be injected into AI generation
          </p>
        </div>
      )}
      <div className="space-y-1.5">
        {safeAssets.slice(0, 5).map((asset) => {
          const Icon = ASSET_TYPE_ICONS[asset.assetType] || Database;
          const isValidated = asset.validationStatus === "Validated";
          return (
            <div
              key={asset.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-gray-50"
            >
              <Icon className={`h-3.5 w-3.5 ${isValidated ? "text-green-500" : "text-gray-400"}`} />
              <span className="text-xs text-gray-700 truncate flex-1">
                {asset.assetName}
              </span>
              {isValidated && (
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
              )}
            </div>
          );
        })}
        {safeAssets.length > 5 && (
          <p className="text-xs text-gray-400 px-2.5">
            +{safeAssets.length - 5} more assets
          </p>
        )}
      </div>
    </div>
  );
}
