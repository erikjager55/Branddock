/**
 * COMPONENT: Campaign Decision Header (REFINED)
 *
 * Strategic control panel that displays decision status.
 * NOT an error message. IS a calm, clear overview with direct action.
 *
 * CHANGES v2:
 * - More compact (less "error" feel)
 * - Primary action left, visually dominant
 * - Secondary "proceed with risk" right
 * - Show at least 2 causes if present
 * - Calmer color usage
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AlertTriangle, CheckCircle, ShieldAlert, ArrowRight, AlertCircle } from 'lucide-react';

interface CampaignDecisionHeaderProps {
  /** Overall decision status for the campaign */
  status: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
  /** Primary action the user needs to take */
  primaryAction: string;
  /** Callback for primary action button */
  onPrimaryAction?: () => void;
  /** Callback for "proceed with risk" */
  onProceedAnyway?: () => void;
  /** Details about affected assets - NO status field anymore (consistency) */
  details?: {
    affectedAssets: Array<{ name: string; coverage: number }>;
    missingResearch: string[];
  };
}

export function CampaignDecisionHeader({
  status,
  primaryAction,
  onPrimaryAction,
  onProceedAnyway,
  details
}: CampaignDecisionHeaderProps) {
  
  // Status configuration - calmer, less "error" feel
  const statusConfig = {
    'safe-to-decide': {
      icon: CheckCircle,
      label: 'Safe to Decide',
      bgColor: 'bg-green-50/70 dark:bg-green-950/10',
      borderColor: 'border-l-green-600',
      iconColor: 'text-green-600',
      badgeColor: 'bg-green-600/90'
    },
    'decision-at-risk': {
      icon: AlertTriangle,
      label: 'Decision at Risk',
      bgColor: 'bg-amber-50/70 dark:bg-amber-950/10',
      borderColor: 'border-l-amber-600',
      iconColor: 'text-amber-600',
      badgeColor: 'bg-amber-600/90'
    },
    'do-not-decide': {
      icon: ShieldAlert,
      label: 'Do Not Decide',
      bgColor: 'bg-slate-50 dark:bg-slate-950/20', // Calmer than red
      borderColor: 'border-l-red-600',
      iconColor: 'text-red-600',
      badgeColor: 'bg-red-600/90'
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Collect causes (minimum 2 if present)
  const rootCauses = details?.affectedAssets || [];
  const displayCauses = rootCauses.slice(0, 3); // Max 3 for compactness

  // Only show if not safe
  if (status === 'safe-to-decide') {
    return (
      <Card className={`border-l-4 ${config.borderColor} ${config.bgColor}`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-5 w-5 ${config.iconColor}`} />
            <Badge className={`${config.badgeColor} text-white text-xs`}>
              {config.label}
            </Badge>
            <p className="text-sm text-muted-foreground">
              All linked brand data is sufficiently validated. You can safely generate campaigns.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-l-4 ${config.borderColor} ${config.bgColor}`}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-4">
          {/* Left: Status + Causes */}
          <div className="flex-1 min-w-0">
            {/* Status header - compact */}
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={`h-5 w-5 ${config.iconColor} flex-shrink-0`} />
              <Badge className={`${config.badgeColor} text-white text-xs`}>
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Strategic risks detected
              </span>
            </div>

            {/* Causes - always show at least 2 if present */}
            {displayCauses.length > 0 && (
              <div className="space-y-1.5 ml-7">
                {displayCauses.map((asset, i) => (
                  <div 
                    key={i} 
                    className="flex items-baseline gap-2 text-sm"
                  >
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{asset.name}:</span>{' '}
                      <span className="text-muted-foreground">
                        {asset.coverage}% research coverage
                      </span>
                    </div>
                  </div>
                ))}
                {rootCauses.length > 3 && (
                  <p className="text-xs text-muted-foreground ml-5">
                    + {rootCauses.length - 3} more {rootCauses.length - 3 === 1 ? 'item' : 'items'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions - PRIMARY + SECONDARY */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {/* PRIMARY ACTION - Visually Dominant */}
            <Button 
              onClick={onPrimaryAction}
              size="default"
              className="font-semibold shadow-md"
            >
              Fix this now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            {/* SECONDARY ACTION - Text link */}
            {onProceedAnyway && (
              <button
                onClick={onProceedAnyway}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors text-center"
              >
                Proceed with risk
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * RATIONALE CHANGES v2:
 *
 * 1. MORE COMPACT & CALMER
 *    - py-3 instead of py-4 (less height)
 *    - bg-slate-50 for do-not-decide (not bright red)
 *    - Calmer gradients (/70, /90)
 *    - No large iconography
 *
 * 2. STRATEGIC CONTROL PANEL FEEL
 *    - "Strategic risks detected" (not "ERROR")
 *    - Causes with bullet points (structured)
 *    - Compact typography (text-sm)
 *    - Less space, more content
 *
 * 3. PRIMARY ACTION DOMINANT
 *    - "Fix this now" button left (first thing you see)
 *    - size="default" + shadow-md (visually heavier)
 *    - Secondary action is small text link (much lighter)
 *    - Action hierarchy is crystal clear
 *
 * 4. ALWAYS SHOW CAUSES (min 2)
 *    - "Sarah: 48% research coverage"
 *    - "Core Values: 50% research coverage"
 *    - Concrete, specific information
 *    - No abstract "some items have issues"
 *    - CONSISTENCY: percentage only, no form status
 *
 * 5. BEHAVIORAL STEERING
 *    - Primary action = solve problem (encouraged)
 *    - Secondary action = proceed (discouraged but possible)
 *    - Visual hierarchy steers toward desired behavior
 *
 * 6. SAFE STATE
 *    - Compact (py-3)
 *    - No prominence (green is good, no attention needed)
 *    - Short confirmation, then move on
 */