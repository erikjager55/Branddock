import React from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { LucideIcon, ArrowRight, BookOpen } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  illustration?: string;
  illustrationAlt?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'card' | 'minimal';
}

export function EmptyState({
  icon: Icon,
  iconColor = 'text-muted-foreground',
  iconBgColor = 'bg-muted',
  title,
  description,
  primaryAction,
  secondaryAction,
  illustration,
  illustrationAlt,
  size = 'medium',
  variant = 'default'
}: EmptyStateProps) {
  const sizeClasses = {
    small: {
      container: 'py-8 px-4',
      icon: 'h-12 w-12',
      iconWrapper: 'h-20 w-20',
      title: 'text-lg',
      description: 'text-sm',
      illustration: 'max-w-[200px]'
    },
    medium: {
      container: 'py-12 px-6',
      icon: 'h-12 w-12',
      iconWrapper: 'h-24 w-24',
      title: 'text-xl',
      description: 'text-base',
      illustration: 'max-w-[280px]'
    },
    large: {
      container: 'py-16 px-8',
      icon: 'h-16 w-16',
      iconWrapper: 'h-32 w-32',
      title: 'text-2xl',
      description: 'text-lg',
      illustration: 'max-w-[360px]'
    }
  };

  const classes = sizeClasses[size];

  const containerClass = variant === 'card'
    ? 'rounded-xl border-2 border-dashed border-border bg-muted/20'
    : variant === 'minimal'
    ? ''
    : 'rounded-lg border border-border bg-background';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${containerClass} ${classes.container}`}
    >
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-6">
        {/* Icon or Illustration */}
        {illustration ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className={`${classes.illustration} w-full`}
          >
            <img
              src={illustration}
              alt={illustrationAlt || title}
              className="w-full h-auto rounded-lg opacity-60"
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className={`${classes.iconWrapper} ${iconBgColor} rounded-2xl flex items-center justify-center`}
          >
            <Icon className={`${classes.icon} ${iconColor}`} />
          </motion.div>
        )}

        {/* Content */}
        <div className="space-y-3">
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`${classes.title} font-semibold`}
          >
            {title}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`${classes.description} text-muted-foreground leading-relaxed max-w-lg mx-auto`}
          >
            {description}
          </motion.p>
        </div>

        {/* Actions */}
        {(primaryAction || secondaryAction) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-3 pt-2"
          >
            {primaryAction && (
              <Button
                size={size === 'large' ? 'lg' : 'default'}
                onClick={primaryAction.onClick}
                className="gap-2 w-full sm:w-auto"
              >
                {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
                {primaryAction.label}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant="outline"
                size={size === 'large' ? 'lg' : 'default'}
                onClick={secondaryAction.onClick}
                className="gap-2 w-full sm:w-auto"
              >
                {secondaryAction.icon ? (
                  <secondaryAction.icon className="h-4 w-4" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
                {secondaryAction.label}
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Quick preset components for common empty states

export function EmptyBrandAssets({ onCreateAsset, onLearnMore }: {
  onCreateAsset: () => void;
  onLearnMore?: () => void;
}) {
  return (
    <EmptyState
      icon={require('lucide-react').Target}
      iconColor="text-blue-600 dark:text-blue-400"
      iconBgColor="bg-blue-100 dark:bg-blue-900/30"
      title="No Brand Assets Yet"
      description="Brand assets are the strategic foundation of your brand. Start by defining your WHY with the Golden Circle framework, then build out your vision, mission, and values."
      primaryAction={{
        label: 'Create Golden Circle',
        onClick: onCreateAsset,
        icon: require('lucide-react').Plus
      }}
      secondaryAction={onLearnMore ? {
        label: 'Learn About Brand Assets',
        onClick: onLearnMore
      } : undefined}
      illustration="https://images.unsplash.com/photo-1702390753019-e43a19d9371f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbXB0eSUyMG5vdGVib29rJTIwd29ya3NwYWNlfGVufDF8fHx8MTc2NjQ5NzczN3ww&ixlib=rb-4.1.0&q=80&w=1080"
      illustrationAlt="Empty workspace ready for brand assets"
      size="large"
      variant="card"
    />
  );
}

export function EmptyPersonas({ onCreatePersona, onLearnMore }: {
  onCreatePersona: () => void;
  onLearnMore?: () => void;
}) {
  return (
    <EmptyState
      icon={require('lucide-react').Users}
      iconColor="text-purple-600 dark:text-purple-400"
      iconBgColor="bg-purple-100 dark:bg-purple-900/30"
      title="No Personas Defined"
      description="Personas help you understand who you're creating for. Define your target audience with detailed personas including demographics, behaviors, pain points, and goals."
      primaryAction={{
        label: 'Create Your First Persona',
        onClick: onCreatePersona,
        icon: require('lucide-react').UserPlus
      }}
      secondaryAction={onLearnMore ? {
        label: 'Persona Best Practices',
        onClick: onLearnMore
      } : undefined}
      size="large"
      variant="card"
    />
  );
}

export function EmptyResearchPlans({ onCreatePlan, onLearnMore }: {
  onCreatePlan: () => void;
  onLearnMore?: () => void;
}) {
  return (
    <EmptyState
      icon={require('lucide-react').FlaskConical}
      iconColor="text-green-600 dark:text-green-400"
      iconBgColor="bg-green-100 dark:bg-green-900/30"
      title="No Research Plans Yet"
      description="Research helps you validate your brand strategy with real data. Choose from 4 methods: Workshops, Strategic Surveys, 1-on-1 Interviews, or AI Exploration."
      primaryAction={{
        label: 'Plan Your First Research',
        onClick: onCreatePlan,
        icon: require('lucide-react').Plus
      }}
      secondaryAction={onLearnMore ? {
        label: 'Validation Methods Guide',
        onClick: onLearnMore
      } : undefined}
      illustration="https://images.unsplash.com/photo-1645821522738-551e9d46d1e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmVhdGl2ZSUyMGJyYWluc3Rvcm1pbmclMjBpZGVhc3xlbnwxfHx8fDE3NjY0NjA4MzZ8MA&ixlib=rb-4.1.0&q=80&w=1080"
      illustrationAlt="Research planning workspace"
      size="large"
      variant="card"
    />
  );
}

export function EmptyStrategies({ onCreateStrategy, onLearnMore }: {
  onCreateStrategy: () => void;
  onLearnMore?: () => void;
}) {
  return (
    <EmptyState
      icon={require('lucide-react').Lightbulb}
      iconColor="text-amber-600 dark:text-amber-400"
      iconBgColor="bg-amber-100 dark:bg-amber-900/30"
      title="No Strategies Generated Yet"
      description="Generate AI-powered strategies based on your validated brand assets and research. Choose from 21 strategic tools across 5 categories to create campaigns, GTM plans, and more."
      primaryAction={{
        label: 'Explore Strategy Tools',
        onClick: onCreateStrategy,
        icon: require('lucide-react').Sparkles
      }}
      secondaryAction={onLearnMore ? {
        label: 'Strategy Tools Overview',
        onClick: onLearnMore
      } : undefined}
      size="large"
      variant="card"
    />
  );
}

export function EmptyTrends({ onAddTrend, onLearnMore }: {
  onAddTrend: () => void;
  onLearnMore?: () => void;
}) {
  return (
    <EmptyState
      icon={require('lucide-react').TrendingUp}
      iconColor="text-orange-600 dark:text-orange-400"
      iconBgColor="bg-orange-100 dark:bg-orange-900/30"
      title="No Trends Tracked"
      description="Stay ahead by tracking industry trends, market shifts, and emerging opportunities. Add trends to inform your strategic decisions and innovation roadmap."
      primaryAction={{
        label: 'Add Your First Trend',
        onClick: onAddTrend,
        icon: require('lucide-react').Plus
      }}
      secondaryAction={onLearnMore ? {
        label: 'Why Track Trends?',
        onClick: onLearnMore
      } : undefined}
      size="medium"
      variant="card"
    />
  );
}

export function EmptyKnowledge({ onAddItem, onLearnMore }: {
  onAddItem: () => void;
  onLearnMore?: () => void;
}) {
  return (
    <EmptyState
      icon={require('lucide-react').BookOpen}
      iconColor="text-indigo-600 dark:text-indigo-400"
      iconBgColor="bg-indigo-100 dark:bg-indigo-900/30"
      title="Knowledge Library Empty"
      description="Build your strategic knowledge base with insights, best practices, case studies, and frameworks. Organize and reference key learnings to inform future decisions."
      primaryAction={{
        label: 'Add Knowledge Item',
        onClick: onAddItem,
        icon: require('lucide-react').Plus
      }}
      secondaryAction={onLearnMore ? {
        label: 'Knowledge Base Guide',
        onClick: onLearnMore
      } : undefined}
      size="medium"
      variant="card"
    />
  );
}

// Compact empty state for smaller contexts
export function EmptyStateCompact({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4">
      <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h4 className="font-medium mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        {description}
      </p>
      {action && (
        <Button
          size="sm"
          variant="outline"
          onClick={action.onClick}
          className="gap-2"
        >
          <ArrowRight className="h-3 w-3" />
          {action.label}
        </Button>
      )}
    </div>
  );
}