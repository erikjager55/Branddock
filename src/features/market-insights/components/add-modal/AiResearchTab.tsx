'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/shared';
import { useStartAiResearch } from '../../hooks';
import { useMarketInsightsStore } from '../../stores/useMarketInsightsStore';
import { FocusAreasCheckboxes } from './FocusAreasCheckboxes';
import { TimeframeRadioCards } from './TimeframeRadioCards';
import { BrandContextToggle } from './BrandContextToggle';

export function AiResearchTab() {
  const setAddModalOpen = useMarketInsightsStore((s) => s.setAddModalOpen);
  const startResearch = useStartAiResearch();

  const [prompt, setPrompt] = useState('');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [industries, setIndustries] = useState('');
  const [timeframeFocus, setTimeframeFocus] = useState<'short-term' | 'all' | 'long-term'>('all');
  const [numberOfInsights, setNumberOfInsights] = useState(5);
  const [useBrandContext, setUseBrandContext] = useState(false);

  const handleSubmit = () => {
    if (!prompt.trim()) return;

    const industryList = industries
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    startResearch.mutateAsync({
      prompt: prompt.trim(),
      focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
      industries: industryList.length > 0 ? industryList : undefined,
      timeframeFocus,
      numberOfInsights,
      useBrandContext,
    }).then(() => {
      setAddModalOpen(false);
    });
  };

  return (
    <div data-testid="ai-research-tab" className="space-y-5">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-5 flex items-start gap-4">
        <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg flex-shrink-0">
          <Sparkles className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">AI-Powered Research</h3>
          <p className="text-sm text-gray-600 mt-0.5">
            Let AI discover relevant market insights for your brand
          </p>
        </div>
      </div>

      {/* Prompt */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          What should AI research? <span className="text-red-500">*</span>
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. What are the latest trends in AI-powered personalization for B2B SaaS?"
          maxLength={500}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">{prompt.length}/500</p>
      </div>

      {/* Focus Areas */}
      <FocusAreasCheckboxes selected={focusAreas} onChange={setFocusAreas} />

      {/* Industry context */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Industry Context</label>
        <input
          type="text"
          value={industries}
          onChange={(e) => setIndustries(e.target.value)}
          placeholder="e.g. SaaS, E-commerce, FinTech (comma-separated)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
        />
      </div>

      {/* Timeframe */}
      <TimeframeRadioCards value={timeframeFocus} onChange={setTimeframeFocus} />

      {/* Number of insights */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Number of Insights</label>
          <span className="text-sm font-semibold text-green-600">{numberOfInsights}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={numberOfInsights}
          onChange={(e) => setNumberOfInsights(Number(e.target.value))}
          className="w-full accent-green-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      {/* Brand context */}
      <BrandContextToggle checked={useBrandContext} onChange={setUseBrandContext} />

      {/* Submit */}
      <Button
        icon={Sparkles}
        onClick={handleSubmit}
        isLoading={startResearch.isPending}
        disabled={!prompt.trim()}
        fullWidth
      >
        Start Research
      </Button>
    </div>
  );
}
