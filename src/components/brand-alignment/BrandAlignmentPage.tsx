import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CircleDot,
  RefreshCw,
  Loader2,
  XCircle,
  Download,
  FileText,
  FileJson,
  ShieldCheck,
  ClipboardCheck,
  FileSearch,
  BarChart3,
  Brain,
} from 'lucide-react';
import {
  EmptyState,
  Button,
} from '@/components/shared';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { useFormat, type UiFormatters } from '@/lib/ui-i18n/format';
import {
  useBrandAlignment,
  useAlignmentModules,
  useAlignmentIssues,
  useStartAlignmentScan,
  useDismissIssue,
} from '@/contexts/BrandAlignmentContext';
import { useBrandAlignmentStore } from '@/stores/useBrandAlignmentStore';
import type { AlignmentTab } from '@/stores/useBrandAlignmentStore';
import { useUIState } from '@/contexts/UIStateContext';
import type { AlignmentIssueListParams } from '@/types/brand-alignment';
import { exportAlignmentPdf } from '@/features/brand-alignment/utils/exportAlignmentPdf';
import { exportAlignmentJson } from '@/features/brand-alignment/utils/exportAlignmentJson';

import { AlignmentScoreGauge } from './AlignmentScoreGauge';
import { AlignmentStatsRow } from './AlignmentStatsRow';
import { ModuleAlignmentGrid } from './ModuleAlignmentGrid';
import { AlignmentIssuesSection } from './AlignmentIssuesSection';
import { AnalyzingScanModal } from './AnalyzingScanModal';
import { ScanCompleteModal } from './ScanCompleteModal';
import { FixIssueModal } from './FixIssueModal';
import { BrandAuditView } from './BrandAuditView';
// TODO future: lazy-load via `next/dynamic` (zoals BriefRenderView in
// ContentLibraryCampaignMode) — ContentReviewTab is hidden by default
// en zou met code-split de Alignment/Audit tab-bundle 10-20KB lichter
// maken. Niet kritisch, defer tot bundle-trim pass.
import { ContentReviewTab } from './ContentReviewTab';
import { InsightsTab } from './InsightsTab';
import { VoiceBaseline1Pager } from '@/features/brand-alignment/components/VoiceBaseline1Pager';
import { BrandclawObservationsTab } from '@/features/brand-alignment/components/BrandclawObservationsTab';

// ─── Relative time helper ───────────────────────────────────

function formatLastScan(dateStr: string, formatDate: UiFormatters['formatDate']): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Less than an hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Main component ─────────────────────────────────────────

export function BrandAlignmentPage() {
  const { t } = useTranslation('brand-alignment');
  const { formatDate } = useFormat();
  const { setActiveSection } = useUIState();

  // Context hooks — server data
  const { overview, isLoading: isOverviewLoading, error: overviewError } = useBrandAlignment();
  const { data: modulesData, isLoading: isModulesLoading } = useAlignmentModules();

  // Store — UI state
  const activeTab = useBrandAlignmentStore((s) => s.activeTab);
  const setActiveTab = useBrandAlignmentStore((s) => s.setActiveTab);
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
    ? formatLastScan(scan.completedAt, formatDate)
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

  function handleExportPdf() {
    if (!scan) return;
    exportAlignmentPdf({ scan, modules, issues });
  }

  function handleExportJson() {
    if (!scan) return;
    exportAlignmentJson({ scan, modules, issues });
  }

  // ─── Loading state ──────────────────────────────────────

  if (isOverviewLoading) {
    return (
      <PageShell>
        <div data-testid="skeleton-loader" className="flex items-center justify-center py-32 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{t('page.loading')}</span>
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
          <p className="text-sm text-gray-500">{t('page.loadError')}</p>
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
        title={t('page.title')}
        subtitle={t('page.subtitle')}
        actions={
          activeTab === 'alignment' ? (
            <div className="flex items-center gap-2">
              {hasScan && (
                <>
                  <Button variant="secondary" onClick={handleExportPdf} className="gap-2">
                    <FileText className="h-4 w-4" />
                    {t('page.exportPdf')}
                  </Button>
                  <Button variant="secondary" onClick={handleExportJson} className="gap-2">
                    <FileJson className="h-4 w-4" />
                    {t('page.exportJson')}
                  </Button>
                </>
              )}
              <Button
                onClick={handleStartScan}
                disabled={startScan.isPending || isScanning}
                isLoading={startScan.isPending}
                className="gap-2"
              >
                {!startScan.isPending && <RefreshCw className="h-4 w-4" />}
                {startScan.isPending ? t('page.scanning') : t('page.runCheck')}
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* ── Δ-3 Voice Baseline 1-pager (read-only header, alle tabs) ── */}
      <VoiceBaseline1Pager />

      {/* ── Tab switcher ─────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-6">
        {([
          { key: 'alignment' as AlignmentTab, label: t('tabs.alignment'), icon: ShieldCheck },
          { key: 'audit' as AlignmentTab, label: t('tabs.audit'), icon: ClipboardCheck },
          { key: 'review' as AlignmentTab, label: t('tabs.review'), icon: FileSearch },
          { key: 'insights' as AlignmentTab, label: t('tabs.insights'), icon: BarChart3 },
          { key: 'brandclaw' as AlignmentTab, label: t('tabs.brandclaw'), icon: Brain },
        ]).map((tab) => {
          const isActive = activeTab === tab.key;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Alignment tab content ────────────────────────── */}
      {activeTab === 'alignment' && (
        <>
          {/* No scan placeholder */}
          {!hasScan && (
            <EmptyState
              icon={CircleDot}
              title={t('page.noScanTitle')}
              description={t('page.noScanDescription')}
              action={{ label: t('page.startFirstScan'), onClick: handleStartScan }}
            />
          )}

          {/* Score overview + modules + issues (only with scan) */}
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
        </>
      )}

      {/* ── Audit tab content ────────────────────────────── */}
      {activeTab === 'audit' && (
        <BrandAuditView />
      )}

      {/* ── Content Review tab (Δ-1 Surface C) ───────────── */}
      {activeTab === 'review' && (
        <ContentReviewTab />
      )}

      {/* ── Insights tab — pilot-feedback dashboard ──────── */}
      {activeTab === 'insights' && (
        <InsightsTab />
      )}

      {/* ── Brandclaw Strategy Analyst tab (Phase A) ─────── */}
      {activeTab === 'brandclaw' && (
        <BrandclawObservationsTab />
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
