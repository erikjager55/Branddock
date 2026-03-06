/**
 * Campaign Impact Notification
 * 
 * Subtle notification for active campaigns that newer strategic input is available.
 * Offers option to recalculate, but NEVER performs automatic updates.
 */

import React, { useState } from 'react';
import { RefreshCw, Info, X } from 'lucide-react';
import { ImpactAnalysis } from '../../types/change-impact';
import { ChangeImpactService } from '../../services/ChangeImpactService';
import { cn } from '../../lib/utils';

interface CampaignImpactNotificationProps {
  impactAnalyses: ImpactAnalysis[];
  onRecalculate?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function CampaignImpactNotification({ 
  impactAnalyses,
  onRecalculate,
  onDismiss,
  className 
}: CampaignImpactNotificationProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || impactAnalyses.length === 0) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Group per asset
  const affectedAssets = impactAnalyses.map(ia => ia.change.assetTitle);
  const uniqueAssets = [...new Set(affectedAssets)];

  return (
    <div className={cn(
      'bg-blue-50 border border-blue-200 rounded-lg p-4',
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-medium text-slate-900">
              Newer strategic input available
            </h4>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-slate-700 mb-3">
            {uniqueAssets.length === 1 ? (
              <>
                The asset <span className="font-medium">{uniqueAssets[0]}</span> has been updated
                with new research since this campaign was configured.
              </>
            ) : (
              <>
                {uniqueAssets.length} assets have been updated with new research since this
                campaign was configured.
              </>
            )}
          </p>

          {/* List of updates */}
          <div className="space-y-1.5 mb-3">
            {impactAnalyses.slice(0, 3).map((analysis) => (
              <div 
                key={analysis.change.id}
                className="text-sm text-slate-600 flex items-start gap-2"
              >
                <span className="text-blue-600 mt-0.5">•</span>
                <span>{ChangeImpactService.formatShortSummary(analysis)}</span>
              </div>
            ))}
            {impactAnalyses.length > 3 && (
              <div className="text-sm text-slate-600 pl-4">
                +{impactAnalyses.length - 3} more change(s)
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onRecalculate && (
              <button
                onClick={onRecalculate}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recalculate with new input
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="text-sm text-slate-600 hover:text-slate-700"
            >
              Review later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for the configure step
 */
interface CompactCampaignImpactProps {
  impactCount: number;
  onViewDetails?: () => void;
  className?: string;
}

export function CompactCampaignImpact({ 
  impactCount,
  onViewDetails,
  className 
}: CompactCampaignImpactProps) {
  if (impactCount === 0) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg',
      className
    )}>
      <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
      <p className="text-sm text-slate-700 flex-1">
        {impactCount} asset{impactCount > 1 ? 's have' : ' has'} new strategic input
      </p>
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
        >
          View details
        </button>
      )}
    </div>
  );
}
