import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import {
  CARD_VARIANTS, SEVERITY_COLORS, RECOMMENDATION_BLOCK, TYPOGRAPHY
} from '@/lib/constants/design-tokens';

type Severity = 'critical' | 'warning' | 'suggestion';

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  suggestion: 'Suggestion',
};

interface IssueCardProps {
  severity: Severity;
  title: string;
  /** Bijv. "Personas → Tech-Savvy Millennial" */
  subtitle?: string;
  description: string;
  /** Tags die conflicten tonen */
  conflictsWith?: string[];
  /** AI aanbeveling tekst */
  recommendation?: string;
  /** Action links/buttons onderaan */
  actions?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function IssueCard({
  severity, title, subtitle, description,
  conflictsWith, recommendation, actions, className,
  'data-testid': testId,
}: IssueCardProps) {
  const colors = SEVERITY_COLORS[severity];

  return (
    <div data-testid={testId} className={cn(CARD_VARIANTS.default, colors.border, className)}>
      {/* Severity badge */}
      <span className={cn(
        'inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-3',
        colors.badge
      )}>
        {SEVERITY_LABELS[severity]}
      </span>

      {/* Title + subtitle */}
      <h3 className={cn(TYPOGRAPHY.cardTitle, 'mb-1')}>{title}</h3>
      {subtitle && (
        <p className={cn(TYPOGRAPHY.caption, 'mb-3')}>{subtitle}</p>
      )}

      {/* Description */}
      <p className={cn(TYPOGRAPHY.bodySmall, 'text-muted-foreground mb-3')}>
        {description}
      </p>

      {/* Conflicts with tags */}
      {conflictsWith && conflictsWith.length > 0 && (
        <div className="mb-3">
          <span className="text-xs text-muted-foreground">Conflicts with: </span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {conflictsWith.map((tag) => (
              <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded-md font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation block */}
      {recommendation && (
        <div className={RECOMMENDATION_BLOCK.wrapper}>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className={cn('h-3.5 w-3.5', RECOMMENDATION_BLOCK.icon)} />
            <span className={RECOMMENDATION_BLOCK.label}>AI Recommendation:</span>
          </div>
          <p className={RECOMMENDATION_BLOCK.text}>{recommendation}</p>
        </div>
      )}

      {/* Actions */}
      {actions && (
        <div className="flex items-center justify-end gap-4 mt-4">
          {actions}
        </div>
      )}
    </div>
  );
}
