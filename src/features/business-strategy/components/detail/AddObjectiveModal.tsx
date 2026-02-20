'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Modal, Input } from '@/components/shared';
import { useAddObjective } from '../../hooks';
import type { FocusAreaDetail, Priority, MetricType } from '../../types/business-strategy.types';

interface AddObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyId: string;
  focusAreas: FocusAreaDetail[];
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const METRIC_TYPES: { value: MetricType; label: string }[] = [
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'CURRENCY', label: 'Currency' },
];

export function AddObjectiveModal({ isOpen, onClose, strategyId, focusAreas }: AddObjectiveModalProps) {
  const addObjective = useAddObjective(strategyId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [focusAreaId, setFocusAreaId] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [metricType, setMetricType] = useState<MetricType>('NUMBER');
  const [startValue, setStartValue] = useState('0');
  const [targetValue, setTargetValue] = useState('');
  const [keyResults, setKeyResults] = useState<string[]>([]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFocusAreaId('');
    setPriority('MEDIUM');
    setMetricType('NUMBER');
    setStartValue('0');
    setTargetValue('');
    setKeyResults([]);
  };

  const handleSubmit = () => {
    if (!title.trim() || !targetValue) return;

    addObjective.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        focusAreaId: focusAreaId || undefined,
        priority,
        metricType,
        startValue: parseFloat(startValue) || 0,
        targetValue: parseFloat(targetValue),
        keyResults: keyResults.filter(Boolean),
      },
      {
        onSuccess: () => {
          resetForm();
          onClose();
        },
      },
    );
  };

  const isValid = title.trim().length > 0 && targetValue !== '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Objective" size="lg">
      <div className="space-y-4">
        {/* Title */}
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Increase MRR to €50K"
          maxLength={200}
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            maxLength={1000}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
        </div>

        {/* Focus Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Focus Area</label>
          <select
            value={focusAreaId}
            onChange={(e) => setFocusAreaId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">None</option>
            {focusAreas.map((fa) => (
              <option key={fa.id} value={fa.id}>{fa.name}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  priority === p.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Metric Type</label>
          <div className="flex gap-2">
            {METRIC_TYPES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMetricType(m.value)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  metricType === m.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start + Target Value */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Value"
            type="number"
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
          />
          <Input
            label="Target Value"
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="Required"
          />
        </div>

        {/* Key Results */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Key Results</label>
          <div className="space-y-2">
            {keyResults.map((kr, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={kr}
                  onChange={(e) => {
                    const updated = [...keyResults];
                    updated[i] = e.target.value;
                    setKeyResults(updated);
                  }}
                  placeholder="Key result description..."
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  onClick={() => setKeyResults(keyResults.filter((_, j) => j !== i))}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {keyResults.length < 10 && (
              <button
                onClick={() => setKeyResults([...keyResults, ''])}
                className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add key result
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant="cta"
          onClick={handleSubmit}
          isLoading={addObjective.isPending}
          disabled={!isValid}
        >
          Add Objective
        </Button>
      </div>
    </Modal>
  );
}
