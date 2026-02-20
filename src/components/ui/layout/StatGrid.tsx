import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SPACING } from '@/lib/constants/design-tokens';

interface StatGridProps {
  children: ReactNode;
  /** Default: 4 columns. Pas aan voor minder stats */
  columns?: 2 | 3 | 4;
  className?: string;
}

const COLS_MAP = {
  2: SPACING.grid.cols2,
  3: SPACING.grid.cols3,
  4: SPACING.grid.cols4,
} as const;

export function StatGrid({ children, columns = 4, className }: StatGridProps) {
  return (
    <div className={cn(COLS_MAP[columns], SPACING.section.marginBottomSmall, className)}>
      {children}
    </div>
  );
}
