/**
 * Decision Impact Panel
 * 
 * Shows impact of recent asset changes on decision status.
 * Part of the decision cockpit.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, AlertCircle } from 'lucide-react';
import { useChangeImpact } from '../../contexts/ChangeImpactContext';
import { ImpactSummaryList } from './ImpactSummary';
import { cn } from '../../lib/utils';

interface DecisionImpactPanelProps {
  className?: string;
}

export function DecisionImpactPanel({ className }: DecisionImpactPanelProps) {
  const { t } = useTranslation('versioning-impact');
  const { getNotifications, store } = useChangeImpact();

  // Get relevant impact analyses (last 5)
  const recentImpacts = store.impactAnalyses
    .filter(ia => ia.decisionImpact.impactLevel !== 'none')
    .slice(0, 5);

  // Get unread notifications
  const notifications = getNotifications('decision-status').filter(n => !n.seen);

  if (recentImpacts.length === 0 && notifications.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-slate-600" />
        <h3 className="font-medium text-slate-900">{t('impact.decision.title')}</h3>
        {notifications.length > 0 && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
            {t('impact.decision.newBadge', { count: notifications.length })}
          </span>
        )}
      </div>

      {/* Impact summaries */}
      {recentImpacts.length > 0 ? (
        <ImpactSummaryList impactAnalyses={recentImpacts} maxVisible={3} />
      ) : (
        <div className="flex items-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-slate-400" />
          <p className="text-sm text-slate-600">
            {t('impact.decision.empty')}
          </p>
        </div>
      )}
    </div>
  );
}
