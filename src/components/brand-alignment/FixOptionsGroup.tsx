import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import type { FixOption } from '@/types/brand-alignment';
import { FixOptionCard } from './FixOptionCard';

interface FixOptionsGroupProps {
  options: FixOption[];
  selectedKey: 'A' | 'B' | 'C' | null;
  onSelect: (key: 'A' | 'B' | 'C') => void;
}

export function FixOptionsGroup({ options, selectedKey, onSelect }: FixOptionsGroupProps) {
  const { t } = useTranslation('brand-alignment');
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-green-600" />
        <span className="text-sm font-semibold text-gray-900">{t('fixOptions.aiSuggestedFix')}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{t('fixOptions.chooseApproach')}</p>
      <div data-testid="fix-options-group" className="space-y-3">
        {options.map((option) => (
          <FixOptionCard
            key={option.key}
            option={option}
            isSelected={selectedKey === option.key}
            onSelect={() => onSelect(option.key)}
          />
        ))}
      </div>
    </div>
  );
}
