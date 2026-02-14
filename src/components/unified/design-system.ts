/**
 * Unified Design System
 * Single source of truth for all styling, states, and visual tokens
 */

// ============================================================================
// STATUS ENUM - Shared across all components
// ============================================================================

export enum CardStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  LOCKED = 'locked',
  NOT_STARTED = 'not-started',
}

// ============================================================================
// STATUS STYLING - Consistent colors and badges
// ============================================================================

export const STATUS_STYLES = {
  [CardStatus.DRAFT]: {
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
    text: 'text-gray-700 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    border: 'border-gray-200 dark:border-gray-800',
    label: 'Draft',
  },
  [CardStatus.ACTIVE]: {
    badge: 'bg-[#1FD1B2]/10 text-[#1FD1B2] dark:bg-[#1FD1B2]/20 dark:text-[#1FD1B2] border-[#1FD1B2]/20 dark:border-[#1FD1B2]/30',
    text: 'text-[#1FD1B2]',
    bg: 'bg-[#1FD1B2]/5 dark:bg-[#1FD1B2]/10',
    border: 'border-[#1FD1B2]/20 dark:border-[#1FD1B2]/30',
    label: 'Active',
  },
  [CardStatus.IN_PROGRESS]: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    label: 'In Progress',
  },
  [CardStatus.COMPLETED]: {
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    label: 'Completed',
  },
  [CardStatus.LOCKED]: {
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    label: 'Locked',
  },
  [CardStatus.NOT_STARTED]: {
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    label: 'Not Started',
  },
} as const;

// ============================================================================
// QUALITY SCORE STYLING
// ============================================================================

export const QUALITY_STYLES = {
  high: {
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    text: 'text-green-600 dark:text-green-400',
    label: 'High Quality',
  },
  medium: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'Medium Quality',
  },
  low: {
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    text: 'text-orange-600 dark:text-orange-400',
    label: 'Low Quality',
  },
} as const;

export function getQualityLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

export const TYPOGRAPHY = {
  header: {
    title: 'text-base font-medium',
    subtitle: 'text-sm text-muted-foreground',
  },
  meta: {
    label: 'text-xs font-medium text-muted-foreground uppercase tracking-wide',
    value: 'text-xs text-muted-foreground',
  },
  body: {
    primary: 'text-sm text-foreground',
    secondary: 'text-sm text-muted-foreground',
  },
  progress: {
    percentage: 'text-xs font-semibold',
    label: 'text-xs text-muted-foreground',
  },
} as const;

// ============================================================================
// SPACING & LAYOUT SYSTEM
// ============================================================================

export const SPACING = {
  card: {
    padding: 'p-4',
    gap: 'space-y-4',
  },
  zone: {
    gap: 'space-y-2',
  },
  inline: {
    gap: 'gap-2',
    gapSm: 'gap-1.5',
    gapLg: 'gap-3',
  },
} as const;

// ============================================================================
// BORDER & RADIUS SYSTEM
// ============================================================================

export const BORDERS = {
  card: 'border border-border rounded-lg',
  zone: 'border-t border-border',
  badge: 'border',
  radius: {
    sm: 'rounded-md',
    md: 'rounded-lg',
    full: 'rounded-full',
  },
} as const;

// ============================================================================
// ICON SIZES
// ============================================================================

export const ICON_SIZES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  container: {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  },
} as const;

// ============================================================================
// TRANSITION & ANIMATION
// ============================================================================

export const TRANSITIONS = {
  card: 'transition-all duration-200',
  hover: 'hover:shadow-lg',
  interactive: 'cursor-pointer',
} as const;
