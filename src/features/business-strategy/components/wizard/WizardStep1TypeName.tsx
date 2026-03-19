'use client';

import {
  TrendingUp,
  Globe,
  Rocket,
  Award,
  Settings,
  Puzzle,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/components/shared';
import type { StrategyType, InitialObjective } from '../../types/business-strategy.types';
import { STRATEGY_TEMPLATES } from '../../constants/strategy-templates';

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

interface WizardStep1Props {
  name: string;
  description: string;
  type: StrategyType;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTypeChange: (value: StrategyType) => void;
  onApplyTemplate?: (template: {
    name: string;
    description: string;
    type: StrategyType;
    vision: string;
    focusAreas: string[];
    objectives: InitialObjective[];
  }) => void;
}

export function WizardStep1TypeName({
  name,
  description,
  type,
  onNameChange,
  onDescriptionChange,
  onTypeChange,
  onApplyTemplate,
}: WizardStep1Props) {
  return (
    <div className="space-y-5">
      {/* Start from template */}
      {onApplyTemplate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Start from Template
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STRATEGY_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() =>
                  onApplyTemplate({
                    name: tmpl.name,
                    description: tmpl.strategyDescription,
                    type: tmpl.type,
                    vision: tmpl.vision,
                    focusAreas: tmpl.focusAreas,
                    objectives: tmpl.objectives,
                  })
                }
                className="flex-shrink-0 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-left"
              >
                <span className="font-medium block">{tmpl.label}</span>
                <span className="text-gray-500 block mt-0.5">{tmpl.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
                onClick={() => onTypeChange(opt.key)}
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

      {/* Name */}
      <Input
        label="Strategy Name"
        data-testid="strategy-name-input"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
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
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe the goals and scope of this strategy..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
        />
      </div>
    </div>
  );
}
