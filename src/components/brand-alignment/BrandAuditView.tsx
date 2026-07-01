import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, Loader2, XCircle } from 'lucide-react';
import { Button, EmptyState } from '@/components/shared';
import { useBrandAudit, useStartBrandAudit } from '@/contexts/BrandAlignmentContext';
import { useUIState } from '@/contexts/UIStateContext';
import { AuditScoreOverview } from './AuditScoreOverview';
import { AuditAssetTable } from './AuditAssetTable';
import { AuditImprovementList } from './AuditImprovementList';

export function BrandAuditView() {
  const { t } = useTranslation('brand-alignment');
  const { setActiveSection, setSelectedAssetId } = useUIState();
  const { data, isLoading, error } = useBrandAudit();
  const startAudit = useStartBrandAudit();

  const audit = data?.audit ?? null;
  const hasAudit = data?.hasAudit ?? false;

  function handleStartAudit() {
    startAudit.mutate(undefined);
  }

  function handleNavigateToAsset(assetId: string) {
    setSelectedAssetId(assetId);
    setActiveSection('brand-asset-detail');
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{t('auditView.loading')}</span>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <XCircle className="w-10 h-10 text-red-300 mb-3" />
        <p className="text-sm text-gray-500">{t('auditView.loadError')}</p>
        <p className="text-xs text-gray-400 mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  // Empty state — no audit yet
  if (!hasAudit || !audit) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t('auditView.emptyTitle')}
        description={t('auditView.emptyDescription')}
        action={{
          label: startAudit.isPending ? t('auditView.analyzing') : t('auditView.runAudit'),
          onClick: handleStartAudit,
        }}
      />
    );
  }

  // Main audit view
  return (
    <div className="space-y-6">
      {/* Header with last audit date + re-run button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {t('auditView.lastAudit', { date: formatDate(audit.createdAt) })}
        </p>
        <Button
          variant="secondary"
          onClick={handleStartAudit}
          disabled={startAudit.isPending}
          isLoading={startAudit.isPending}
          className="gap-2 text-sm"
        >
          <ClipboardCheck className="h-4 w-4" />
          {startAudit.isPending ? t('auditView.analyzing') : t('auditView.rerunAudit')}
        </Button>
      </div>

      {/* Score overview + dimension cards */}
      <AuditScoreOverview
        overallScore={audit.overallScore}
        dimensions={audit.dimensions}
      />

      {/* Improvement list */}
      <AuditImprovementList
        improvements={audit.improvements}
        onNavigateToAsset={handleNavigateToAsset}
      />

      {/* Per-asset table */}
      <AuditAssetTable
        assetScores={audit.assetScores}
        onNavigateToAsset={handleNavigateToAsset}
      />
    </div>
  );
}
