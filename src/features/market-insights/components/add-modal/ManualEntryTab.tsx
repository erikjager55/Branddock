'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@/components/shared';
import { useCreateInsight } from '../../hooks';
import { useMarketInsightsStore } from '../../stores/useMarketInsightsStore';
import { RelevanceSlider } from './RelevanceSlider';
import type { InsightCategory, InsightScope, ImpactLevel, InsightTimeframe } from '../../types/market-insight.types';

export function ManualEntryTab() {
  const setAddModalOpen = useMarketInsightsStore((s) => s.setAddModalOpen);
  const createInsight = useCreateInsight();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<InsightCategory | ''>('');
  const [description, setDescription] = useState('');
  const [impactLevel, setImpactLevel] = useState<ImpactLevel | ''>('');
  const [timeframe, setTimeframe] = useState<InsightTimeframe | ''>('');
  const [scope, setScope] = useState<InsightScope | ''>('');
  const [industries, setIndustries] = useState('');
  const [tags, setTags] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [relevanceScore, setRelevanceScore] = useState(75);

  const handleSubmit = () => {
    if (!title.trim() || !category) return;

    const industryList = industries.split(',').map((s) => s.trim()).filter(Boolean);
    const tagList = tags.split(',').map((s) => s.trim()).filter(Boolean);

    createInsight.mutateAsync({
      title: title.trim(),
      category: category as InsightCategory,
      description: description.trim() || undefined,
      impactLevel: impactLevel || undefined,
      timeframe: timeframe || undefined,
      scope: scope || undefined,
      industries: industryList.length > 0 ? industryList : undefined,
      tags: tagList.length > 0 ? tagList : undefined,
      relevanceScore,
      sourceUrls: sourceUrl.trim() ? [{ name: 'Source', url: sourceUrl.trim() }] : undefined,
    }).then(() => {
      setAddModalOpen(false);
    });
  };

  return (
    <div data-testid="manual-entry-tab" className="space-y-4">
      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter insight title"
        required
      />

      <Select
        label="Category"
        value={category}
        onChange={(val) => setCategory(val as InsightCategory | '')}
        placeholder="Select category"
        options={[
          { value: 'TECHNOLOGY', label: 'Technology' },
          { value: 'ENVIRONMENTAL', label: 'Environmental' },
          { value: 'SOCIAL', label: 'Social' },
          { value: 'CONSUMER', label: 'Consumer' },
          { value: 'BUSINESS', label: 'Business' },
        ]}
      />

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the market insight..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Select
          label="Impact Level"
          value={impactLevel}
          onChange={(val) => setImpactLevel(val as ImpactLevel | '')}
          placeholder="Select"
          allowClear
          options={[
            { value: 'HIGH', label: 'High' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'LOW', label: 'Low' },
          ]}
        />
        <Select
          label="Timeframe"
          value={timeframe}
          onChange={(val) => setTimeframe(val as InsightTimeframe | '')}
          placeholder="Select"
          allowClear
          options={[
            { value: 'SHORT_TERM', label: 'Short-Term' },
            { value: 'MEDIUM_TERM', label: 'Medium-Term' },
            { value: 'LONG_TERM', label: 'Long-Term' },
          ]}
        />
        <Select
          label="Scope"
          value={scope}
          onChange={(val) => setScope(val as InsightScope | '')}
          placeholder="Select"
          allowClear
          options={[
            { value: 'MICRO', label: 'Micro' },
            { value: 'MESO', label: 'Meso' },
            { value: 'MACRO', label: 'Macro' },
          ]}
        />
      </div>

      <Input
        label="Industries"
        value={industries}
        onChange={(e) => setIndustries(e.target.value)}
        placeholder="e.g. SaaS, E-commerce (comma-separated)"
      />

      <Input
        label="Tags"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="e.g. AI, Sustainability (comma-separated)"
      />

      <Input
        label="Source URL"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        placeholder="https://example.com/report"
      />

      <RelevanceSlider value={relevanceScore} onChange={setRelevanceScore} />

      <Button
        data-testid="manual-insight-submit"
        onClick={handleSubmit}
        isLoading={createInsight.isPending}
        disabled={!title.trim() || !category}
        fullWidth
      >
        Add Insight
      </Button>
    </div>
  );
}
