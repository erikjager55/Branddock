import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CARD_VARIANTS, ICON_CONTAINERS, ICON_SIZES, TYPOGRAPHY, SPACING } from '@/lib/constants/design-tokens';
import type { LucideIcon } from 'lucide-react';

type ImpactLevel = 'high' | 'medium' | 'low';

const IMPACT_BADGES: Record<ImpactLevel, { label: string; className: string }> = {
  high: { label: 'Hoge impact', className: 'bg-red-50 text-red-700 border border-red-200' },
  medium: { label: 'Gemiddelde impact', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  low: { label: 'Lage impact', className: 'bg-green-50 text-green-700 border border-green-200' },
};

interface SectionCardProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  impactBadge?: ImpactLevel;
  /** Gradient background for icon container */
  iconGradient?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  icon: Icon, title, subtitle, impactBadge, iconGradient, actions, children, className
}: SectionCardProps) {
  return (
    <div className={cn(CARD_VARIANTS.default, className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn(
              ICON_CONTAINERS.medium,
              iconGradient || 'bg-primary/10'
            )}>
              <Icon className={cn(ICON_SIZES.md, iconGradient ? 'text-white' : 'text-primary')} />
            </div>
          )}
          <div>
            <h3 className={TYPOGRAPHY.cardTitle}>{title}</h3>
            {subtitle && <p className={TYPOGRAPHY.caption}>{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {impactBadge && (
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              IMPACT_BADGES[impactBadge].className
            )}>
              {IMPACT_BADGES[impactBadge].label}
            </span>
          )}
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}
