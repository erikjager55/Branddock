'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { COMPONENTS, TYPOGRAPHY, cn } from '@/lib/constants/design-tokens';

// ─── Types ────────────────────────────────────────────────

export interface EmptyStateProps {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
}

// ─── Component ────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div data-testid="empty-state" className={COMPONENTS.emptyState.container}>
      <Icon className={COMPONENTS.emptyState.icon} strokeWidth={1.5} />
      <h3 className={COMPONENTS.emptyState.title}>{title}</h3>
      <p className={COMPONENTS.emptyState.description}>{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className={
            action.variant === 'secondary'
              ? COMPONENTS.button.secondary
              : COMPONENTS.button.primary
          }
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
