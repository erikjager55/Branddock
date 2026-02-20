import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LAYOUT_PATTERNS, SPACING } from '@/lib/constants/design-tokens';

type MaxWidth = '3xl' | '5xl' | '7xl' | 'full';

const MAX_WIDTH_MAP: Record<MaxWidth, string> = {
  '3xl': LAYOUT_PATTERNS.centeredContentSm,
  '5xl': LAYOUT_PATTERNS.centeredContentMd,
  '7xl': LAYOUT_PATTERNS.centeredContentXl,
  'full': LAYOUT_PATTERNS.centeredContentFull,
};

interface PageShellProps {
  children: ReactNode;
  maxWidth?: MaxWidth;
  className?: string;
  /** Padding wordt automatisch toegepast. Set false voor custom layouts */
  noPadding?: boolean;
}

export function PageShell({ children, maxWidth = '7xl', className, noPadding = false }: PageShellProps) {
  return (
    <div data-testid="page-shell" className={LAYOUT_PATTERNS.fullPage}>
      <div className={cn(
        MAX_WIDTH_MAP[maxWidth],
        !noPadding && SPACING.page.padding,
        className
      )}>
        {children}
      </div>
    </div>
  );
}
