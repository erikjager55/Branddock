"use client";

import { Pencil, Save, X, HelpCircle } from "lucide-react";
import { Button } from "@/components/shared";
import { AssetOverflowMenu } from "./AssetOverflowMenu";
import { VersionPill } from "@/components/versioning/VersionPill";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

interface AssetDetailHeaderProps {
  asset: BrandAssetDetail;
  lockState: UseLockStateReturn;
  isEditing: boolean;
  onEditToggle: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onVersionRestore?: () => void;
}

export function AssetDetailHeader({
  asset,
  lockState,
  isEditing,
  onEditToggle,
  onSave,
  onCancelEdit,
  onVersionRestore,
}: AssetDetailHeaderProps) {
  const updateStatus = useUpdateStatus(asset.id);

  const completedMethods = (asset.researchMethods ?? []).filter(
    (m) => m.status === "COMPLETED" || m.status === "VALIDATED",
  ).length;
  const totalMethods = (asset.researchMethods ?? []).length;

  const handleStatusChange = (status: string) => {
    updateStatus.mutate({
      status: status as "DRAFT" | "IN_PROGRESS" | "NEEDS_ATTENTION" | "READY",
    });
  };

  return (
    <div data-testid="brand-asset-detail-header" className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-6">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
                <LockStatusPill
                  isLocked={lockState.isLocked}
                  lockedBy={lockState.lockedBy}
                  lockedAt={lockState.lockedAt}
                />
              </div>
              {asset.description && (
                <p className="text-base text-gray-500 mt-0.5">{asset.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3">
                {/* Status dropdown */}
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
                <span className="text-xs text-gray-500">
                  {completedMethods}/{totalMethods} methods completed
                </span>
                <VersionPill
                  resourceType="BRAND_ASSET"
                  resourceId={asset.id}
                  onRestore={onVersionRestore}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200">
                      <HelpCircle className="h-3 w-3" />
                      What are Brand Assets?
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm" align="start">
                    <div className="space-y-2">
                      <p className="font-semibold">What are Brand Assets?</p>
                      <p className="text-gray-500 leading-relaxed">
                        Brand assets are the strategic building blocks of your brand identity. They define what your brand stands for, how it communicates, and what makes it unique.
                      </p>
                      <div className="pt-2 border-t border-gray-200 space-y-1.5 text-xs text-gray-500">
                        <p><span className="font-medium text-gray-900">Strategic Foundation:</span> Core elements like purpose, values, and positioning</p>
                        <p><span className="font-medium text-gray-900">Validation-Driven:</span> Strengthen through workshops, interviews, and AI analysis</p>
                        <p><span className="font-medium text-gray-900">Living Documents:</span> Evolve as your brand strategy matures</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Edit / Save / Cancel */}
              {isEditing ? (
                <>
                  <button
                    data-testid="asset-save-button"
                    onClick={onSave}
                    style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={onCancelEdit}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </>
              ) : (
                <Button
                  data-testid="asset-edit-button"
                  variant="secondary"
                  size="sm"
                  icon={Pencil}
                  onClick={onEditToggle}
                  disabled={!lockState.canEdit}
                >
                  Edit
                </Button>
              )}

              {/* Lock Shield toggle */}
              <LockShield
                isLocked={lockState.isLocked}
                isToggling={lockState.isToggling}
                onClick={lockState.requestToggle}
                size="sm"
              />

              {/* Overflow menu */}
              <AssetOverflowMenu
                asset={asset}
                onToggleLock={lockState.requestToggle}
                isLocked={lockState.isLocked}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
