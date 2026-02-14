/**
 * Impact Summary Component
 * 
 * Toont een korte, rustige samenvatting van wat een wijziging betekent voor beslissingen.
 * Subtiel, coachend, en zonder alarm.
 */

import React, { useState } from 'react';
import { Info, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { ImpactAnalysis } from '../../types/change-impact';
import { ChangeImpactService } from '../../services/ChangeImpactService';
import { cn } from '../../lib/utils';

interface ImpactSummaryProps {
  impactAnalysis: ImpactAnalysis;
  compact?: boolean;
  className?: string;
}

export function ImpactSummary({ 
  impactAnalysis, 
  compact = false,
  className 
}: ImpactSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const { decisionImpact } = impactAnalysis;

  // Bepaal icoon en kleur op basis van impact level
  const getImpactDisplay = () => {
    if (decisionImpact.impactLevel === 'none') {
      return {
        icon: Info,
        colorClass: 'text-slate-500 bg-slate-50',
        borderClass: 'border-slate-200',
      };
    }

    if (decisionImpact.impactLevel === 'high' && decisionImpact.newStatus === 'safe') {
      return {
        icon: CheckCircle2,
        colorClass: 'text-emerald-600 bg-emerald-50',
        borderClass: 'border-emerald-200',
      };
    }

    if (decisionImpact.impactLevel === 'high') {
      return {
        icon: AlertCircle,
        colorClass: 'text-amber-600 bg-amber-50',
        borderClass: 'border-amber-200',
      };
    }

    return {
      icon: Info,
      colorClass: 'text-blue-600 bg-blue-50',
      borderClass: 'border-blue-200',
    };
  };

  const display = getImpactDisplay();
  const Icon = display.icon;

  const shortSummary = ChangeImpactService.formatShortSummary(impactAnalysis);
  const detailedSummary = ChangeImpactService.formatDetailedSummary(impactAnalysis);

  if (compact) {
    return (
      <div className={cn(
        'flex items-start gap-2 p-3 rounded-lg border',
        display.colorClass,
        display.borderClass,
        className
      )}>
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p className="text-sm flex-1">{shortSummary}</p>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden',
      display.borderClass,
      className
    )}>
      {/* Header - altijd zichtbaar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-start gap-3 p-4 text-left transition-colors',
          display.colorClass,
          'hover:opacity-90'
        )}
      >
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Wat betekent deze wijziging?</p>
          <p className="text-sm mt-1 opacity-90">{shortSummary}</p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 flex-shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 flex-shrink-0 mt-1" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="bg-white p-4 border-t space-y-3">
          {detailedSummary.sections.map((section, idx) => (
            <div key={idx}>
              <p className="text-xs font-medium text-slate-600 mb-1">
                {section.label}
              </p>
              <p className="text-sm text-slate-700">
                {section.content}
              </p>
            </div>
          ))}

          <div className="pt-2 border-t">
            <p className="text-xs text-slate-500">
              {new Date(impactAnalysis.analyzedAt).toLocaleString('nl-NL', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Lijst van impact summaries
 */
interface ImpactSummaryListProps {
  impactAnalyses: ImpactAnalysis[];
  maxVisible?: number;
  className?: string;
}

export function ImpactSummaryList({ 
  impactAnalyses, 
  maxVisible = 3,
  className 
}: ImpactSummaryListProps) {
  const [showAll, setShowAll] = useState(false);

  if (impactAnalyses.length === 0) {
    return null;
  }

  const visible = showAll ? impactAnalyses : impactAnalyses.slice(0, maxVisible);
  const hasMore = impactAnalyses.length > maxVisible;

  return (
    <div className={cn('space-y-2', className)}>
      {visible.map((analysis, idx) => (
        <ImpactSummary 
          key={analysis.change.id} 
          impactAnalysis={analysis}
          compact
        />
      ))}

      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Toon {impactAnalyses.length - maxVisible} meer wijziging(en)
        </button>
      )}

      {showAll && (
        <button
          onClick={() => setShowAll(false)}
          className="text-sm text-slate-600 hover:text-slate-700 font-medium"
        >
          Toon minder
        </button>
      )}
    </div>
  );
}
