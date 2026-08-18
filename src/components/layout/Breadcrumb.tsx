'use client';

import Link from 'next/link';
import { ChevronRight, FileText, Home, type LucideIcon } from 'lucide-react';
import { resolveIcon } from '@/lib/icons/icon-registry';
import { BREADCRUMB, LAYOUT, PAGE_ICONS, cn } from '@/lib/constants/design-tokens';

// ─── Types ────────────────────────────────────────────────

export interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Link href — omit for the current (last) page */
  href?: string;
  /** Module key from PAGE_ICONS for icon, e.g. 'personas' */
  moduleKey?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

// ─── Icon Helper ──────────────────────────────────────────

function getLucideIcon(name: string): LucideIcon {
  return resolveIcon(name, FileText);
}

// ─── Component ────────────────────────────────────────────

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className={cn(LAYOUT.breadcrumbBar.padding, LAYOUT.breadcrumbBar.border, LAYOUT.breadcrumbBar.bg)}>
      <nav className={BREADCRUMB.container} aria-label="Breadcrumb">
        {/* Home icon — always links to dashboard */}
        <Link href="/" className={BREADCRUMB.item.link}>
          <Home className={BREADCRUMB.item.icon} />
        </Link>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const pageIcon = item.moduleKey ? PAGE_ICONS[item.moduleKey] : undefined;
          const Icon = pageIcon ? getLucideIcon(pageIcon.icon) : undefined;

          return (
            <span key={index} className={BREADCRUMB.item.base}>
              {/* Separator */}
              <ChevronRight className={BREADCRUMB.separator} />

              {/* Icon (if moduleKey provided) */}
              {Icon && (
                <Icon
                  className={cn(
                    BREADCRUMB.item.icon,
                    isLast ? pageIcon?.iconColor : 'text-gray-400'
                  )}
                />
              )}

              {/* Label — link or current */}
              {isLast || !item.href ? (
                <span className={BREADCRUMB.item.current}>{item.label}</span>
              ) : (
                <Link href={item.href} className={BREADCRUMB.item.link}>
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}

export default Breadcrumb;
