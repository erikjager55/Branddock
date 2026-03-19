'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/shared';

interface WizardStep2Props {
  startDate: string;
  endDate: string;
  focusAreas: string[];
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onFocusAreasChange: (value: string[]) => void;
}

export function WizardStep2Timeline({
  startDate,
  endDate,
  focusAreas,
  onStartDateChange,
  onEndDateChange,
  onFocusAreasChange,
}: WizardStep2Props) {
  const [inputValue, setInputValue] = useState('');

  const handleAddFocusArea = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (focusAreas.includes(trimmed)) {
      setInputValue('');
      return;
    }
    onFocusAreasChange([...focusAreas, trimmed]);
    setInputValue('');
  };

  const handleRemoveFocusArea = (index: number) => {
    onFocusAreasChange(focusAreas.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFocusArea();
    }
  };

  return (
    <div className="space-y-5">
      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
        <Input
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </div>

      {/* Focus Areas as tag chips */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Focus Areas
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Add the key areas this strategy will focus on
        </p>

        {/* Tag chips */}
        {focusAreas.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {focusAreas.map((area, idx) => (
              <span
                key={`${area}-${idx}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium"
              >
                {area}
                <button
                  type="button"
                  onClick={() => handleRemoveFocusArea(idx)}
                  className="p-0.5 hover:bg-emerald-100 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input + Add button */}
        <div className="flex gap-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Revenue Growth, Customer Acquisition..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={handleAddFocusArea}
            disabled={!inputValue.trim()}
            className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
