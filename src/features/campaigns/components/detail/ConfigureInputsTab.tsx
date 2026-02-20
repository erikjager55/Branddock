"use client";

import React from "react";
import { Plus, Database, Shield, Users, Package, TrendingUp, X } from "lucide-react";
import { Button, Badge, EmptyState } from "@/components/shared";
import type { KnowledgeAssetResponse } from "@/types/campaign";

interface ConfigureInputsTabProps {
  assets: KnowledgeAssetResponse[];
  isLoading: boolean;
  onAddAssets: () => void;
  onRemoveAsset: (assetId: string) => void;
}

const ASSET_TYPE_ICONS: Record<string, typeof Shield> = {
  Brand: Shield,
  Persona: Users,
  Product: Package,
  Trend: TrendingUp,
  MarketInsight: TrendingUp,
};

export function ConfigureInputsTab({ assets, isLoading, onAddAssets, onRemoveAsset }: ConfigureInputsTabProps) {
  const safeAssets = Array.isArray(assets) ? assets : [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Knowledge Assets</h3>
          <p className="text-sm text-gray-500">Source quality affects strategic confidence score</p>
        </div>
        <Button variant="secondary" size="sm" icon={Plus} onClick={onAddAssets}>
          Add Assets
        </Button>
      </div>

      {safeAssets.length > 0 ? (
        <div className="space-y-2">
          {safeAssets.map((asset) => {
            const Icon = ASSET_TYPE_ICONS[asset.assetType] || Database;
            const isValidated = asset.validationStatus === "Validated";

            return (
              <div
                key={asset.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    isValidated ? "bg-green-100" : "bg-gray-100"
                  }`}>
                    <Icon className={`h-5 w-5 ${isValidated ? "text-green-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{asset.assetName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{asset.assetType}</span>
                      {isValidated && <Badge variant="success">Validated</Badge>}
                      {asset.isAutoSelected && <Badge variant="default">Auto</Badge>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveAsset(asset.id)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Database}
          title="No knowledge assets"
          description="Add brand assets, personas, or products to power your campaign strategy."
          action={{ label: "Add Assets", onClick: onAddAssets }}
        />
      )}
    </div>
  );
}
