'use client';

import { useTranslation } from 'react-i18next';
import { Mail, Send, CheckCircle2, Eye, MousePointerClick, AlertTriangle, AlertOctagon } from 'lucide-react';
import { useCampaignSendStatus } from '../../hooks/campaign-send.hooks';
import type { LucideIcon } from 'lucide-react';

interface CampaignSendStatsProps {
  campaignId: string;
  deliverableId: string;
}

interface StatTileProps {
  label: string;
  value: number;
  total?: number;
  icon: LucideIcon;
  tone: 'gray' | 'emerald' | 'blue' | 'violet' | 'amber' | 'red';
}

const TONE_CLASSES: Record<StatTileProps['tone'], string> = {
  gray: 'bg-gray-50 text-gray-700 border-gray-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
};

function StatTile({ label, value, total, icon: Icon, tone }: StatTileProps) {
  const pct = total && total > 0 ? Math.round((value / total) * 100) : null;
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${TONE_CLASSES[tone]}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        {pct !== null && <span className="text-xs opacity-70">{pct}%</span>}
      </div>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  QUEUED: 'bg-blue-100 text-blue-700',
  SENDING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

export function CampaignSendStats({ campaignId, deliverableId }: CampaignSendStatsProps) {
  const { t } = useTranslation('campaigns-canvas');
  const { data: send, isLoading } = useCampaignSendStatus(campaignId, deliverableId);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        {t('sendStats.loading')}
      </div>
    );
  }

  if (!send) return null;

  const startedAt = send.startedAt ? new Date(send.startedAt) : null;
  const completedAt = send.completedAt ? new Date(send.completedAt) : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">{t('sendStats.title')}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_TONE[send.status] ?? 'bg-gray-100 text-gray-700'}`}>
            {t(`sendStats.status.${send.status}`, { defaultValue: send.status })}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {startedAt && (
            <>
              {t('sendStats.sentAt', { time: startedAt.toLocaleString() })}
              {completedAt && completedAt.getTime() !== startedAt.getTime() && (
                <>
                  {t('sendStats.took', { seconds: Math.max(1, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)) })}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <StatTile label={t('sendStats.recipients')} value={send.recipientCount} icon={Mail} tone="gray" />
        <StatTile label={t('sendStats.delivered')} value={send.deliveredCount} total={send.recipientCount} icon={CheckCircle2} tone="emerald" />
        <StatTile label={t('sendStats.opened')} value={send.openedCount} total={send.recipientCount} icon={Eye} tone="blue" />
        <StatTile label={t('sendStats.clicked')} value={send.clickedCount} total={send.recipientCount} icon={MousePointerClick} tone="violet" />
        <StatTile label={t('sendStats.bounced')} value={send.bouncedCount} total={send.recipientCount} icon={AlertTriangle} tone="amber" />
        <StatTile label={t('sendStats.failed')} value={send.failedCount} total={send.recipientCount} icon={AlertOctagon} tone="red" />
      </div>

      {send.errorMessage && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {send.errorMessage}
        </div>
      )}
    </div>
  );
}
