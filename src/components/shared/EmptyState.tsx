'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { COMPONENTS } from '@/lib/constants/design-tokens';
import { Button } from './Button';

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
        <Button
          variant={action.variant === 'secondary' ? 'secondary' : 'primary'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
