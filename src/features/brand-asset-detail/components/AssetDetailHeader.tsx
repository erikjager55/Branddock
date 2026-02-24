"use client";

import { ArrowLeft } from "lucide-react";
import { Badge, Button } from "@/components/shared";
import { AssetOverflowMenu } from "./AssetOverflowMenu";
import { VersionPill } from "@/components/versioning/VersionPill";
import type { BrandAssetDetail } from "../types/brand-asset-detail.types";
import { useUpdateStatus } from "../hooks/useBrandAssetDetail";
import { LockShield, LockStatusPill } from "@/components/lock";
import type { UseLockStateReturn } from "@/hooks/useLockState";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  NEEDS_ATTENTION: "Needs Attention",
  READY: "Ready",
};

const STATUS_VARIANTS: Record<string, "default" | "warning" | "success" | "info"> = {
  DRAFT: "default",
  IN_PROGRESS: "info",
  NEEDS_ATTENTION: "warning",
  READY: "success",
};

interface AssetDetailHeaderProps {
  asset: BrandAssetDetail;
  onNavigateBack?: () => void;
  lockState: UseLockStateReturn;
  onVersionRestore?: () => void;
}

export function AssetDetailHeader({
  asset,
  onNavigateBack,
  lockState,
  onVersionRestore,
}: AssetDetailHeaderProps) {
  const updateStatus = useUpdateStatus(asset.id);

  const handleStatusChange = (status: string) => {
    updateStatus.mutate({
      status: status as "DRAFT" | "IN_PROGRESS" | "NEEDS_ATTENTION" | "READY",
    });
  };

  return (
    <div className="space-y-3">
      <button
        onClick={onNavigateBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Your Brand
      </button>

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
            <LockShield
              isLocked={lockState.isLocked}
              isToggling={lockState.isToggling}
              onClick={lockState.requestToggle}
              size="sm"
            />
            <Badge variant="teal" size="sm">
              {Math.round(asset.validationPercentage)}% Validated
            </Badge>
            <VersionPill
              resourceType="BRAND_ASSET"
              resourceId={asset.id}
              onRestore={onVersionRestore}
            />
          </div>
          <LockStatusPill
            isLocked={lockState.isLocked}
            lockedBy={lockState.lockedBy}
            lockedAt={lockState.lockedAt}
          />
          <p className="text-gray-500">{asset.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={asset.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={lockState.isLocked}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <Badge variant={STATUS_VARIANTS[asset.status] ?? "default"}>
            {STATUS_LABELS[asset.status] ?? asset.status}
          </Badge>

          <AssetOverflowMenu
            asset={asset}
            onToggleLock={lockState.requestToggle}
            isLocked={lockState.isLocked}
          />
        </div>
      </div>
    </div>
  );
}
