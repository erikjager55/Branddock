'use client';

import { useState } from 'react';
import {
  Plus,
  TrendingUp,
  Globe,
  Rocket,
  Award,
  Settings,
  Puzzle,
  Heart,
  Lightbulb,
  Target,
  Zap,
} from 'lucide-react';
import { useAddFocusArea } from '../../hooks';
import type { FocusAreaDetail } from '../../types/business-strategy.types';

interface FocusAreaCardsProps {
  focusAreas: FocusAreaDetail[];
  strategyId: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  Globe,
  Rocket,
  Award,
  Settings,
  Puzzle,
  Heart,
  Lightbulb,
  Target,
  Zap,
};

const DEFAULT_COLORS = ['blue', 'purple', 'pink', 'amber', 'green', 'teal', 'indigo', 'rose'];

function getColorClasses(color: string | null) {
  const c = color ?? 'gray';
  const map: Record<string, { border: string; bg: string; text: string }> = {
    blue: { border: 'border-t-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
    purple: { border: 'border-t-purple-500', bg: 'bg-purple-50', text: 'text-purple-600' },
    pink: { border: 'border-t-pink-500', bg: 'bg-pink-50', text: 'text-pink-600' },
    amber: { border: 'border-t-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
    green: { border: 'border-t-green-500', bg: 'bg-green-50', text: 'text-green-600' },
    teal: { border: 'border-t-teal-500', bg: 'bg-teal-50', text: 'text-teal-600' },
    indigo: { border: 'border-t-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    rose: { border: 'border-t-rose-500', bg: 'bg-rose-50', text: 'text-rose-600' },
    gray: { border: 'border-t-gray-400', bg: 'bg-gray-50', text: 'text-gray-500' },
  };
  return map[c] ?? map.gray;
}

export function FocusAreaCards({ focusAreas, strategyId }: FocusAreaCardsProps) {
  const addFocusArea = useAddFocusArea(strategyId);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    const color = DEFAULT_COLORS[focusAreas.length % DEFAULT_COLORS.length];
    addFocusArea.mutate(
      { name: newName.trim(), color },
      {
        onSuccess: () => {
          setNewName('');
          setIsAdding(false);
        },
      },
    );
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Focus Areas</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {focusAreas.map((fa) => {
          const colors = getColorClasses(fa.color);
          const IconComponent = fa.icon ? ICON_MAP[fa.icon] : null;

          return (
            <div
              key={fa.id}
              className={`border border-gray-200 border-t-4 ${colors.border} rounded-lg p-3 text-center`}
            >
              {IconComponent && (
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${colors.bg} mb-2`}>
                  <IconComponent className={`w-4 h-4 ${colors.text}`} />
                </div>
              )}
              <p className="text-sm font-medium text-gray-900 truncate">{fa.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {fa.objectiveCount} objective{fa.objectiveCount !== 1 ? 's' : ''}
              </p>
            </div>
          );
        })}

        {/* Add card */}
        {isAdding ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 flex flex-col items-center justify-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Area name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') { setIsAdding(false); setNewName(''); }
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <div className="flex gap-1">
              <button
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="px-2 py-0.5 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => { setIsAdding(false); setNewName(''); }}
                className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="border-2 border-dashed border-gray-300 rounded-lg p-3 flex flex-col items-center justify-center gap-1 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-500">Add Focus Area</span>
          </button>
        )}
      </div>
    </div>
  );
}
