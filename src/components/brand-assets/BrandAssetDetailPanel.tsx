// =============================================================
// BrandAssetDetailPanel — slide-in modal for asset detail view
//
// Displays full asset info: status, category, description,
// validation breakdown, artifact count, framework type,
// lock status, and action buttons.
//
// Uses Modal size="xl" from shared primitives.
// Works with BrandAssetWithMeta (API/DB format).
// =============================================================

'use client';

import React from 'react';
import { Lock, Unlock, Pencil, Layers, Calendar, FileText } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { AssetStatusBadge } from './AssetStatusBadge';
import { CategoryBadge } from './CategoryBadge';
import { ValidationBreakdown } from './ValidationBreakdown';
import { cn } from '@/components/ui/utils';
import type { BrandAssetWithMeta } from '@/types/brand-asset';

// ─── Props ───────────────────────────────────────────────

export interface BrandAssetDetailPanelProps {
  asset: BrandAssetWithMeta | null;
  isOpen: boolean;
  onClose: () => void;
  /** Whether the asset is locked */
  isLocked?: boolean;
  /** Called when the edit button is clicked */
  onEdit?: (asset: BrandAssetWithMeta) => void;
  /** Called when the lock/unlock button is clicked */
  onToggleLock?: (asset: BrandAssetWithMeta) => void;
}

// ─── Helpers ─────────────────────────────────────────────

function progressColor(percentage: number): 'emerald' | 'amber' | 'red' | 'teal' {
  if (percentage >= 75) return 'emerald';
  if (percentage >= 40) return 'amber';
  if (percentage > 0) return 'red';
  return 'teal';
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

// ─── Section component ──────────────────────────────────

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────

export function BrandAssetDetailPanel({
  asset,
  isOpen,
  onClose,
  isLocked = false,
  onEdit,
  onToggleLock,
}: BrandAssetDetailPanelProps) {
  if (!asset) return null;

  const footer = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        {onToggleLock && (
          <Button
            variant="ghost"
            size="sm"
            icon={isLocked ? Unlock : Lock}
            onClick={() => onToggleLock(asset)}
          >
            {isLocked ? 'Unlock' : 'Lock'}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
        {onEdit && (
          <Button
            variant="primary"
            size="sm"
            icon={Pencil}
            onClick={() => onEdit(asset)}
            disabled={isLocked}
          >
            Edit Asset
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={asset.name}
      subtitle={`${asset.slug} — Last updated ${formatDate(asset.updatedAt)}`}
      size="xl"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Status + Category row */}
        <div className="flex items-center gap-3 flex-wrap">
          <AssetStatusBadge status={asset.status} />
          <CategoryBadge category={asset.category} size="md" />
          {isLocked && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" />
              Locked
            </span>
          )}
        </div>

        {/* Description */}
        {asset.description && (
          <Section title="Description">
            <p className="text-sm text-gray-700 leading-relaxed">
              {asset.description}
            </p>
          </Section>
        )}

        {/* Coverage */}
        <Section title="Validation Coverage">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar
                value={asset.coveragePercentage}
                color={progressColor(asset.coveragePercentage)}
                showLabel
              />
            </div>
          </div>
        </Section>

        {/* Validation Methods */}
        <Section title="Research Methods">
          <ValidationBreakdown methods={asset.validationMethods} variant="full" />
        </Section>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-gray-900 tabular-nums">
              {asset.validatedCount}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Validated</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-gray-900 tabular-nums">
              {asset.artifactCount}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Artifacts</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-gray-900 tabular-nums">
              {Math.round(asset.coveragePercentage)}%
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Coverage</div>
          </div>
        </div>

        {/* Meta info */}
        <Section title="Details">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>Updated {formatDate(asset.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>Slug: {asset.slug}</span>
            </div>
          </div>
        </Section>
      </div>
    </Modal>
  );
}
