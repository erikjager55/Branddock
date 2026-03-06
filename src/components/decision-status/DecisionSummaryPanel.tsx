/**
 * COMPONENT: Decision Summary Panel
 * 
 * Panel for OUTPUT screen that summarizes decision status, causes,
 * risks, and improvement actions.
 *
 * Difference with CampaignDecisionHeader:
 * - Header = proactive (before generate)
 * - Summary = retrospective (after generate)
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ArrowRight,
  TrendingDown,
  AlertCircle
} from 'lucide-react';

interface DecisionSummaryPanelProps {
  /** Current decision status */
  status: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
  /** Key root causes (max 3) */
  rootCauses: string[];
  /** Concrete risks of this status */
  risks: string[];
  /** Concrete improvement actions */
  improvements: string[];
  /** Callback for improvement actions */
  onImproveClick?: () => void;
  /** Optional: metadata for context */
  metadata?: {
    generatedAt: Date;
    avgCoverage: number;
    totalAssets: number;
    safeAssets: number;
  };
}

export function DecisionSummaryPanel({
  status,
  rootCauses,
  risks,
  improvements,
  onImproveClick,
  metadata
}: DecisionSummaryPanelProps) {
  
  // Status configuration
  const statusConfig = {
    'safe-to-decide': {
      icon: CheckCircle,
      label: 'Safe to Decide',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-500',
      textColor: 'text-green-900 dark:text-green-100',
      badgeBg: 'bg-green-600',
      iconColor: 'text-green-600',
      message: 'This campaign is based on sufficiently validated brand data. Strategic decisions can be made with confidence.'
    },
    'decision-at-risk': {
      icon: AlertTriangle,
      label: 'Decision at Risk',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      borderColor: 'border-amber-500',
      textColor: 'text-amber-900 dark:text-amber-100',
      badgeBg: 'bg-amber-600',
      iconColor: 'text-amber-600',
      message: 'This campaign contains elements with limited validation. Decisions carry increased risk. Consider pilot testing.'
    },
    'do-not-decide': {
      icon: XCircle,
      label: 'Do Not Decide',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-500',
      textColor: 'text-red-900 dark:text-red-100',
      badgeBg: 'bg-red-600',
      iconColor: 'text-red-600',
      message: 'This campaign is based on insufficiently validated data. Strategic decisions are speculative. Completing research first is strongly recommended.'
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className={`border-l-4 ${config.borderColor}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-6 w-6 ${config.iconColor}`} />
            <div>
              <CardTitle className="text-lg">Campaign Decision Summary</CardTitle>
              <Badge className={`${config.badgeBg} text-white mt-1`}>
                {config.label}
              </Badge>
            </div>
          </div>
          {metadata && (
            <div className="text-right text-xs text-muted-foreground">
              <p>Generated on {metadata.generatedAt.toLocaleDateString('en-US')}</p>
              <p className="mt-1">
                {metadata.safeAssets} of {metadata.totalAssets} assets safe
                ({metadata.avgCoverage}% avg. coverage)
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status explanation */}
        <Alert className={config.bgColor}>
          <AlertDescription className={config.textColor}>
            {config.message}
          </AlertDescription>
        </Alert>

        {/* Key root causes */}
        {rootCauses.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Key root causes
            </h4>
            <ul className="space-y-1.5 text-sm">
              {rootCauses.map((cause, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{cause}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concrete risks */}
        {risks.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              Risks at current status
            </h4>
            <ul className="space-y-1.5 text-sm">
              {risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">⚠</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvement actions */}
        {improvements.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-blue-600" />
              Improvement actions
            </h4>
            <ul className="space-y-1.5 text-sm mb-3">
              {improvements.map((improvement, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5 font-semibold">{i + 1}.</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
            {onImproveClick && (
              <Button onClick={onImproveClick} variant="outline" className="w-full">
                Start improving
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}

        {/* Disclaimer for non-safe status */}
        {status !== 'safe-to-decide' && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> This campaign can be executed, but the quality
              of strategic decisions is limited by incomplete research validation.
              Treat outputs as hypotheses that need to be tested, not as validated strategies.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * RATIONALE:
 *
 * 1. RETROSPECTIVE AWARENESS
 *    - After generate: user needs to know what basis the campaign was built on
 *    - "Generated on" + coverage stats provide context
 *    - Not just "nice idea", but "how reliable?"
 *
 * 2. ROOT CAUSE ANALYSIS
 *    - "Key root causes" helps understanding
 *    - Not just "this is wrong", but "why is this wrong"
 *    - Educational, not just corrective
 *
 * 3. RISK AWARENESS
 *    - "Risks" makes impact concrete
 *    - Business language: "inconsistent positioning", "budget waste"
 *    - Not tech language: "low coverage", "missing methods"
 *
 * 4. ACTIONABLE IMPROVEMENTS
 *    - Numbered list (1, 2, 3) gives priority
 *    - "Start improving" CTA makes next step evident
 *    - User can choose: accept risk or improve
 *
 * 5. DISCLAIMER
 *    - "Treat outputs as hypotheses" = realistic
 *    - Not blocking, but honest about quality
 *    - User can make an informed decision
 *
 * 6. DIFFERENCE WITH HEADER
 *    - Header (configure) = "are you allowed to do this?"
 *    - Summary (output) = "what did you do and what does it mean?"
 *    - Header = preventive, Summary = retrospective
 */
