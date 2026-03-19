'use client';

import { useState } from 'react';
import { Shield, TrendingUp, AlertTriangle, Crosshair, Plus, X } from 'lucide-react';
import { Button } from '@/components/shared';
import { useUpdateSwot } from '../../hooks';

interface SwotSectionProps {
  strategyId: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  canEdit: boolean;
}

const QUADRANTS = [
  { key: 'strengths' as const, label: 'Strengths', icon: Shield, color: 'emerald', borderColor: 'border-emerald-200', bgColor: 'bg-emerald-50', tagBg: 'bg-emerald-100', tagText: 'text-emerald-700', iconColor: 'text-emerald-600' },
  { key: 'weaknesses' as const, label: 'Weaknesses', icon: AlertTriangle, color: 'red', borderColor: 'border-red-200', bgColor: 'bg-red-50', tagBg: 'bg-red-100', tagText: 'text-red-700', iconColor: 'text-red-500' },
  { key: 'opportunities' as const, label: 'Opportunities', icon: TrendingUp, color: 'blue', borderColor: 'border-blue-200', bgColor: 'bg-blue-50', tagBg: 'bg-blue-100', tagText: 'text-blue-700', iconColor: 'text-blue-600' },
  { key: 'threats' as const, label: 'Threats', icon: Crosshair, color: 'amber', borderColor: 'border-amber-200', bgColor: 'bg-amber-50', tagBg: 'bg-amber-100', tagText: 'text-amber-700', iconColor: 'text-amber-600' },
] as const;

export function SwotSection({
  strategyId,
  strengths,
  weaknesses,
  opportunities,
  threats,
  canEdit,
}: SwotSectionProps) {
  const updateSwot = useUpdateSwot(strategyId);

  const data = { strengths, weaknesses, opportunities, threats };

  const handleAdd = (quadrant: keyof typeof data, value: string) => {
    if (!value.trim()) return;
    updateSwot.mutate({ [quadrant]: [...data[quadrant], value.trim()] });
  };

  const handleRemove = (quadrant: keyof typeof data, index: number) => {
    updateSwot.mutate({ [quadrant]: data[quadrant].filter((_, i) => i !== index) });
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">SWOT Analysis</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUADRANTS.map((q) => (
          <QuadrantCard
            key={q.key}
            quadrant={q}
            items={data[q.key]}
            canEdit={canEdit && !updateSwot.isPending}
            onAdd={(value) => handleAdd(q.key, value)}
            onRemove={(index) => handleRemove(q.key, index)}
          />
        ))}
      </div>
    </div>
  );
}

function QuadrantCard({
  quadrant,
  items,
  canEdit,
  onAdd,
  onRemove,
}: {
  quadrant: typeof QUADRANTS[number];
  items: string[];
  canEdit: boolean;
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onAdd(inputValue);
      setInputValue('');
      setIsAdding(false);
    }
  };

  return (
    <div className={`rounded-lg border ${quadrant.borderColor} ${quadrant.bgColor} p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <quadrant.icon className={`w-4 h-4 ${quadrant.iconColor}`} />
        <span className="text-sm font-medium text-gray-900">{quadrant.label}</span>
        <span className="text-xs text-gray-400">({items.length})</span>
      </div>

      <div className="space-y-1.5 min-h-[40px]">
        {items.map((item, idx) => (
          <div key={`${quadrant.key}-${idx}`} className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${quadrant.tagBg} ${quadrant.tagText}`}>
            <span className="flex-1">{item}</span>
            {canEdit && (
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="p-0.5 hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {items.length === 0 && !isAdding && (
          <p className="text-xs text-gray-400 italic py-1">No items yet</p>
        )}
      </div>

      {canEdit && (
        <>
          {isAdding ? (
            <div className="mt-2 flex gap-1.5">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={`Add ${quadrant.label.toLowerCase()}...`}
                className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded bg-white focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
                autoFocus
              />
              <Button variant="cta" size="sm" onClick={handleSubmit}>
                Add
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setInputValue(''); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <Plus className="w-3 h-3" /> Add item
            </button>
          )}
        </>
      )}
    </div>
  );
}
