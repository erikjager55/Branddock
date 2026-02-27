"use client";

import React from "react";
import * as LucideIcons from "lucide-react";
import { Pencil, Save, X, HelpCircle } from "lucide-react";
import { Button } from "@/components/shared";
import { VersionPill } from "@/components/versioning/VersionPill";
import { LockShield, LockStatusPill } from "@/components/lock";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BrandAssetDetail } from "../types/brand-asset-detail.types";
import type { UseLockStateReturn } from "@/hooks/useLockState";

// Category gradients — matches BrandAssetCard overview
const CATEGORY_GRADIENTS: Record<string, string> = {
  PURPOSE: 'from-green-500 to-emerald-600',
  FOUNDATION: 'from-[#1FD1B2] to-emerald-500',
  STRATEGY: 'from-blue-500 to-indigo-600',
  COMMUNICATION: 'from-purple-500 to-pink-600',
  PERSONALITY: 'from-orange-500 to-amber-600',
  CORE: 'from-[#1FD1B2] to-emerald-500',
  NARRATIVE: 'from-red-500 to-pink-600',
  CULTURE: 'from-yellow-500 to-orange-500',
};

// Category icons — Lucide icon names, matches BrandAssetCard overview
const CATEGORY_ICONS: Record<string, string> = {
  PURPOSE: 'Globe',
  FOUNDATION: 'Building2',
  STRATEGY: 'Target',
  COMMUNICATION: 'MessageSquare',
  PERSONALITY: 'Heart',
  CORE: 'Shield',
  NARRATIVE: 'BookOpen',
  CULTURE: 'Users',
};

const CATEGORY_LABELS: Record<string, string> = {
  PURPOSE: 'Purpose',
  FOUNDATION: 'Foundation',
  STRATEGY: 'Strategy',
  COMMUNICATION: 'Communication',
  PERSONALITY: 'Personality',
  CORE: 'Core',
  NARRATIVE: 'Narrative',
  CULTURE: 'Culture',
};

function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || LucideIcons.FileText;
}

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
  const gradient = CATEGORY_GRADIENTS[asset.category] ?? 'from-gray-500 to-gray-600';
  const iconName = CATEGORY_ICONS[asset.category] ?? 'FileText';
  const CategoryIcon = getIcon(iconName);
  const categoryLabel = CATEGORY_LABELS[asset.category] ?? asset.category;

  return (
    <div data-testid="asset-detail-header" className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-6">
        {/* Asset Icon — 96×96, Lucide icon with category gradient */}
        <div className="flex-shrink-0">
          <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
            <CategoryIcon className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Title + Lock badge */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
            <LockStatusPill
              isLocked={lockState.isLocked}
              lockedBy={lockState.lockedBy}
              lockedAt={lockState.lockedAt}
            />
          </div>

          {/* Description */}
          {asset.description && (
            <p className="text-base text-gray-500 mt-0.5">{asset.description}</p>
          )}

          {/* Metadata bar */}
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
            <span>{asset.completedMethods}/{asset.totalMethods} methods completed</span>
            <span className="text-teal-600 font-medium">{Math.round(asset.validationPercentage)}% Validated</span>
            <VersionPill
              resourceType="BRAND_ASSET"
              resourceId={asset.id}
              onRestore={onVersionRestore}
            />
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200">
                  <HelpCircle className="h-3 w-3" />
                  What is {asset.name}?
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm" align="start">
                <div className="space-y-2">
                  <p className="font-semibold">What is {asset.name}?</p>
                  <p className="text-gray-500 leading-relaxed">
                    {asset.description || `${asset.name} is a ${categoryLabel.toLowerCase()} brand asset that defines a key element of your brand identity.`}
                  </p>
                  <div className="pt-2 border-t border-gray-200 space-y-1.5 text-xs text-gray-500">
                    <p><span className="font-medium text-gray-900">Category:</span> {categoryLabel}</p>
                    <p><span className="font-medium text-gray-900">Validation:</span> {Math.round(asset.validationPercentage)}% validated through research methods</p>
                    <p><span className="font-medium text-gray-900">Version Controlled:</span> Full history of changes with lock/unlock protection</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Action buttons — Edit + LockShield only */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isEditing ? (
            <>
              <button
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
              variant="secondary"
              size="sm"
              icon={Pencil}
              onClick={onEditToggle}
              disabled={!lockState.canEdit}
            >
              Edit
            </Button>
          )}

          <LockShield
            isLocked={lockState.isLocked}
            isToggling={lockState.isToggling}
            onClick={lockState.requestToggle}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
