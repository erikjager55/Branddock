import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { DecisionStatusInfo, DECISION_STATUS_CONFIG } from '../../types/decision-status';
import { CheckCircle, AlertTriangle, XCircle, ArrowRight, Lightbulb } from 'lucide-react';
import { getMethodLabel } from '../../utils/decision-status-calculator';

interface DecisionStatusPanelProps {
  statusInfo: DecisionStatusInfo;
  onStartResearch?: () => void;
  compact?: boolean;
}

/**
 * DecisionStatusPanel
 * 
 * Comprehensive decision quality display for detail pages.
 * Shows status, coverage, risks, and actionable next steps.
 * 
 * Design rationale:
 * - Prominent placement on detail pages to prevent uninformed decisions
 * - Clear microcopy explaining what each status means
 * - Actionable next steps reduce user confusion
 * - Progress visualization shows how close to "safe" status
 * - Educational approach builds research literacy
 */
export function DecisionStatusPanel({ 
  statusInfo, 
  onStartResearch,
  compact = false 
}: DecisionStatusPanelProps) {
  const config = DECISION_STATUS_CONFIG[statusInfo.status];
  
  const Icon = statusInfo.status === 'safe-to-decide' 
    ? CheckCircle 
    : statusInfo.status === 'decision-at-risk' 
    ? AlertTriangle 
    : XCircle;
  
  if (compact) {
    return (
      <Card className={`border-2 ${config.borderColor} ${config.bgColor}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{config.label}</h4>
                <Badge variant="outline" className="text-xs">
                  {statusInfo.coverage}% coverage
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`border-2 ${config.borderColor}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-xl ${config.bgColor} border ${config.borderColor}`}>
              <Icon className={`w-6 h-6 ${config.color}`} />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 mb-1">
                Decision Quality Status
              </CardTitle>
              <CardDescription>
                Research validation level for strategic decisions
              </CardDescription>
            </div>
          </div>
          <Badge className={`${config.bgColor} ${config.color} ${config.borderColor} border text-sm px-3 py-1`}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Coverage Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Research Coverage</span>
            <span className="text-sm font-semibold">{statusInfo.coverage}%</span>
          </div>
          <Progress 
            value={statusInfo.coverage} 
            className="h-3"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {statusInfo.completedMethods.length} of {statusInfo.completedMethods.length + statusInfo.missingTopMethods.length}+ methods completed
          </p>
        </div>
        
        {/* What this means */}
        <div className={`p-4 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            What this means
          </h4>
          <p className="text-sm mb-3">{config.description}</p>
          <p className="text-sm font-medium mb-1">Risk Level:</p>
          <p className="text-sm text-muted-foreground">{statusInfo.risk}</p>
        </div>
        
        {/* Completed Methods */}
        {statusInfo.completedMethods.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">✓ Completed Research</h4>
            <div className="flex flex-wrap gap-2">
              {statusInfo.completedMethods.map((method) => (
                <Badge key={method} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {getMethodLabel(method)}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Missing Methods */}
        {statusInfo.missingTopMethods.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">⚠ Priority Research Needed</h4>
            <div className="flex flex-wrap gap-2">
              {statusInfo.missingTopMethods.map((method) => (
                <Badge key={method} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  {getMethodLabel(method)}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              These high-value methods provide critical strategic insights
            </p>
          </div>
        )}
        
        {/* Next Steps */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Recommended Next Steps</h4>
          <div className="space-y-2">
            {statusInfo.nextSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-primary font-semibold mt-0.5">{idx + 1}.</span>
                <span className="text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Action Button */}
        {statusInfo.status !== 'safe-to-decide' && onStartResearch && (
          <Button onClick={onStartResearch} className="w-full gap-2">
            Start Required Research
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
