/**
 * COMPONENT: Section Decision Indicator (REFINED)
 *
 * Mini indicator next to each section title (green/amber/red) that shows
 * whether this section is safe for decision-making.
 *
 * CHANGES v2:
 * - Simpler visual (badge only, no large cards)
 * - Hover/click: tooltip with cause + what is needed
 * - Consistent with header colors
 * - Inherits status from linked items
 */

import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { CheckCircle, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';

interface SectionDecisionIndicatorProps {
  /** Status of this section */
  status: 'safe' | 'risk' | 'blocked';
  /** Section name for labeling */
  sectionName: string;
  /** Which cause(s) affect this section */
  causes?: string[];
  /** What is needed to make this section safe */
  requiredActions?: string[];
  /** Optional callback for action */
  onActionClick?: () => void;
}

export function SectionDecisionIndicator({
  status,
  sectionName,
  causes = [],
  requiredActions = [],
  onActionClick
}: SectionDecisionIndicatorProps) {

  // Status configuration - consistent with header
  const statusConfig = {
    'safe': {
      icon: CheckCircle,
      label: 'Safe',
      color: 'text-green-600',
      bg: 'bg-green-100/80 dark:bg-green-900/20',
      border: 'border-green-300',
      iconSize: 'h-3 w-3'
    },
    'risk': {
      icon: AlertTriangle,
      label: 'Risk',
      color: 'text-amber-600',
      bg: 'bg-amber-100/80 dark:bg-amber-900/20',
      border: 'border-amber-300',
      iconSize: 'h-3 w-3'
    },
    'blocked': {
      icon: ShieldAlert,
      label: 'Unsafe',
      color: 'text-red-600',
      bg: 'bg-red-100/80 dark:bg-red-900/20',
      border: 'border-red-300',
      iconSize: 'h-3 w-3'
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const hasDetails = causes.length > 0 || requiredActions.length > 0;

  // If safe and no details, show compact badge
  if (status === 'safe' && !hasDetails) {
    return (
      <Badge variant="outline" className={`${config.bg} ${config.color} ${config.border} text-xs`}>
        <StatusIcon className={`${config.iconSize} mr-1`} />
        {config.label}
      </Badge>
    );
  }

  // For risk/blocked or when details present: show with popover
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`
            inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
            ${config.bg} ${config.color} border ${config.border}
            hover:opacity-80 transition-opacity cursor-help
          `}
        >
          <StatusIcon className={config.iconSize} />
          <span>{config.label}</span>
          {hasDetails && <Info className="h-3 w-3 opacity-60" />}
        </button>
      </PopoverTrigger>
      
      {hasDetails && (
        <PopoverContent className="w-80 p-3 text-sm" align="start">
          <div className="space-y-2">
            {/* Section name */}
            <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
              {sectionName}
            </div>

            {/* Causes */}
            {causes.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">
                  Cause{causes.length > 1 ? 's' : ''}:
                </p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {causes.map((cause, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1">•</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Required actions */}
            {requiredActions.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium mb-1">
                  Required to make safe:
                </p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {requiredActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-blue-600 font-semibold">{i + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

/**
 * RATIONALE CHANGES v2:
 *
 * 1. SIMPLER VISUAL
 *    - Badge only (no large expandable cards)
 *    - Compact dimensions (text-xs, px-2 py-1)
 *    - Less visual noise in "safe" state
 *
 * 2. POPOVER INSTEAD OF EXPAND
 *    - Hover/click shows tooltip
 *    - No layout shift
 *    - Better UX on mobile (click)
 *    - Desktop: hover is enough
 *
 * 3. CONSISTENT WITH HEADER
 *    - Same color scheme
 *    - Same iconography (ShieldAlert instead of XCircle)
 *    - Same language ("Unsafe" not "Blocked")
 *
 * 4. STRUCTURE IN POPOVER
 *    - Section name as header
 *    - Causes first
 *    - Then required actions (numbered)
 *    - Logical flow
 *
 * 5. CURSOR-HELP
 *    - Cursor changes to help (?)
 *    - Signals: "click for info"
 *    - Better discoverability
 *
 * 6. INHERITANCE LOGIC
 *    - Component receives status from parent
 *    - "Connect Brand Assets" section can be blocked
 *      if linked asset is blocked
 *    - Status is passed down, not calculated in component
 */
