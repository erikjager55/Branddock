import React from 'react';
import { ExternalLink, ArrowRight } from 'lucide-react';
import type { AlignmentIssueData } from '@/types/brand-alignment';
import { Button } from '@/components/shared';
import { IssueCard as IssueCardPrimitive } from '@/components/ui/layout';
import { getEntitySection } from '@/lib/alignment/navigation';

// ─── Severity mapping (DB uppercase → design token lowercase) ──

const SEVERITY_MAP = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  SUGGESTION: 'suggestion',
} as const;

// ─── Types ──────────────────────────────────────────────────

interface IssueCardProps {
  issue: AlignmentIssueData;
  onDismiss: (id: string) => void;
  onFix: (id: string) => void;
  isDismissing?: boolean;
  onNavigate?: (section: string) => void;
}

// ─── Component ──────────────────────────────────────────────

export function IssueCard({
  issue,
  onDismiss,
  onFix,
  isDismissing,
  onNavigate,
}: IssueCardProps) {
  const sourceRoute = getEntitySection(issue.sourceItemType);
  const severity = SEVERITY_MAP[issue.severity] ?? 'suggestion';

  return (
    <IssueCardPrimitive
      data-testid="alignment-issue-card"
      severity={severity}
      title={issue.title}
      subtitle={issue.modulePath}
      description={issue.description}
      conflictsWith={issue.conflictsWith}
      recommendation={issue.recommendation ?? undefined}
      actions={
        <>
          {sourceRoute && (
            <Button
              variant="ghost"
              size="sm"
              icon={ExternalLink}
              onClick={() => onNavigate?.(sourceRoute)}
            >
              View Source
            </Button>
          )}
          {issue.status === 'OPEN' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(issue.id)}
              disabled={isDismissing}
            >
              Dismiss
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={ArrowRight}
            iconPosition="right"
            onClick={() => onFix(issue.id)}
          >
            Fix
          </Button>
        </>
      }
    />
  );
}
