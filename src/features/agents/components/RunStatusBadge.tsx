'use client';

import React from 'react';
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Clock, BellRing } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AgentRunStatusValue } from '../types/agents.types';

const STATUS_STYLES: Record<AgentRunStatusValue, string> = {
  QUEUED: 'bg-gray-100 text-gray-600 border-gray-200',
  RUNNING: 'bg-blue-50 text-blue-700 border-blue-200',
  AWAITING_CONFIRMATION: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
};

const STALE_STYLE = 'bg-amber-50 text-amber-700 border-amber-200';

/**
 * Status badge for an AgentRun. `stale` overrides RUNNING/QUEUED with a
 * "possibly stuck" presentation (never an endless spinner — task-eis
 * stale-RUNNING-heuristiek).
 */
export function RunStatusBadge({
  status,
  stale = false,
}: {
  status: AgentRunStatusValue;
  stale?: boolean;
}) {
  const { t } = useTranslation('agents');

  const isStale = stale && (status === 'RUNNING' || status === 'QUEUED');
  const label = isStale ? t('inbox.status.stale') : t(`inbox.status.${status}`);
  const style = isStale ? STALE_STYLE : STATUS_STYLES[status];

  const icon = (() => {
    if (isStale) return <AlertTriangle className="h-3 w-3" />;
    switch (status) {
      case 'QUEUED':
        return <Clock className="h-3 w-3" />;
      case 'RUNNING':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'AWAITING_CONFIRMATION':
        return <BellRing className="h-3 w-3" />;
      case 'COMPLETED':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'FAILED':
        return <XCircle className="h-3 w-3" />;
    }
  })();

  return (
    <span
      data-testid="run-status-badge"
      data-status={isStale ? 'STALE' : status}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${style}`}
    >
      {icon}
      {label}
    </span>
  );
}
