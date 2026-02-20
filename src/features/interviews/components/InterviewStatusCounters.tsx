'use client';

import { Badge } from '@/components/shared';
import type { InterviewStats } from '../types/interview.types';

interface InterviewStatusCountersProps {
  stats: InterviewStats;
}

export function InterviewStatusCounters({ stats }: InterviewStatusCountersProps) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <Badge variant="default">{stats.toSchedule} To Schedule</Badge>
      <Badge variant="info">{stats.scheduled} Scheduled</Badge>
      <Badge variant="success">{stats.completed} Completed</Badge>
      <Badge variant="teal">{stats.inReview} In Review</Badge>
    </div>
  );
}
