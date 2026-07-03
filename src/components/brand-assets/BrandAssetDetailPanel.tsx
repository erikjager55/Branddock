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
import { useTranslation } from 'react-i18next';
import { Lock, Unlock, Pencil, Calendar, FileText } from 'lucide-react';
import { useFormat } from '@/lib/ui-i18n/format';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { AssetStatusBadge } from './AssetStatusBadge';
import { CategoryBadge } from './CategoryBadge';
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
  const { t } = useTranslation('brand-assets');
  const { formatDate } = useFormat();

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
            {isLocked ? t('detail.unlock') : t('detail.lock')}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onClose}>
          {t('detail.close')}
        </Button>
        {onEdit && (
          <Button
            variant="primary"
            size="sm"
            icon={Pencil}
            onClick={() => onEdit(asset)}
            disabled={isLocked}
          >
            {t('detail.editAsset')}
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
      subtitle={t('detail.subtitle', {
        slug: asset.slug,
        date: formatDate(asset.updatedAt, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      })}
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
              {t('detail.locked')}
            </span>
          )}
        </div>

        {/* Description */}
        {asset.description && (
          <Section title={t('detail.sectionDescription')}>
            <p className="text-sm text-gray-700 leading-relaxed">
              {asset.description}
            </p>
          </Section>
        )}

        {/* Validation Coverage + Research Methods hidden — validation % deactivated.
            Re-enable when INTERVIEWS/WORKSHOP/QUESTIONNAIRE return. */}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-gray-900 tabular-nums">
              {asset.artifactCount}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{t('detail.artifacts')}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-gray-900 tabular-nums">
              {asset.validationMethods.ai ? t('detail.yes') : t('detail.no')}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{t('detail.aiExplored')}</div>
          </div>
        </div>

        {/* Meta info */}
        <Section title={t('detail.sectionDetails')}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{t('detail.updated', {
                date: formatDate(asset.updatedAt, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }),
              })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>{t('detail.slug', { slug: asset.slug })}</span>
            </div>
          </div>
        </Section>
      </div>
    </Modal>
  );
}
