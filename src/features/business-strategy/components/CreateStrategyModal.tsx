'use client';

import { useState } from 'react';
import {
  TrendingUp,
  Globe,
  Rocket,
  Award,
  Settings,
  Puzzle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, Modal, Input } from '@/components/shared';
import { useCreateStrategy } from '../hooks';
import { useBusinessStrategyStore } from '../stores/useBusinessStrategyStore';
import type { StrategyType } from '../types/business-strategy.types';

// ─── Strategy type options ────────────────────────────────
const STRATEGY_TYPE_OPTIONS: {
  key: StrategyType;
  icon: LucideIcon;
  label: string;
  description: string;
}[] = [
  { key: 'GROWTH', icon: TrendingUp, label: 'Growth', description: 'Scale revenue and market share' },
  { key: 'MARKET_ENTRY', icon: Globe, label: 'Market Entry', description: 'Enter new markets or segments' },
  { key: 'PRODUCT_LAUNCH', icon: Rocket, label: 'Product Launch', description: 'Launch new products or features' },
  { key: 'BRAND_BUILDING', icon: Award, label: 'Brand Building', description: 'Build brand awareness and authority' },
  { key: 'OPERATIONAL_EXCELLENCE', icon: Settings, label: 'Operational Excellence', description: 'Improve efficiency and processes' },
  { key: 'CUSTOM', icon: Puzzle, label: 'Custom', description: 'Define your own strategy type' },
];

interface CreateStrategyModalProps {
  onNavigateToDetail?: (strategyId: string) => void;
}

export function CreateStrategyModal({ onNavigateToDetail }: CreateStrategyModalProps) {
  const { isCreateModalOpen, setCreateModalOpen } = useBusinessStrategyStore();
  const createStrategy = useCreateStrategy();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<StrategyType>('GROWTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [focusAreasText, setFocusAreasText] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setType('GROWTH');
    setStartDate('');
    setEndDate('');
    setFocusAreasText('');
  };

  const handleClose = () => {
    setCreateModalOpen(false);
    resetForm();
  };

  const handleSubmit = () => {
    if (!name.trim() || !description.trim()) return;

    const focusAreas = focusAreasText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    createStrategy.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        type,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
      },
      {
        onSuccess: (data) => {
          handleClose();
          if (data?.strategy?.id) {
            onNavigateToDetail?.(data.strategy.id);
          }
        },
      },
    );
  };

  const isValid = name.trim().length > 0 && description.trim().length > 0;

  return (
    <Modal
      isOpen={isCreateModalOpen}
      onClose={handleClose}
      title="Create Strategy"
      subtitle="Define a new business strategy for your brand"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            data-testid="create-strategy-submit"
            variant="cta"
            onClick={handleSubmit}
            disabled={!isValid || createStrategy.isPending}
            isLoading={createStrategy.isPending}
          >
            Create Strategy
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Name */}
        <Input
          label="Strategy Name"
          data-testid="strategy-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Q1 Growth Strategy"
          maxLength={200}
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            data-testid="strategy-description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the goals and scope of this strategy..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
        </div>

        {/* Strategy Type — 2x3 grid */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Strategy Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STRATEGY_TYPE_OPTIONS.map((opt) => {
              const isSelected = type === opt.key;
              return (
                <button
                  key={opt.key}
                  data-testid={`strategy-type-${opt.key}`}
                  type="button"
                  onClick={() => setType(opt.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-center transition-colors ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <opt.icon
                    className={`w-5 h-5 ${
                      isSelected ? 'text-emerald-600' : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      isSelected ? 'text-emerald-700' : 'text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-gray-500 leading-tight">
                    {opt.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Focus Areas */}
        <Input
          label="Focus Areas (optional)"
          value={focusAreasText}
          onChange={(e) => setFocusAreasText(e.target.value)}
          placeholder="Revenue Growth, Customer Acquisition, Brand Awareness"
        />
        <p className="text-xs text-gray-500 -mt-3">
          Separate multiple focus areas with commas
        </p>
      </div>
    </Modal>
  );
}
