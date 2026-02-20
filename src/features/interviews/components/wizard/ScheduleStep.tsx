'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@/components/shared';
import type { Interview } from '../../types/interview.types';

const DURATION_OPTIONS = [
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '60 minutes' },
  { value: '90', label: '90 minutes' },
];

interface ScheduleStepProps {
  interview: Interview;
  onSave: (data: Record<string, unknown>) => void;
  isSaving: boolean;
}

export function ScheduleStep({ interview, onSave, isSaving }: ScheduleStepProps) {
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
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Schedule Interview</h2>
      <p className="text-sm text-gray-500 mb-6">
        Set the date, time, and duration for this interview.
      </p>

      <div className="space-y-4">
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input
          label="Time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <Select
          label="Duration"
          value={duration}
          onChange={(val) => setDuration(val ?? '60')}
          options={DURATION_OPTIONS}
        />
      </div>

      <div className="mt-6">
        <Button variant="cta" size="md" onClick={handleSave} isLoading={isSaving}>
          Save Schedule
        </Button>
      </div>
    </div>
  );
}
