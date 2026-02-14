import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  Lock,
  Play,
  Award,
  Circle,
  FlaskConical,
  ChartBar,
  Unlock,
  Heart,
  Zap,
  BarChart3,
  Sparkles,
  Crown,
  Plus,
} from 'lucide-react';
import type { ResearchMethodType } from '../../types/brand-asset';

// Method status type - matches parent component
export type MethodStatus = 'locked' | 'available' | 'running' | 'completed';

// Method impact type
export type MethodImpact = 'low' | 'medium' | 'high';

// Method confidence type
export type MethodConfidence = 'low' | 'medium' | 'high';

// Unlock status type
export type UnlockStatus = 'free' | 'basic' | 'premium' | 'enterprise';

/**
 * ResearchMethodCard Component Properties
 * All properties are required to ensure consistency across all instances
 */
export interface ResearchMethodCardProps {
  // Core identification
  methodId: ResearchMethodType;
  title: string;
  description: string;
  
  // Metadata
  duration?: string;
  category?: string;
  
  // Status and progress
  unlockStatus: UnlockStatus;
  progressState: MethodStatus;
  progressValue?: number; // 0-100 for running state
  
  // Quality indicators
  impactValue?: MethodImpact;
  qualityScore?: number; // 0-100
  confidence?: MethodConfidence;
  
  // Visual
  icon: LucideIcon;
  
  // Actions
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  
  // Display options
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  animationDelay?: number;
  
  // Additional metadata
  completedAt?: string;
  lastUpdated?: string;
}

// Get impact badge styling
const getImpactStyle = (impact?: MethodImpact) => {
  switch (impact) {
    case 'high':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
    case 'low':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800';
  }
};

// Get confidence display
const getConfidenceDisplay = (confidence?: MethodConfidence) => {
  switch (confidence) {
    case 'high':
      return { label: 'High confidence', color: 'text-green-600 dark:text-green-400' };
    case 'medium':
      return { label: 'Medium confidence', color: 'text-yellow-600 dark:text-yellow-400' };
    case 'low':
      return { label: 'Low confidence', color: 'text-orange-600 dark:text-orange-400' };
    default:
      return { label: 'Pending', color: 'text-gray-500 dark:text-gray-500' };
  }
};

// Get unlock status badge
const getUnlockBadge = (status: UnlockStatus) => {
  switch (status) {
    case 'free':
      return { label: 'FREE', className: 'bg-[#1FD1B2] text-white hover:bg-[#1FD1B2]' };
    case 'basic':
      return { label: 'BASIC', className: 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400' };
    case 'premium':
      return { label: 'PREMIUM', className: 'border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400' };
    case 'enterprise':
      return { label: 'ENTERPRISE', className: 'border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400' };
  }
};

/**
 * ResearchMethodCard - Main Component
 * Single source of truth for all research method card displays
 * NO LOCAL OVERRIDES ALLOWED - All styling and content comes from props
 */
export function ResearchMethodCard({
  methodId,
  title,
  description,
  duration,
  category,
  unlockStatus,
  progressState,
  progressValue,
  impactValue,
  qualityScore,
  confidence,
  icon: Icon,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  variant = 'default',
  showActions = true,
  animationDelay = 0,
  completedAt,
  lastUpdated,
}: ResearchMethodCardProps) {
  
  // Render based on progress state
  switch (progressState) {
    // STATE: COMPLETED
    case 'completed':
      return (
        <motion.div
          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 transition-all"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animationDelay }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-sm font-medium text-green-900 dark:text-green-100">
                  Validated by {title}
                </div>
              </div>
              
              {/* Metadata */}
              <div className="flex items-center gap-3 text-xs text-green-600 dark:text-green-400 mt-0.5 flex-wrap">
                <span>Research complete • High confidence</span>
              </div>
            </div>
          </div>
          
          {/* Action button */}
          {showActions && onPrimaryAction && (
            <button
              className="h-8 px-3 text-xs text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-md transition-colors font-medium flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onPrimaryAction();
              }}
            >
              {primaryActionLabel || 'View Details'}
            </button>
          )}
        </motion.div>
      );
    
    // STATE: RUNNING
    case 'running':
      return (
        <motion.div
          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 transition-all"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animationDelay }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Running: {title} {progressValue !== undefined && `(${progressValue}%)`}
                </div>
              </div>
              
              {/* Metadata */}
              <div className="flex items-center gap-3 text-xs text-blue-600 dark:text-blue-400 mt-0.5 flex-wrap">
                <span>Research in progress</span>
                <span className="text-blue-400 dark:text-blue-600">•</span>
                <span>Collecting data...</span>
              </div>
            </div>
          </div>
          
          {/* Action button */}
          {showActions && onPrimaryAction && (
            <Button
              size="sm"
              variant="ghost"
              className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/40 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onPrimaryAction();
              }}
            >
              {primaryActionLabel || 'View Progress'}
            </Button>
          )}
        </motion.div>
      );
    
    // STATE: LOCKED
    case 'locked':
      return (
        <motion.div
          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 opacity-60"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ delay: animationDelay }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Crown className="h-4 w-4 text-gray-400" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {title}
                </div>
                
                {/* Unlock status badge */}
                {unlockStatus !== 'free' && (
                  <Badge variant="outline" className={getUnlockBadge(unlockStatus).className + ' px-2 py-0 text-xs'}>
                    <Crown className="h-3 w-3 mr-1" />
                    {getUnlockBadge(unlockStatus).label}
                  </Badge>
                )}
              </div>
              
              {/* Description */}
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                {description}
              </div>
            </div>
          </div>
          
          {/* Action button */}
          {showActions && onPrimaryAction && (
            <Button
              size="sm"
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-white flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onPrimaryAction();
              }}
            >
              <Crown className="h-3 w-3 mr-1.5" />
              {primaryActionLabel || 'Unlock'}
            </Button>
          )}
        </motion.div>
      );
    
    // STATE: AVAILABLE (default)
    case 'available':
    default:
      return (
        <motion.div
          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-transparent border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
          onClick={(e) => {
            if (onPrimaryAction) {
              e.stopPropagation();
              onPrimaryAction();
            }
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animationDelay }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
              <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  Start {title}
                </div>
              </div>
              
              {/* Metadata */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                {duration && <span>{duration}</span>}
                {duration && category && <span className="text-muted-foreground/50">•</span>}
                {category && <span>{category}</span>}
                {!duration && !category && <span>Available • Upgrade quality</span>}
              </div>
            </div>
          </div>
          
          {/* Plus icon (right side) */}
          <div className="flex-shrink-0">
            <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </motion.div>
      );
  }
}

/**
 * Compact variant of ResearchMethodCard
 * For use in tight spaces like sidebars or quick overviews
 */
export function ResearchMethodCardCompact(props: ResearchMethodCardProps) {
  return <ResearchMethodCard {...props} variant="compact" showActions={false} />;
}

/**
 * Detailed variant of ResearchMethodCard
 * For use in detail pages with full information
 */
export function ResearchMethodCardDetailed(props: ResearchMethodCardProps) {
  return <ResearchMethodCard {...props} variant="detailed" showActions={true} />;
}