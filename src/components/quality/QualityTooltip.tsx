/**
 * Quality Tooltip Component
 * Explains quality score with connection to validation methods
 */

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  getQualityConfig,
  QUALITY_MESSAGES,
  QUALITY_THRESHOLDS
} from '../../constants/quality-system';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface QualityTooltipProps {
  score: number;
  completedCount: number;
  totalCount: number;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function QualityTooltip({
  score,
  completedCount,
  totalCount,
  children,
  side = 'top'
}: QualityTooltipProps) {
  const config = getQualityConfig(score);
  const messages = QUALITY_MESSAGES[config.level];
  const Icon = config.icon;

  const pendingCount = totalCount - completedCount;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className="w-80 p-0 overflow-hidden"
          sideOffset={8}
        >
          {/* Header */}
          <div className={cn('p-4 border-b-2', config.containerClasses)}>
            <div className="flex items-start gap-3">
              <div className={cn('p-2 rounded-lg bg-white/80', config.ringColor, 'ring-2')}>
                <Icon className={cn('h-5 w-5', config.iconClasses)} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('text-2xl font-bold', config.textColor)}>
                    {score}%
                  </span>
                  <Badge className={cn('text-xs', config.badgeClasses)}>
                    {config.shortLabel}
                  </Badge>
                </div>
                <p className={cn('text-xs font-medium', config.textColor)}>
                  {messages.title}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 bg-white space-y-4">
            {/* What does this mean? */}
            <div>
              <h4 className="text-xs font-semibold text-gray-900 mb-2">
                Wat betekent deze score?
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                {messages.message}
              </p>
            </div>

            {/* Validation Methods Connection */}
            <div className="pt-3 border-t">
              <h4 className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-gray-700" />
                Validation Methods
              </h4>
              
              {/* Method Breakdown */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-gray-700 font-medium">Voltooid</span>
                  </div>
                  <span className="font-bold text-green-600">
                    {completedCount} / {totalCount}
                  </span>
                </div>
                {pendingCount > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Circle className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-700">Nog te valideren</span>
                    </div>
                    <span className="font-bold text-gray-600">
                      {pendingCount}
                    </span>
                  </div>
                )}
              </div>

              {/* Visual Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Validatie voortgang</span>
                  <span className={cn('font-bold', config.textColor)}>
                    {Math.round(completionRate)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${completionRate}%`,
                      backgroundColor: config.color
                    }}
                  />
                </div>
              </div>

              {/* Quality Calculation */}
              <div className="mt-3 p-2.5 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-semibold text-gray-900">Berekening:</span>{' '}
                  De kwaliteitsscore wordt berekend op basis van het aantal voltooide 
                  validation methods. Meer voltooide methods = hogere betrouwbaarheid 
                  van de data.
                </p>
              </div>
            </div>

            {/* Next Steps */}
            {score < QUALITY_THRESHOLDS.PERFECT && (
              <div className="pt-3 border-t">
                <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-blue-600" />
                  Volgende stap
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {messages.action}
                </p>
              </div>
            )}

            {/* Thresholds Guide */}
            <div className="pt-3 border-t">
              <h4 className="text-xs font-semibold text-gray-900 mb-2">
                Kwaliteitsniveaus
              </h4>
              <div className="space-y-1.5">
                <QualityThresholdItem 
                  label="Perfect" 
                  threshold="95-100%" 
                  color="bg-purple-500"
                  active={score >= 95}
                />
                <QualityThresholdItem 
                  label="Excellent" 
                  threshold="80-94%" 
                  color="bg-blue-500"
                  active={score >= 80 && score < 95}
                />
                <QualityThresholdItem 
                  label="Good" 
                  threshold="60-79%" 
                  color="bg-green-500"
                  active={score >= 60 && score < 80}
                />
                <QualityThresholdItem 
                  label="Basic" 
                  threshold="40-59%" 
                  color="bg-yellow-500"
                  active={score >= 40 && score < 60}
                />
                <QualityThresholdItem 
                  label="Low" 
                  threshold="20-39%" 
                  color="bg-orange-500"
                  active={score >= 20 && score < 40}
                />
                <QualityThresholdItem 
                  label="Critical" 
                  threshold="0-19%" 
                  color="bg-red-500"
                  active={score < 20}
                />
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface QualityThresholdItemProps {
  label: string;
  threshold: string;
  color: string;
  active: boolean;
}

function QualityThresholdItem({ label, threshold, color, active }: QualityThresholdItemProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 text-xs py-1 px-2 rounded transition-all',
      active ? 'bg-gray-100 font-medium' : 'opacity-60'
    )}>
      <div className={cn('h-2 w-2 rounded-full', color)} />
      <span className="flex-1 text-gray-700">{label}</span>
      <span className="text-gray-500 text-xs">{threshold}</span>
    </div>
  );
}

/**
 * Compact Quality Tooltip (for smaller spaces)
 */
interface QualityTooltipCompactProps {
  score: number;
  completedCount: number;
  totalCount: number;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function QualityTooltipCompact({
  score,
  completedCount,
  totalCount,
  children,
  side = 'top'
}: QualityTooltipCompactProps) {
  const config = getQualityConfig(score);
  const Icon = config.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} className="w-64 p-3" sideOffset={8}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className={cn('h-4 w-4', config.iconClasses)} />
              <span className={cn('font-bold', config.textColor)}>
                {score}% Quality Score
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {completedCount} van {totalCount} validation methods voltooid
            </p>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${score}%`,
                  backgroundColor: config.color
                }}
              />
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
