/**
 * Campaign Impact Notification
 * 
 * Subtiele melding voor lopende campagnes dat er nieuwere strategische input beschikbaar is.
 * Biedt optie om te herberekenen, maar doet NOOIT automatisch updates.
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

  // Groepeer per asset
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
              Nieuwere strategische input beschikbaar
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
                Het asset <span className="font-medium">{uniqueAssets[0]}</span> is geüpdatet 
                met nieuw onderzoek sinds deze campagne is geconfigureerd.
              </>
            ) : (
              <>
                Er zijn {uniqueAssets.length} assets geüpdatet met nieuw onderzoek sinds deze 
                campagne is geconfigureerd.
              </>
            )}
          </p>

          {/* Lijst van updates */}
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
                +{impactAnalyses.length - 3} meer wijziging(en)
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
                Herberekenen met nieuwe input
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="text-sm text-slate-600 hover:text-slate-700"
            >
              Later bekijken
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compacte versie voor in de configure stap
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
        {impactCount} asset{impactCount > 1 ? 's hebben' : ' heeft'} nieuwe strategische input
      </p>
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
        >
          Bekijk details
        </button>
      )}
    </div>
  );
}
