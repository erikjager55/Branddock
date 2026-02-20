import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  MODULE_GRADIENTS,
  type ModuleKey,
  HEADER_PATTERNS,
  LAYOUT_PATTERNS,
  SPACING,
  ICON_CONTAINERS,
  ICON_SIZES,
  TYPOGRAPHY,
  getModuleGradient
} from '@/lib/constants/design-tokens';
import {
  LayoutDashboard, Building2, Target, Palette, Users, Package,
  TrendingUp, BookOpen, Shield, Megaphone, FileText, FlaskConical,
  Settings, HelpCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  'dashboard': LayoutDashboard,
  'brand-foundation': Building2,
  'business-strategy': Target,
  'brandstyle': Palette,
  'personas': Users,
  'products': Package,
  'market-insights': TrendingUp,
  'knowledge': BookOpen,
  'brand-alignment': Shield,
  'campaigns': Megaphone,
  'content-library': FileText,
  'research': FlaskConical,
  'settings': Settings,
  'help': HelpCircle,
};

interface PageHeaderProps {
  moduleKey: ModuleKey;
  title: string;
  subtitle?: string;
  /** Custom icon override (default: auto via moduleKey) */
  icon?: LucideIcon;
  /** Right-side actions (buttons etc.) */
  actions?: ReactNode;
  /** Extra content below title row */
  children?: ReactNode;
  /** Compact variant: smaller padding + text-2xl title */
  compact?: boolean;
}

export function PageHeader({
  moduleKey, title, subtitle, icon, actions, children, compact = false
}: PageHeaderProps) {
  const Icon = icon || MODULE_ICONS[moduleKey];
  const gradientClasses = getModuleGradient(moduleKey);

  return (
    <div data-testid="page-header" className={HEADER_PATTERNS.sticky.wrapper}>
      <div className={cn(
        LAYOUT_PATTERNS.centeredContentXl,
        compact ? SPACING.header.paddingCompact : SPACING.header.padding
      )}>
        <div className={HEADER_PATTERNS.sticky.container}>
          <div className={HEADER_PATTERNS.sticky.left}>
            <div className={cn(ICON_CONTAINERS.large, gradientClasses)}>
              <Icon className={cn(ICON_SIZES.lg, 'text-white')} />
            </div>
            <div>
              <h1 className={cn(compact ? TYPOGRAPHY.pageTitleCompact : TYPOGRAPHY.pageTitle, 'mb-1')}>
                {title}
              </h1>
              {subtitle && (
                <p className={TYPOGRAPHY.caption}>{subtitle}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className={HEADER_PATTERNS.sticky.right}>
              {actions}
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
