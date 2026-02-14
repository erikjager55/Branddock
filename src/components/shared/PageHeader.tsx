'use client';

import * as LucideIcons from 'lucide-react';
import { PAGE_HEADER, PAGE_ICONS, MODULE_META, cn } from '@/lib/constants/design-tokens';

// ─── Types ────────────────────────────────────────────────

type LucideIconName = keyof typeof LucideIcons;

interface PageHeaderProps {
  /** Module key from PAGE_ICONS / MODULE_META, e.g. 'personas' */
  moduleKey?: string;
  /** Override: page title */
  title?: string;
  /** Override: page subtitle */
  subtitle?: string;
  /** Override: Lucide icon name */
  icon?: string;
  /** Override: icon circle background color class */
  iconBgColor?: string;
  /** Override: icon color class */
  iconColor?: string;
  /** CTA button label — omit to hide CTA */
  ctaLabel?: string;
  /** CTA click handler */
  onCtaClick?: () => void;
  /** CTA Lucide icon name (defaults to 'Plus') */
  ctaIcon?: string;
  /** Extra content rendered on the right side (instead of or next to CTA) */
  rightContent?: React.ReactNode;
}

// ─── Icon Helper ──────────────────────────────────────────

function getLucideIcon(name: string): LucideIcons.LucideIcon {
  const icon = (LucideIcons as Record<string, unknown>)[name];
  if (icon && typeof icon === 'function') {
    return icon as LucideIcons.LucideIcon;
  }
  return LucideIcons.HelpCircle;
}

// ─── Component ────────────────────────────────────────────

export function PageHeader({
  moduleKey,
  title: titleOverride,
  subtitle: subtitleOverride,
  icon: iconOverride,
  iconBgColor: bgOverride,
  iconColor: colorOverride,
  ctaLabel,
  onCtaClick,
  ctaIcon = 'Plus',
  rightContent,
}: PageHeaderProps) {
  // Resolve from tokens when moduleKey provided
  const meta = moduleKey ? MODULE_META[moduleKey] : undefined;
  const icons = moduleKey ? PAGE_ICONS[moduleKey] : undefined;

  const title = titleOverride || meta?.title || 'Page';
  const subtitle = subtitleOverride || meta?.subtitle;
  const iconName = iconOverride || icons?.icon || 'FileText';
  const bgColor = bgOverride || icons?.bgColor || 'bg-gray-100';
  const iconColor = colorOverride || icons?.iconColor || 'text-gray-500';

  const Icon = getLucideIcon(iconName);
  const CtaIcon = getLucideIcon(ctaIcon);

  return (
    <div className={PAGE_HEADER.container}>
      {/* Left: icon circle + title group */}
      <div className={PAGE_HEADER.titleGroup}>
        <div className={cn(PAGE_HEADER.iconCircle.className, bgColor)}>
          <Icon className={cn(PAGE_HEADER.iconCircle.iconSize, iconColor)} />
        </div>
        <div>
          <h1 className={PAGE_HEADER.title}>{title}</h1>
          {subtitle && <p className={PAGE_HEADER.subtitle}>{subtitle}</p>}
        </div>
      </div>

      {/* Right: CTA button and/or custom content */}
      <div className="flex items-center gap-3">
        {rightContent}
        {ctaLabel && onCtaClick && (
          <button onClick={onCtaClick} className={PAGE_HEADER.cta}>
            <CtaIcon className="w-4 h-4" />
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
