/**
 * Unified Quality Score System
 * Consistent quality indicators across the entire application
 */

import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Shield,
  Star,
  Sparkles,
  TrendingUp,
  Award,
  Crown,
  Zap,
  type LucideIcon
} from 'lucide-react';

// ============================================================================
// QUALITY LEVELS
// ============================================================================

export type QualityLevel = 
  | 'critical'    // 0-19%   - Critical issues, unreliable
  | 'low'         // 20-39%  - Low quality, needs work
  | 'basic'       // 40-59%  - Basic quality, acceptable
  | 'good'        // 60-79%  - Good quality, solid
  | 'excellent'   // 80-94%  - Excellent quality, high confidence
  | 'perfect';    // 95-100% - Perfect quality, exceptional

// ============================================================================
// QUALITY CONFIGURATION
// ============================================================================

export interface QualityConfig {
  level: QualityLevel;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  ringColor: string;
  badgeClasses: string;
  iconClasses: string;
  containerClasses: string;
  minScore: number;
  maxScore: number;
}

export const QUALITY_LEVELS: Record<QualityLevel, QualityConfig> = {
  critical: {
    level: 'critical',
    label: 'Critical Quality Issues',
    shortLabel: 'Critical',
    description: 'Unreliable data - immediate attention required',
    icon: AlertTriangle,
    color: '#DC2626', // red-600
    bgColor: '#FEE2E2', // red-100
    borderColor: '#DC2626',
    textColor: '#991B1B', // red-800
    ringColor: 'ring-red-500/20',
    badgeClasses: 'bg-red-100 text-red-800 border-red-300 ring-2 ring-red-500/20',
    iconClasses: 'text-red-600',
    containerClasses: 'bg-red-50 border-red-200',
    minScore: 0,
    maxScore: 19
  },
  low: {
    level: 'low',
    label: 'Low Quality',
    shortLabel: 'Low',
    description: 'Needs significant improvement',
    icon: AlertCircle,
    color: '#EA580C', // orange-600
    bgColor: '#FFEDD5', // orange-100
    borderColor: '#EA580C',
    textColor: '#C2410C', // orange-700
    ringColor: 'ring-orange-500/20',
    badgeClasses: 'bg-orange-100 text-orange-800 border-orange-300 ring-2 ring-orange-500/20',
    iconClasses: 'text-orange-600',
    containerClasses: 'bg-orange-50 border-orange-200',
    minScore: 20,
    maxScore: 39
  },
  basic: {
    level: 'basic',
    label: 'Basic Quality',
    shortLabel: 'Basic',
    description: 'Acceptable but room for improvement',
    icon: CheckCircle2,
    color: '#EAB308', // yellow-500
    bgColor: '#FEF9C3', // yellow-100
    borderColor: '#EAB308',
    textColor: '#A16207', // yellow-700
    ringColor: 'ring-yellow-500/20',
    badgeClasses: 'bg-yellow-100 text-yellow-800 border-yellow-300 ring-2 ring-yellow-500/20',
    iconClasses: 'text-yellow-600',
    containerClasses: 'bg-yellow-50 border-yellow-200',
    minScore: 40,
    maxScore: 59
  },
  good: {
    level: 'good',
    label: 'Good Quality',
    shortLabel: 'Good',
    description: 'Solid quality with high confidence',
    icon: Shield,
    color: '#1FD1B2', // Primary Minty Green
    bgColor: '#D1FAE5', // green-100
    borderColor: '#1FD1B2',
    textColor: '#065F46', // green-800
    ringColor: 'ring-primary/20',
    badgeClasses: 'bg-green-100 text-green-800 border-green-300 ring-2 ring-primary/20',
    iconClasses: 'text-primary',
    containerClasses: 'bg-green-50 border-green-200',
    minScore: 60,
    maxScore: 79
  },
  excellent: {
    level: 'excellent',
    label: 'Excellent Quality',
    shortLabel: 'Excellent',
    description: 'Exceptional quality with very high confidence',
    icon: Award,
    color: '#5252E3', // Electric Blue
    bgColor: '#DBEAFE', // blue-100
    borderColor: '#5252E3',
    textColor: '#1E40AF', // blue-800
    ringColor: 'ring-blue-500/20',
    badgeClasses: 'bg-blue-100 text-blue-800 border-blue-300 ring-2 ring-blue-500/20',
    iconClasses: 'text-blue-600',
    containerClasses: 'bg-blue-50 border-blue-200',
    minScore: 80,
    maxScore: 94
  },
  perfect: {
    level: 'perfect',
    label: 'Perfect Quality',
    shortLabel: 'Perfect',
    description: 'Maximum quality - fully validated and verified',
    icon: Crown,
    color: '#9333EA', // purple-600
    bgColor: '#F3E8FF', // purple-100
    borderColor: '#9333EA',
    textColor: '#6B21A8', // purple-800
    ringColor: 'ring-purple-500/20',
    badgeClasses: 'bg-purple-100 text-purple-800 border-purple-300 ring-2 ring-purple-500/20',
    iconClasses: 'text-purple-600',
    containerClasses: 'bg-purple-50 border-purple-200',
    minScore: 95,
    maxScore: 100
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get quality level based on score (0-100)
 */
export function getQualityLevel(score: number): QualityLevel {
  if (score >= 95) return 'perfect';
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'basic';
  if (score >= 20) return 'low';
  return 'critical';
}

/**
 * Get quality configuration for a score
 */
export function getQualityConfig(score: number): QualityConfig {
  const level = getQualityLevel(score);
  return QUALITY_LEVELS[level];
}

/**
 * Get quality level from completion metrics
 */
export function calculateQualityFromMetrics(
  completed: number,
  total: number
): QualityLevel {
  if (total === 0) return 'critical';
  const score = Math.round((completed / total) * 100);
  return getQualityLevel(score);
}

/**
 * Get quality score from completion metrics
 */
export function calculateQualityScore(
  completed: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// ============================================================================
// QUALITY THRESHOLDS
// ============================================================================

export const QUALITY_THRESHOLDS = {
  MINIMUM_ACCEPTABLE: 40, // Basic quality threshold
  RECOMMENDED: 60,         // Good quality threshold
  HIGH_CONFIDENCE: 80,     // Excellent quality threshold
  PERFECT: 95              // Perfect quality threshold
};

// ============================================================================
// QUALITY MESSAGES
// ============================================================================

export const QUALITY_MESSAGES: Record<QualityLevel, {
  title: string;
  message: string;
  action: string;
}> = {
  critical: {
    title: 'Critical Quality Issues',
    message: 'This data is unreliable and should not be used for decision making.',
    action: 'Complete validation methods immediately'
  },
  low: {
    title: 'Low Quality Data',
    message: 'Significant improvements needed before this can be trusted.',
    action: 'Add more validation methods'
  },
  basic: {
    title: 'Basic Quality',
    message: 'Acceptable for initial exploration but needs more validation.',
    action: 'Improve quality for better insights'
  },
  good: {
    title: 'Good Quality',
    message: 'Solid quality with reliable insights for decision making.',
    action: 'Optional: Add more validation for higher confidence'
  },
  excellent: {
    title: 'Excellent Quality',
    message: 'Very high quality with exceptional confidence in insights.',
    action: 'Quality is excellent - ready for strategic decisions'
  },
  perfect: {
    title: 'Perfect Quality',
    message: 'Maximum quality achieved - fully validated and verified.',
    action: 'Perfect quality - maintain and monitor'
  }
};

// ============================================================================
// QUALITY VARIANTS FOR DIFFERENT CONTEXTS
// ============================================================================

export type QualitySize = 'sm' | 'md' | 'lg' | 'xl';

export const QUALITY_SIZE_CONFIGS: Record<QualitySize, {
  badge: string;
  icon: string;
  text: string;
  container: string;
}> = {
  sm: {
    badge: 'text-xs px-2 py-0.5 gap-1',
    icon: 'h-3 w-3',
    text: 'text-xs',
    container: 'gap-1.5'
  },
  md: {
    badge: 'text-sm px-2.5 py-1 gap-1.5',
    icon: 'h-4 w-4',
    text: 'text-sm',
    container: 'gap-2'
  },
  lg: {
    badge: 'text-base px-3 py-1.5 gap-2',
    icon: 'h-5 w-5',
    text: 'text-base',
    container: 'gap-2.5'
  },
  xl: {
    badge: 'text-lg px-4 py-2 gap-2.5',
    icon: 'h-6 w-6',
    text: 'text-lg',
    container: 'gap-3'
  }
};
