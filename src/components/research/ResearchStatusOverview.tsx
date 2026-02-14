import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { motion } from 'motion/react';
import { 
  Clock,
  Zap,
  BarChart3
} from 'lucide-react';
import { VALIDATION_METHODS } from '../../config/validation-methods';
import type { ResearchMethodType } from '../../types/brand-asset';
import { ValidationMethodButton, ValidationMethodStatus } from '../validation/ValidationMethodButton';
import { standardizeMethodData } from '../../utils/research-method-utils';
import type { MethodStatus, MethodImpact, MethodConfidence } from './ResearchMethodCard';

// Research method with status
export interface ResearchMethodWithStatus {
  type: ResearchMethodType;
  status: MethodStatus;
  impact?: MethodImpact;
  qualityScore?: number;
  confidence?: MethodConfidence;
  completedAt?: string;
  progress?: number;
  metadata?: Record<string, any>;
}

// Component props
export interface ResearchStatusOverviewProps {
  // Data fields
  methods: ResearchMethodWithStatus[];
  progressPercentage?: number;
  completedCount?: number;
  totalCount?: number;
  lastUpdated?: string;
  generatedArtifacts?: number;
  
  // Actions
  onMethodClick?: (method: ResearchMethodWithStatus) => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  
  // Display options
  variant?: 'full' | 'compact' | 'card';
  showProgress?: boolean;
  showHeader?: boolean;
  showMetadata?: boolean;
  showActions?: boolean;
  
  // Styling
  className?: string;
}

// Main component
export function ResearchStatusOverview({
  methods,
  progressPercentage,
  completedCount,
  totalCount,
  lastUpdated,
  generatedArtifacts,
  onMethodClick,
  onPrimaryAction,
  onSecondaryAction,
  primaryActionLabel = 'View All Research',
  secondaryActionLabel = 'Export Data',
  variant = 'full',
  showProgress = true,
  showHeader = true,
  showMetadata = true,
  showActions = true,
  className = '',
}: ResearchStatusOverviewProps) {
  // Calculate progress if not provided
  const calculatedProgress = progressPercentage ?? (
    totalCount && totalCount > 0 
      ? Math.round((completedCount || 0) / totalCount * 100)
      : 0
  );
  
  const calculatedCompleted = completedCount ?? methods.filter(m => m.status === 'completed').length;
  const calculatedTotal = totalCount ?? methods.length;

  // ✅ NO MAPPING NEEDED - statuses are now uniform across the app!
  // The MethodStatus and ValidationMethodStatus are now the same type

  // Render method item using ValidationMethodButton
  const renderMethodItem = (method: ResearchMethodWithStatus, index: number) => {
    // Get validation method config
    const validationMethod = VALIDATION_METHODS.find(m => m.id === method.type);
    if (!validationMethod) return null;

    return (
      <ValidationMethodButton
        key={index}
        label={validationMethod.name}
        description={validationMethod.description}
        type={method.type}
        status={method.status}  // ✅ Direct pass-through - no mapping!
        progress={method.progress}
        icon={validationMethod.icon}
        duration={validationMethod.duration}
        category={validationMethod.category}
        onPrimaryClick={() => onMethodClick && onMethodClick(method)}
        animationDelay={index * 0.05}
        unlockTier={validationMethod.unlockLevel === 'basic' ? 'basic' 
          : validationMethod.unlockLevel === 'premium' ? 'premium'
          : validationMethod.unlockLevel === 'enterprise' ? 'enterprise'
          : undefined
        }
      />
    );
  };

  // Render based on variant
  if (variant === 'compact') {
    return (
      <div className={`space-y-2 ${className}`}>
        {methods.map((method, idx) => renderMethodItem(method, idx))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`rounded-xl border border-border bg-background p-6 shadow-sm ${className}`}>
        {showHeader && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold">Research Methods</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Validation progress
                </p>
              </div>
              {showProgress && (
                <div className="text-right">
                  <div className="text-xl font-bold text-primary">{calculatedProgress}%</div>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              )}
            </div>
            
            {showProgress && (
              <div className="flex items-center gap-3 mt-3">
                <Progress value={calculatedProgress} className="h-2 flex-1" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {calculatedCompleted} of {calculatedTotal}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {methods.map((method, idx) => renderMethodItem(method, idx))}
        </div>
      </div>
    );
  }

  // Full variant (default)
  return (
    <div className={className}>
      {showHeader && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-semibold">Research Methods</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Validate and enrich this asset through research
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{calculatedProgress}%</div>
              <p className="text-xs text-muted-foreground">Unlocked</p>
            </div>
          </div>
          
          {showProgress && (
            <div className="flex items-center gap-3 mt-4">
              <Progress value={calculatedProgress} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {calculatedCompleted} of {calculatedTotal} completed
              </span>
            </div>
          )}

          {/* Metadata row */}
          {showMetadata && (lastUpdated || generatedArtifacts !== undefined) && (
            <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
              {lastUpdated && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Last updated: {lastUpdated}</span>
                </div>
              )}
              {generatedArtifacts !== undefined && (
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>{generatedArtifacts} artifacts generated</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {methods.map((method, idx) => renderMethodItem(method, idx))}
      </div>

      {/* Actions */}
      {showActions && (onPrimaryAction || onSecondaryAction) && (
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
          {onPrimaryAction && (
            <Button
              onClick={onPrimaryAction}
              variant="outline"
              className="flex-1"
            >
              <Zap className="h-4 w-4 mr-2" />
              {primaryActionLabel}
            </Button>
          )}
          {onSecondaryAction && (
            <Button
              onClick={onSecondaryAction}
              variant="ghost"
              className="flex-1"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}