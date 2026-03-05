'use client';

import { useState } from 'react';
import { Modal, Button, Input, Select } from '@/components/shared';
import { useTrendRadarStore } from '../stores/useTrendRadarStore';
import { useCreateManualTrend } from '../hooks';
import { CATEGORY_COLORS, IMPACT_COLORS, SCOPE_LABELS, TIMEFRAME_LABELS } from '../constants/trend-radar-constants';
import type { InsightCategory, InsightScope, ImpactLevel, InsightTimeframe } from '../types/trend-radar.types';

export function AddManualTrendModal() {
  const { isAddManualTrendModalOpen, closeAddManualTrendModal } = useTrendRadarStore();
  const createMutation = useCreateManualTrend();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<InsightCategory>('TECHNOLOGY');
  const [scope, setScope] = useState<InsightScope>('MESO');
  const [impactLevel, setImpactLevel] = useState<ImpactLevel>('MEDIUM');
  const [timeframe, setTimeframe] = useState<InsightTimeframe>('MEDIUM_TERM');
  const [relevanceScore, setRelevanceScore] = useState(50);
  const [sourceUrl, setSourceUrl] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('TECHNOLOGY');
    setScope('MESO');
    setImpactLevel('MEDIUM');
    setTimeframe('MEDIUM_TERM');
    setRelevanceScore(50);
    setSourceUrl('');
  };

  const handleClose = () => {
    resetForm();
    closeAddManualTrendModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        scope,
        impactLevel,
        timeframe,
        relevanceScore,
        sourceUrl: sourceUrl.trim() || undefined,
      });
      handleClose();
    } catch {
      // Error handled by mutation state
    }
  };

  const categoryOptions = Object.entries(CATEGORY_COLORS).map(([value, config]) => ({
    value,
    label: config.label,
  }));

  const scopeOptions = Object.entries(SCOPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const impactOptions = Object.entries(IMPACT_COLORS).map(([value, config]) => ({
    value,
    label: config.label,
  }));

  const timeframeOptions = Object.entries(TIMEFRAME_LABELS).map(([value, config]) => ({
    value,
    label: config.label,
  }));

  return (
    <Modal
      isOpen={isAddManualTrendModalOpen}
      onClose={handleClose}
      title="Add Trend Manually"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. AI-powered personalization in retail"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this trend and its relevance..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Category"
            value={category}
            onChange={(v) => { if (v) setCategory(v as InsightCategory); }}
            options={categoryOptions}
          />
          <Select
            label="Impact Level"
            value={impactLevel}
            onChange={(v) => { if (v) setImpactLevel(v as ImpactLevel); }}
            options={impactOptions}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Scope"
            value={scope}
            onChange={(v) => { if (v) setScope(v as InsightScope); }}
            options={scopeOptions}
          />
          <Select
            label="Timeframe"
            value={timeframe}
            onChange={(v) => { if (v) setTimeframe(v as InsightTimeframe); }}
            options={timeframeOptions}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Relevance Score: {relevanceScore}
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={relevanceScore}
            onChange={(e) => setRelevanceScore(Number(e.target.value))}
            className="w-full accent-teal-600"
          />
          <div className="flex items-center justify-between text-xs text-gray-400 mt-0.5">
            <span>0</span>
            <span>100</span>
          </div>
        </div>

        <Input
          label="Source URL (optional)"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://example.com/article"
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={handleClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={createMutation.isPending}
          >
            Add Trend
          </Button>
        </div>
      </form>
    </Modal>
  );
}
