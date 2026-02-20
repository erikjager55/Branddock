import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { HEADER_PATTERNS, TYPOGRAPHY } from '@/lib/constants/design-tokens';

interface DetailHeaderProps {
  onBack: () => void;
  backLabel?: string;
  title: string;
  subtitle?: string;
  /** Badge elements next to title */
  badges?: ReactNode;
  /** Right-side action buttons */
  actions?: ReactNode;
  /** Avatar or icon element */
  avatar?: ReactNode;
}

export function DetailHeader({
  onBack, backLabel = 'Terug', title, subtitle, badges, actions, avatar
}: DetailHeaderProps) {
  return (
    <div className="mb-6">
      <button
        onClick={onBack}
        className={HEADER_PATTERNS.backButton}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">{backLabel}</span>
      </button>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {avatar}
          <div>
            <div className="flex items-center gap-3">
              <h1 className={TYPOGRAPHY.pageTitle}>{title}</h1>
              {badges}
            </div>
            {subtitle && (
              <p className={cn(TYPOGRAPHY.caption, 'mt-1')}>{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
