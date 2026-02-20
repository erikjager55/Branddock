import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Select, Button } from '@/components/shared';
import { useBrandAlignmentStore } from '@/stores/useBrandAlignmentStore';
import { MODULE_CONFIG } from '@/lib/alignment/module-config';
import type { IssueSeverity, IssueStatus, AlignmentModule } from '@/types/brand-alignment';

// ─── Filter option constants ────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'FIXED', label: 'Fixed' },
];

const SEVERITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'SUGGESTION', label: 'Suggestion' },
];

const MODULE_OPTIONS = (Object.keys(MODULE_CONFIG) as AlignmentModule[]).map((key) => ({
  value: key,
  label: MODULE_CONFIG[key].label,
}));

// ─── Component ──────────────────────────────────────────────

export function IssueFilters() {
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
        placeholder="All Issues"
        className="w-auto"
      />

      <Select
        value={moduleFilter ?? null}
        onChange={(v) => setModuleFilter(v || null)}
        options={MODULE_OPTIONS}
        placeholder="All Modules"
        className="w-auto"
      />

      <Select
        value={severityFilter ?? null}
        onChange={(v) => setSeverityFilter(v ? (v as IssueSeverity) : null)}
        options={SEVERITY_OPTIONS}
        placeholder="All Severity"
        className="w-auto"
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetFilters}>
          Reset
        </Button>
      )}
    </div>
  );
}
