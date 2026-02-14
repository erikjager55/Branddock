import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { DecisionStatusInfo, DECISION_STATUS_CONFIG } from '../../types/decision-status';
import { AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';
import { Badge } from '../ui/badge';

interface DecisionWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  statusInfo: DecisionStatusInfo;
  actionName: string;
  itemName: string;
}

/**
 * DecisionWarningModal
 * 
 * Critical intervention when user attempts strategic actions
 * without sufficient research backing.
 * 
 * Design rationale:
 * - Only shows for 'decision-at-risk' and 'blocked' statuses
 * - Clear explanation of risks prevents uninformed decisions
 * - Allows override for 'at-risk' but blocks 'blocked' status
 * - Educational microcopy builds decision quality awareness
 * - Reduces support burden by preventing bad outcomes
 */
export function DecisionWarningModal({
  isOpen,
  onClose,
  onProceed,
  statusInfo,
  actionName,
  itemName
}: DecisionWarningModalProps) {
  const config = DECISION_STATUS_CONFIG[statusInfo.status];
  const isBlocked = statusInfo.status === 'blocked';
  
  const Icon = isBlocked ? XCircle : AlertTriangle;
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-start gap-4 mb-2">
            <div className={`p-3 rounded-xl ${config.bgColor} border ${config.borderColor}`}>
              <Icon className={`w-6 h-6 ${config.color}`} />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-xl mb-2">
                {isBlocked ? 'Action Blocked' : 'Proceed with Caution'}
              </AlertDialogTitle>
              <Badge className={`${config.bgColor} ${config.color} ${config.borderColor} border`}>
                {config.label} • {statusInfo.coverage}% coverage
              </Badge>
            </div>
          </div>
          
          <AlertDialogDescription className="space-y-4 pt-4">
            <div>
              <p className="font-semibold text-foreground mb-1">
                {isBlocked 
                  ? `Cannot ${actionName} "${itemName}" yet`
                  : `Warning: Attempting to ${actionName} "${itemName}"`
                }
              </p>
              <p className="text-muted-foreground">
                {config.description}
              </p>
            </div>
            
            {/* Risk Explanation */}
            <div className={`p-4 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
              <div className="flex items-start gap-2 mb-2">
                <ShieldAlert className={`w-5 h-5 ${config.color} mt-0.5`} />
                <h4 className="font-semibold">Why this matters</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {statusInfo.risk}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {isBlocked 
                  ? 'Strategic decisions made without proper research often lead to ineffective campaigns, wasted resources, and missed opportunities.'
                  : 'Proceeding now may result in strategies that miss critical insights or fail to resonate with your target audience.'
                }
              </p>
            </div>
            
            {/* What's Missing */}
            <div>
              <h4 className="font-semibold mb-2">Required for better decision quality:</h4>
              <ul className="space-y-2">
                {statusInfo.nextSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-primary font-semibold mt-0.5">{idx + 1}.</span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Recommendation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-1">
                💡 Recommendation
              </p>
              <p className="text-sm text-blue-700">
                {statusInfo.recommendation}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel>
            {isBlocked ? 'Go Back' : 'Cancel'}
          </AlertDialogCancel>
          {!isBlocked && (
            <AlertDialogAction 
              onClick={onProceed}
              className="bg-amber-600 hover:bg-amber-700"
            >
              I Understand the Risks - Proceed Anyway
            </AlertDialogAction>
          )}
          {isBlocked && (
            <AlertDialogAction onClick={onClose}>
              Start Research
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
