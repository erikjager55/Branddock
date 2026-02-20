import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import type { AlignmentIssueData } from '@/types/brand-alignment';
import { Badge, EmptyState } from '@/components/shared';
import { Skeleton } from '@/components/shared';
import { TYPOGRAPHY } from '@/lib/constants/design-tokens';
import { useBrandAlignmentStore } from '@/stores/useBrandAlignmentStore';
import { IssueFilters } from './IssueFilters';
import { IssueCard } from './IssueCard';

// ─── Types ──────────────────────────────────────────────────

interface AlignmentIssuesSectionProps {
  issues: AlignmentIssueData[];
  isLoading: boolean;
  openIssuesCount: number;
  onDismiss: (id: string) => void;
  onFix: (id: string) => void;
  isDismissing: boolean;
  onNavigate?: (section: string) => void;
}

// ─── Component ──────────────────────────────────────────────

export function AlignmentIssuesSection({
  issues,
  isLoading,
  openIssuesCount,
  onDismiss,
  onFix,
  isDismissing,
  onNavigate,
}: AlignmentIssuesSectionProps) {
  const severityFilter = useBrandAlignmentStore((s) => s.severityFilter);
  const statusFilter = useBrandAlignmentStore((s) => s.statusFilter);
  const moduleFilter = useBrandAlignmentStore((s) => s.moduleFilter);
  const resetFilters = useBrandAlignmentStore((s) => s.resetFilters);

  const hasFilters =
    severityFilter !== null || statusFilter !== null || moduleFilter !== null;

  return (
    <div data-testid="alignment-issues-section">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <h2 className={TYPOGRAPHY.sectionHeading}>Alignment Issues</h2>
        {openIssuesCount > 0 && (
          <Badge variant="danger" size="sm">
            {openIssuesCount} items need review
          </Badge>
        )}
      </div>

      {/* Filters */}
      <IssueFilters />

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="rounded-lg" height={180} width="100%" />
          ))}
        </div>
      ) : issues.length === 0 ? (
        /* Empty state */
        <EmptyState
          icon={CheckCircle}
          title={hasFilters ? 'No issues match filters' : 'No issues found'}
          description={
            hasFilters
              ? 'Try adjusting your filters to see more issues.'
              : 'Your brand assets are fully aligned!'
          }
          action={
            hasFilters
              ? { label: 'Reset Filters', onClick: resetFilters, variant: 'secondary' }
              : undefined
          }
        />
      ) : (
        /* Issues list */
        <div className="space-y-4">
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onDismiss={onDismiss}
              onFix={onFix}
              isDismissing={isDismissing}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
