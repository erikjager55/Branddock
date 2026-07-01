'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Select } from '@/components/shared';
import type { Interview } from '../../types/interview.types';

const DURATION_VALUES = ['30', '45', '60', '90'] as const;

interface ScheduleStepProps {
  interview: Interview;
  onSave: (data: Record<string, unknown>) => void;
  isSaving: boolean;
}

export function ScheduleStep({ interview, onSave, isSaving }: ScheduleStepProps) {
  const { t } = useTranslation('interviews');
  const durationOptions = DURATION_VALUES.map((value) => ({
    value,
    label: t('schedule.durationOption', { count: Number(value) }),
  }));
  const [date, setDate] = useState(
    interview.scheduledDate
      ? new Date(interview.scheduledDate).toISOString().split('T')[0]
      : '',
  );
  const [time, setTime] = useState(interview.scheduledTime ?? '');
  const [duration, setDuration] = useState(String(interview.durationMinutes));

  const handleSave = () => {
    onSave({
      scheduledDate: date ? new Date(date).toISOString() : null,
      scheduledTime: time || null,
      durationMinutes: Number(duration),
      status: date && time ? 'SCHEDULED' : undefined,
      currentStep: 3,
    });
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('schedule.title')}</h2>
      <p className="text-sm text-gray-500 mb-6">
        {t('schedule.subtitle')}
      </p>

      <div className="space-y-4">
        <Input
          label={t('schedule.dateLabel')}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input
          label={t('schedule.timeLabel')}
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <Select
          label={t('schedule.durationLabel')}
          value={duration}
          onChange={(val) => setDuration(val ?? '60')}
          options={durationOptions}
        />
      </div>

      <div className="mt-6">
        <Button variant="cta" size="md" onClick={handleSave} isLoading={isSaving}>
          {t('schedule.save')}
        </Button>
      </div>
    </div>
  );
}
