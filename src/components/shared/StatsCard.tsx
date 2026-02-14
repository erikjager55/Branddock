import * as LucideIcons from 'lucide-react';
import { STATS_CARD, cn } from '@/lib/constants/design-tokens';

// ─── Types ────────────────────────────────────────────────

interface StatsCardProps {
  /** Display label below the value */
  label: string;
  /** The stat value (number or string) */
  value: string | number;
  /** Lucide icon name */
  icon: string;
  /** Icon circle background color class */
  iconBgColor: string;
  /** Icon color class */
  iconColor: string;
  /** Optional trend indicator */
  trend?: {
    value: string;
    positive: boolean;
  };
}

interface StatsCardGridProps {
  children: React.ReactNode;
  /** Number of columns — defaults to auto-fit */
  columns?: 2 | 3 | 4 | 5;
}

// ─── Icon Helper ──────────────────────────────────────────

function getLucideIcon(name: string): LucideIcons.LucideIcon {
  const icon = (LucideIcons as Record<string, unknown>)[name];
  if (icon && typeof icon === 'function') {
    return icon as LucideIcons.LucideIcon;
  }
  return LucideIcons.BarChart3;
}

// ─── Grid Container ───────────────────────────────────────

const colsMap: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

export function StatsCardGrid({ children, columns = 4 }: StatsCardGridProps) {
  return (
    <div className={cn(STATS_CARD.container, colsMap[columns])}>
      {children}
    </div>
  );
}

// ─── Card Component ───────────────────────────────────────

export function StatsCard({
  label,
  value,
  icon,
  iconBgColor,
  iconColor,
  trend,
}: StatsCardProps) {
  const Icon = getLucideIcon(icon);

  return (
    <div className={STATS_CARD.card}>
      <div className={cn(STATS_CARD.iconCircle.className, iconBgColor)}>
        <Icon className={cn(STATS_CARD.iconCircle.iconSize, iconColor)} />
      </div>
      <div className={STATS_CARD.value}>{value}</div>
      <div className={STATS_CARD.label}>
        {label}
        {trend && (
          <span
            className={cn(
              'ml-2 text-xs font-medium',
              trend.positive ? 'text-emerald-500' : 'text-red-500'
            )}
          >
            {trend.positive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

export default StatsCard;
