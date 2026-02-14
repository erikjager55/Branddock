/**
 * Unified Type System
 * Shared interfaces for all StatusCard variants
 */

import { LucideIcon } from 'lucide-react';
import { CardStatus } from './design-system';

// ============================================================================
// CORE STATUS CARD DATA INTERFACE
// ============================================================================

export interface StatusCardData {
  // Header Zone
  header: {
    icon: LucideIcon;
    title: string;
    badge?: {
      label: string;
      variant: 'status' | 'quality' | 'custom';
      status?: CardStatus;
      qualityScore?: number;
      completedCount?: number;  // For quality tooltips
      totalCount?: number;      // For quality tooltips
      customClass?: string;
    };
  };

  // Meta Zone
  meta?: {
    type?: string;
    category?: string;
    items?: Array<{
      label: string;
      value: string | number;
      icon?: LucideIcon;
    }>;
  };

  // Body Zone
  body?: {
    description?: string;
    content?: React.ReactNode;
  };

  // Progress Zone
  progress?: {
    percentage: number;
    label?: string;
    status?: CardStatus;
    showBar?: boolean;
  };

  // Action Zone
  actions?: {
    primary?: {
      label: string;
      onClick: () => void;
      variant?: 'default' | 'outline' | 'ghost';
      disabled?: boolean;
    };
    secondary?: {
      label: string;
      onClick: () => void;
      variant?: 'default' | 'outline' | 'ghost';
      disabled?: boolean;
    };
  };

  // Behavior
  onClick?: () => void;
  isClickable?: boolean;

  // Visual
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type BadgeVariant = 'status' | 'quality' | 'custom';

export interface MetaItem {
  label: string;
  value: string | number;
  icon?: LucideIcon;
}

export interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
}