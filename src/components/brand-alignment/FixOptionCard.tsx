import React from 'react';
import type { FixOption } from '@/types/brand-alignment';

interface FixOptionCardProps {
  option: FixOption;
  isSelected: boolean;
  onSelect: () => void;
}

export function FixOptionCard({ option, isSelected, onSelect }: FixOptionCardProps) {
  return (
    <button
      type="button"
      data-testid={`fix-option-${option.key}`}
      onClick={onSelect}
      className={`w-full text-left border rounded-lg p-4 cursor-pointer transition-colors ${
        isSelected
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 accent-green-600 mt-0.5 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            Option {option.key}: {option.title}
          </p>
          <p className="text-sm text-gray-600 mb-2">{option.description}</p>
          {option.preview && (
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-600 italic">{option.preview}</p>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
