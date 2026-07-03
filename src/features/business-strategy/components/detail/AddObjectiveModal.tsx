'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, Input } from '@/components/shared';
import { useAddObjective } from '../../hooks';
import type { FocusAreaDetail, Priority, MetricType } from '../../types/business-strategy.types';

interface AddObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyId: string;
  focusAreas: FocusAreaDetail[];
}

const PRIORITY_VALUES: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

const METRIC_TYPE_VALUES: MetricType[] = ['PERCENTAGE', 'NUMBER', 'CURRENCY'];

export function AddObjectiveModal({ isOpen, onClose, strategyId, focusAreas }: AddObjectiveModalProps) {
  const { t } = useTranslation('business-strategy');
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
    <Modal isOpen={isOpen} onClose={onClose} title={t('objective.add')} size="lg">
      <div className="space-y-4">
        {/* Title */}
        <Input
          label={t('fields.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('objective.titlePlaceholder')}
          maxLength={200}
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.description')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('fields.optionalDescription')}
            maxLength={1000}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
        </div>

        {/* Focus Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('objective.focusArea')}</label>
          <select
            value={focusAreaId}
            onChange={(e) => setFocusAreaId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">{t('objective.focusAreaNone')}</option>
            {focusAreas.map((fa) => (
              <option key={fa.id} value={fa.id}>{fa.name}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('objective.priority')}</label>
          <div className="flex gap-2">
            {PRIORITY_VALUES.map((value) => (
              <button
                key={value}
                onClick={() => setPriority(value)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  priority === value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t(`objective.priorities.${value}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('objective.metricType')}</label>
          <div className="flex gap-2">
            {METRIC_TYPE_VALUES.map((value) => (
              <button
                key={value}
                onClick={() => setMetricType(value)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  metricType === value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t(`objective.metricTypes.${value}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Start + Target Value */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('objective.startValue')}
            type="number"
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
          />
          <Input
            label={t('objective.targetValue')}
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={t('objective.required')}
          />
        </div>

        {/* Key Results */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('objective.keyResults')}</label>
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
                  placeholder={t('objective.keyResultPlaceholder')}
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
                <Plus className="w-3.5 h-3.5" /> {t('objective.addKeyResult')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 mt-6">
        <Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button>
        <Button
          variant="cta"
          onClick={handleSubmit}
          isLoading={addObjective.isPending}
          disabled={!isValid}
        >
          {t('objective.add')}
        </Button>
      </div>
    </Modal>
  );
}
