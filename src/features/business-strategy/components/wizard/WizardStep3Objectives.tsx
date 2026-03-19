'use client';

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button, Input } from '@/components/shared';
import type { InitialObjective } from '../../types/business-strategy.types';

interface WizardStep3Props {
  objectives: InitialObjective[];
  onObjectivesChange: (objectives: InitialObjective[]) => void;
}

export function WizardStep3Objectives({ objectives, onObjectivesChange }: WizardStep3Props) {
  const [krInputValues, setKrInputValues] = useState<Record<number, string>>({});

  const handleAddObjective = () => {
    onObjectivesChange([...objectives, { title: '', keyResults: [] }]);
  };

  const handleRemoveObjective = (index: number) => {
    onObjectivesChange(objectives.filter((_, i) => i !== index));
    setKrInputValues((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleTitleChange = (index: number, title: string) => {
    const updated = [...objectives];
    updated[index] = { ...updated[index], title };
    onObjectivesChange(updated);
  };

  const handleAddKeyResult = (objIndex: number) => {
    const value = (krInputValues[objIndex] ?? '').trim();
    if (!value) return;
    const updated = [...objectives];
    updated[objIndex] = {
      ...updated[objIndex],
      keyResults: [...(updated[objIndex].keyResults ?? []), value],
    };
    onObjectivesChange(updated);
    setKrInputValues((prev) => ({ ...prev, [objIndex]: '' }));
  };

  const handleRemoveKeyResult = (objIndex: number, krIndex: number) => {
    const updated = [...objectives];
    updated[objIndex] = {
      ...updated[objIndex],
      keyResults: (updated[objIndex].keyResults ?? []).filter((_, i) => i !== krIndex),
    };
    onObjectivesChange(updated);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-600">
          Optionally define initial objectives for your strategy. You can always add more later.
        </p>
      </div>

      {objectives.map((obj, objIdx) => (
        <div
          key={objIdx}
          className="p-4 border border-gray-200 rounded-lg space-y-3"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                label={`Objective ${objIdx + 1}`}
                value={obj.title}
                onChange={(e) => handleTitleChange(objIdx, e.target.value)}
                placeholder="e.g. Increase monthly revenue by 20%"
              />
            </div>
            <button
              type="button"
              onClick={() => handleRemoveObjective(objIdx)}
              className="mt-6 p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
              title="Remove objective"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Key Results */}
          {(obj.keyResults ?? []).length > 0 && (
            <div className="ml-4 space-y-1.5">
              <span className="text-xs font-medium text-gray-500">Key Results</span>
              {(obj.keyResults ?? []).map((kr, krIdx) => (
                <div key={krIdx} className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 flex-1">{kr}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyResult(objIdx, krIdx)}
                    className="p-0.5 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Key Result input */}
          <div className="flex gap-2 ml-4">
            <input
              value={krInputValues[objIdx] ?? ''}
              onChange={(e) =>
                setKrInputValues((prev) => ({ ...prev, [objIdx]: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyResult(objIdx);
                }
              }}
              placeholder="Add a key result..."
              className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => handleAddKeyResult(objIdx)}
              disabled={!(krInputValues[objIdx] ?? '').trim()}
              className="px-2.5 py-1.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      ))}

      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddObjective}
      >
        <Plus className="w-4 h-4 mr-1" /> Add Objective
      </Button>

      {objectives.length === 0 && (
        <p className="text-sm text-gray-400 italic text-center py-4">
          No objectives yet — you can add them now or later from the strategy detail page.
        </p>
      )}
    </div>
  );
}
