'use client';

import { useState } from 'react';
import { Button, Modal, Input } from '@/components/shared';
import { useAddMilestone } from '../../hooks';
import type { MilestoneStatus } from '../../types/business-strategy.types';

interface AddMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyId: string;
}

function calcQuarter(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth(); // 0-11
  const q = Math.floor(month / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

const STATUS_OPTIONS: { value: MilestoneStatus; label: string }[] = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'DONE', label: 'Done' },
  { value: 'FUTURE', label: 'Future' },
];

export function AddMilestoneModal({ isOpen, onClose, strategyId }: AddMilestoneModalProps) {
  const addMilestone = useAddMilestone(strategyId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<MilestoneStatus>('UPCOMING');

  const quarter = date ? calcQuarter(date) : '';

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setStatus('UPCOMING');
  };

  const handleSubmit = () => {
    if (!title.trim() || !date) return;

    addMilestone.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        quarter,
        status,
      },
      {
        onSuccess: () => {
          resetForm();
          onClose();
        },
      },
    );
  };

  const isValid = title.trim().length > 0 && date !== '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Milestone">
      <div className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Series A Secured"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
        </div>

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {quarter && (
          <p className="text-sm text-gray-500">
            Quarter: <span className="font-medium text-gray-700">{quarter}</span>
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant="cta"
          onClick={handleSubmit}
          isLoading={addMilestone.isPending}
          disabled={!isValid}
        >
          Add Milestone
        </Button>
      </div>
    </Modal>
  );
}
