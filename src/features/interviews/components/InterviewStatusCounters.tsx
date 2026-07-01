'use client';

import { Badge } from '@/components/shared';
import { useTranslation } from 'react-i18next';
import type { InterviewStats } from '../types/interview.types';

interface InterviewStatusCountersProps {
  stats: InterviewStats;
}

export function InterviewStatusCounters({ stats }: InterviewStatusCountersProps) {
  const { t } = useTranslation('interviews');
  return (
    <div className="flex items-center gap-2 mb-6">
      <Badge variant="default">{t('counters.toSchedule', { count: stats.toSchedule })}</Badge>
      <Badge variant="info">{t('counters.scheduled', { count: stats.scheduled })}</Badge>
      <Badge variant="success">{t('counters.completed', { count: stats.completed })}</Badge>
      <Badge variant="teal">{t('counters.inReview', { count: stats.inReview })}</Badge>
    </div>
  );
}
