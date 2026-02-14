/**
 * StatusCard - Unified Card Component
 * Single component for all cards: brand assets, campaigns, deliverables, validation items
 * 
 * STRUCTURE (5 Fixed Zones):
 * 1. Header: icon + title + badge
 * 2. Meta: type, category, counts
 * 3. Body: description / content
 * 4. Progress: percentage bar + label
 * 5. Actions: primary + secondary buttons
 */

import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Sparkles } from 'lucide-react';
import { 
  CardStatus, 
  STATUS_STYLES, 
  TYPOGRAPHY,
  SPACING,
  BORDERS,
  ICON_SIZES,
  TRANSITIONS,
} from './design-system';
import { getQualityConfig } from '../../constants/quality-system';
import { QualityBadge } from '../quality/QualityBadge';
import { StatusCardData } from './types';
import { cn } from '../../lib/utils';

interface StatusCardProps {
  data: StatusCardData;
}

export function StatusCard({ data }: StatusCardProps) {
  const { header, meta, body, progress, actions, onClick, isClickable, variant = 'default', className } = data;

  // Determine badge styling
  const getBadgeClass = () => {
    if (!header.badge) return '';

    switch (header.badge.variant) {
      case 'status':
        return header.badge.status ? STATUS_STYLES[header.badge.status].badge : '';
      case 'quality':
        if (header.badge.qualityScore !== undefined) {
          const config = getQualityConfig(header.badge.qualityScore);
          return config.badgeClasses;
        }
        return '';
      case 'custom':
        return header.badge.customClass || '';
      default:
        return '';
    }
  };

  // Progress bar color based on status
  const getProgressBarColor = () => {
    if (!progress?.status) return 'bg-[#1FD1B2]';
    
    switch (progress.status) {
      case CardStatus.COMPLETED:
        return 'bg-green-500';
      case CardStatus.IN_PROGRESS:
        return 'bg-blue-500';
      case CardStatus.ACTIVE:
        return 'bg-[#1FD1B2]';
      default:
        return 'bg-gray-400';
    }
  };

  const HeaderIcon = header.icon;

  return (
    <div
      className={cn(
        BORDERS.card,
        SPACING.card.padding,
        SPACING.card.gap,
        TRANSITIONS.card,
        isClickable && TRANSITIONS.hover,
        isClickable && TRANSITIONS.interactive,
        'bg-card',
        variant === 'compact' && 'p-3 space-y-3',
        className
      )}
      onClick={onClick}
    >
      {/* ZONE 1: HEADER */}
      <div className={cn('flex items-start justify-between', SPACING.inline.gap)}>
        <div className={cn('flex items-start flex-1', SPACING.inline.gapLg)}>
          {/* Icon */}
          <div className={cn(
            ICON_SIZES.container.lg,
            BORDERS.radius.md,
            'bg-primary/10 flex items-center justify-center flex-shrink-0',
            'group-hover:bg-primary/20 transition-colors',
            variant === 'compact' && ICON_SIZES.container.md
          )}>
            <HeaderIcon className={cn(
              ICON_SIZES.lg,
              'text-primary',
              variant === 'compact' && ICON_SIZES.md
            )} />
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              TYPOGRAPHY.header.title,
              'group-hover:text-primary transition-colors',
              variant === 'compact' && 'text-sm'
            )}>
              {header.title}
            </h3>
          </div>
        </div>

        {/* Badge */}
        {header.badge && (
          <>
            {header.badge.variant === 'quality' && header.badge.qualityScore !== undefined ? (
              <QualityBadge
                score={header.badge.qualityScore}
                completedCount={header.badge.completedCount}
                totalCount={header.badge.totalCount}
                size={variant === 'compact' ? 'sm' : 'md'}
                showIcon={true}
                showScore={true}
                showLabel={false}
                showTooltip={true}
                animated={true}
              />
            ) : (
              <Badge variant="outline" className={cn(getBadgeClass(), 'flex-shrink-0 font-semibold')}>
                {header.badge.label}
              </Badge>
            )}
          </>
        )}
      </div>

      {/* ZONE 2: META */}
      {meta && (
        <div className={cn(SPACING.zone.gap)}>
          {/* Type and Category */}
          {(meta.type || meta.category) && (
            <div className={cn('flex items-center flex-wrap', SPACING.inline.gapSm)}>
              {meta.type && (
                <span className={TYPOGRAPHY.meta.value}>
                  {meta.type}
                </span>
              )}
              {meta.type && meta.category && (
                <span className="text-muted-foreground/50">•</span>
              )}
              {meta.category && (
                <span className={TYPOGRAPHY.meta.value}>
                  {meta.category}
                </span>
              )}
            </div>
          )}

          {/* Meta Items */}
          {meta.items && meta.items.length > 0 && (
            <div className={cn('flex items-center flex-wrap', SPACING.inline.gap)}>
              {meta.items.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div key={idx} className={cn('flex items-center', SPACING.inline.gapSm)}>
                    {ItemIcon && <ItemIcon className={ICON_SIZES.sm} />}
                    <span className={TYPOGRAPHY.meta.value}>
                      {item.label}: {item.value}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ZONE 3: BODY */}
      {body && (
        <div>
          {body.description && (
            <p className={cn(
              TYPOGRAPHY.body.secondary,
              'line-clamp-2'
            )}>
              {body.description}
            </p>
          )}
          {body.content && (
            <div>{body.content}</div>
          )}
        </div>
      )}

      {/* ZONE 4: PROGRESS */}
      {progress && (
        <div className={cn(SPACING.zone.gap, 'pt-2', BORDERS.zone)}>
          <div className="flex items-center justify-between">
            <span className={cn(
              TYPOGRAPHY.progress.label,
              progress.status && STATUS_STYLES[progress.status].text
            )}>
              {progress.label || 'Progress'}
            </span>
            <span className={cn(
              TYPOGRAPHY.progress.percentage,
              progress.status && STATUS_STYLES[progress.status].text
            )}>
              {progress.percentage}%
            </span>
          </div>

          {(progress.showBar !== false) && (
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(getProgressBarColor(), 'h-full transition-all duration-500')}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ZONE 5: ACTIONS */}
      {actions && (actions.primary || actions.secondary) && (
        <div className={cn('flex items-center', SPACING.inline.gap, 'pt-2', !progress && BORDERS.zone)}>
          {actions.primary && (
            <Button
              variant={actions.primary.variant || 'default'}
              size={variant === 'compact' ? 'sm' : 'default'}
              onClick={(e) => {
                e.stopPropagation();
                actions.primary?.onClick();
              }}
              disabled={actions.primary.disabled}
              className="flex-1"
            >
              {actions.primary.label}
            </Button>
          )}

          {actions.secondary && (
            <Button
              variant={actions.secondary.variant || 'outline'}
              size={variant === 'compact' ? 'sm' : 'default'}
              onClick={(e) => {
                e.stopPropagation();
                actions.secondary?.onClick();
              }}
              disabled={actions.secondary.disabled}
            >
              {actions.secondary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}