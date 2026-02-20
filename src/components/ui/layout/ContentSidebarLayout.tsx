import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContentSidebarLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  /** sm=320px (w-80), md=384px (w-96) */
  sidebarWidth?: 'sm' | 'md';
  className?: string;
}

const WIDTH_MAP = {
  sm: 'w-80',
  md: 'w-96',
} as const;

export function ContentSidebarLayout({
  children, sidebar, sidebarWidth = 'sm', className
}: ContentSidebarLayoutProps) {
  return (
    <div className={cn('flex gap-8', className)}>
      <div className="flex-1 min-w-0">
        {children}
      </div>
      <div className={cn(
        WIDTH_MAP[sidebarWidth],
        'flex-shrink-0'
      )}>
        <div className="sticky top-24">
          {sidebar}
        </div>
      </div>
    </div>
  );
}
