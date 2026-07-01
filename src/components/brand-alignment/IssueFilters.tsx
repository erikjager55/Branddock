import React from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import { Select, Button } from '@/components/shared';
import { useBrandAlignmentStore } from '@/stores/useBrandAlignmentStore';
import { MODULE_CONFIG } from '@/lib/alignment/module-config';
import type { IssueSeverity, IssueStatus, AlignmentModule } from '@/types/brand-alignment';

const MODULE_OPTIONS = (Object.keys(MODULE_CONFIG) as AlignmentModule[]).map((key) => ({
  value: key,
  label: MODULE_CONFIG[key].label,
}));

// ─── Component ──────────────────────────────────────────────

export function IssueFilters() {
  const { t } = useTranslation('brand-alignment');

  const STATUS_OPTIONS = [
    { value: 'OPEN', label: t('filters.statusOpen') },
    { value: 'DISMISSED', label: t('filters.statusDismissed') },
    { value: 'FIXED', label: t('filters.statusFixed') },
  ];

  const SEVERITY_OPTIONS = [
    { value: 'CRITICAL', label: t('filters.severityCritical') },
    { value: 'WARNING', label: t('filters.severityWarning') },
    { value: 'SUGGESTION', label: t('filters.severitySuggestion') },
  ];

  const severityFilter = useBrandAlignmentStore((s) => s.severityFilter);
  const statusFilter = useBrandAlignmentStore((s) => s.statusFilter);
  const moduleFilter = useBrandAlignmentStore((s) => s.moduleFilter);
  const setSeverityFilter = useBrandAlignmentStore((s) => s.setSeverityFilter);
  const setStatusFilter = useBrandAlignmentStore((s) => s.setStatusFilter);
  const setModuleFilter = useBrandAlignmentStore((s) => s.setModuleFilter);
  const resetFilters = useBrandAlignmentStore((s) => s.resetFilters);

  const hasFilters =
    severityFilter !== null || statusFilter !== null || moduleFilter !== null;

  return (
    <div data-testid="issue-filters" className="flex items-center gap-2 mb-4 flex-wrap">
      <Select
        value={statusFilter ?? null}
        onChange={(v) => setStatusFilter(v ? (v as IssueStatus) : null)}
        options={STATUS_OPTIONS}
        placeholder={t('filters.allIssues')}
        className="w-auto"
      />

      <Select
        value={moduleFilter ?? null}
        onChange={(v) => setModuleFilter(v || null)}
        options={MODULE_OPTIONS}
        placeholder={t('filters.allModules')}
        className="w-auto"
      />

      <Select
        value={severityFilter ?? null}
        onChange={(v) => setSeverityFilter(v ? (v as IssueSeverity) : null)}
        options={SEVERITY_OPTIONS}
        placeholder={t('filters.allSeverity')}
        className="w-auto"
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetFilters}>
          {t('filters.reset')}
        </Button>
      )}
    </div>
  );
}
