import React from 'react';
import {
  CircleDot,
  RefreshCw,
  Loader2,
  XCircle,
} from 'lucide-react';
import {
  EmptyState,
  Button,
} from '@/components/shared';
import { PageShell, PageHeader } from '@/components/ui/layout';
import {
  useBrandAlignment,
  useAlignmentModules,
  useAlignmentIssues,
  useStartAlignmentScan,
  useDismissIssue,
} from '@/contexts/BrandAlignmentContext';
import { useBrandAlignmentStore } from '@/stores/useBrandAlignmentStore';
import { useUIState } from '@/contexts/UIStateContext';
import type { AlignmentIssueListParams } from '@/types/brand-alignment';

import { AlignmentScoreGauge } from './AlignmentScoreGauge';
import { AlignmentStatsRow } from './AlignmentStatsRow';
import { ModuleAlignmentGrid } from './ModuleAlignmentGrid';
import { AlignmentIssuesSection } from './AlignmentIssuesSection';
import { AnalyzingScanModal } from './AnalyzingScanModal';
import { ScanCompleteModal } from './ScanCompleteModal';
import { FixIssueModal } from './FixIssueModal';

// ─── Relative time helper ───────────────────────────────────

function formatLastScan(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Less than an hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Main component ─────────────────────────────────────────

export function BrandAlignmentPage() {
  const { setActiveSection } = useUIState();

  // Context hooks — server data
  const { overview, isLoading: isOverviewLoading, error: overviewError } = useBrandAlignment();
  const { data: modulesData, isLoading: isModulesLoading } = useAlignmentModules();

  // Store — UI state
  const severityFilter = useBrandAlignmentStore((s) => s.severityFilter);
  const statusFilter = useBrandAlignmentStore((s) => s.statusFilter);
  const moduleFilter = useBrandAlignmentStore((s) => s.moduleFilter);
  const isScanning = useBrandAlignmentStore((s) => s.isScanning);
  const setIsScanning = useBrandAlignmentStore((s) => s.setIsScanning);
  const setActiveScanId = useBrandAlignmentStore((s) => s.setActiveScanId);
  const openFixModal = useBrandAlignmentStore((s) => s.openFixModal);

  // Build issue filter params
  const issueParams: AlignmentIssueListParams = {};
  if (severityFilter) issueParams.severity = severityFilter;
  if (statusFilter) issueParams.status = statusFilter;
  if (moduleFilter) issueParams.module = moduleFilter;

  const { data: issuesData, isLoading: isIssuesLoading } = useAlignmentIssues(issueParams);

  // Mutations
  const startScan = useStartAlignmentScan();
  const dismissIssue = useDismissIssue();

  // Derived state
  const scan = overview?.scan;
  const overallScore = scan?.score ?? 0;
  const modules = modulesData?.modules ?? overview?.modules ?? [];
  const issues = issuesData?.issues ?? [];
  const openIssuesCount = overview?.openIssuesCount ?? 0;
  const hasScan = overview?.hasScan ?? false;

  const lastScanned = scan?.completedAt
    ? formatLastScan(scan.completedAt)
    : null;

  // Handlers
  function handleStartScan() {
    startScan.mutate(undefined, {
      onSuccess: (data) => {
        setActiveScanId(data.scanId);
        setIsScanning(true);
      },
    });
  }

  function handleDismiss(id: string) {
    dismissIssue.mutate({ id });
  }

  function handleOpenFix(issueId: string) {
    openFixModal(issueId);
  }

  function handleNavigate(section: string) {
    setActiveSection(section);
  }

  // ─── Loading state ──────────────────────────────────────

  if (isOverviewLoading) {
    return (
      <PageShell>
        <div data-testid="skeleton-loader" className="flex items-center justify-center py-32 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading alignment data...</span>
        </div>
      </PageShell>
    );
  }

  // ─── Error state ────────────────────────────────────────

  if (overviewError) {
    return (
      <PageShell>
        <div data-testid="error-message" className="flex flex-col items-center justify-center py-32 text-center">
          <XCircle className="w-10 h-10 text-red-300 mb-3" />
          <p className="text-sm text-gray-500">Failed to load alignment data</p>
          <p className="text-xs text-gray-400 mt-1">{overviewError.message}</p>
        </div>
      </PageShell>
    );
  }

  // ─── Render ─────────────────────────────────────────────

  return (
    <PageShell>
      <PageHeader
        moduleKey="brand-alignment"
        title="Brand Alignment"
        subtitle="Ensure consistency across all brand touchpoints"
        actions={
          <Button
            onClick={handleStartScan}
            disabled={startScan.isPending || isScanning}
            isLoading={startScan.isPending}
            className="gap-2"
          >
            {!startScan.isPending && <RefreshCw className="h-4 w-4" />}
            {startScan.isPending ? 'Scanning...' : 'Run Alignment Check'}
          </Button>
        }
      />

      {/* ── No scan placeholder ──────────────────────────── */}
      {!hasScan && (
        <EmptyState
          icon={CircleDot}
          title="No alignment scan yet"
          description="Run your first scan to check consistency across all brand modules and identify misalignments."
          action={{ label: 'Start First Scan', onClick: handleStartScan }}
        />
      )}

      {/* ── Score overview + modules + issues (only with scan) */}
      {hasScan && (
        <div data-testid="brand-alignment-page">
          {/* Score overview */}
          <div data-testid="score-overview" className="bg-white border border-gray-200 rounded-lg p-6 mb-6 flex flex-col md:flex-row items-center gap-6">
            <AlignmentScoreGauge score={overallScore} />
            <div className="flex-1 w-full">
              <AlignmentStatsRow
                alignedCount={scan?.alignedCount ?? 0}
                reviewCount={scan?.reviewCount ?? 0}
                misalignedCount={scan?.misalignedCount ?? 0}
              />
            </div>
          </div>

          {/* Module scores grid */}
          <ModuleAlignmentGrid
            modules={modules}
            isLoading={isModulesLoading}
            onNavigate={handleNavigate}
          />

          {/* Issues section */}
          <AlignmentIssuesSection
            issues={issues}
            isLoading={isIssuesLoading}
            openIssuesCount={openIssuesCount}
            onDismiss={handleDismiss}
            onFix={handleOpenFix}
            isDismissing={dismissIssue.isPending}
            onNavigate={handleNavigate}
          />
        </div>
      )}

      {/* ── Scan Progress Modal ──────────────────────────── */}
      <AnalyzingScanModal />

      {/* ── Scan Complete Modal ──────────────────────────── */}
      <ScanCompleteModal />

      {/* ── Fix Issue Modal ──────────────────────────────── */}
      <FixIssueModal />
    </PageShell>
  );
}

export default BrandAlignmentPage;
