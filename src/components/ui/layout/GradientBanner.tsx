import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { type ModuleKey, getModuleGradient } from '@/lib/constants/design-tokens';

interface GradientBannerProps {
  moduleKey: ModuleKey;
  /** Content inside the gradient area (avatar, title, etc.) */
  children?: ReactNode;
  /** Height variant */
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

const HEIGHT_MAP = {
  sm: 'h-24',
  md: 'h-32',
  lg: 'h-48',
} as const;

export function GradientBanner({ moduleKey, children, height = 'md', className }: GradientBannerProps) {
  return (
    <div className={cn(
      'relative rounded-xl overflow-hidden',
      getModuleGradient(moduleKey),
      HEIGHT_MAP[height],
      className
    )}>
      {children && (
        <div className="absolute inset-0 flex items-end p-6">
          {children}
        </div>
      )}
    </div>
  );
}
