'use client';

import { Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/shared';
import { DimensionCard } from '../DimensionCard';
import type { StoredDimension } from '@/lib/ai/exploration/config.types';

// ─── Props ──────────────────────────────────────────────────

interface DimensionsTabProps {
  dimensions: StoredDimension[];
  validationErrors: Set<number>;
  onChange: (dimensions: StoredDimension[], editedIndex?: number) => void;
  onLoadDefaults?: () => void;
}

// ─── Component ──────────────────────────────────────────────

export function DimensionsTab({
  dimensions,
  validationErrors,
  onChange,
  onLoadDefaults,
}: DimensionsTabProps) {
  const updateDimension = (index: number, field: keyof StoredDimension, value: string) => {
    const updated = dimensions.map((d, i) => (i === index ? { ...d, [field]: value } : d));
    onChange(updated, index);
  };

  const addDimension = () => {
    // Use counter that avoids collisions after deletions
    const existingKeys = new Set(dimensions.map((d) => d.key));
    let num = dimensions.length + 1;
    while (existingKeys.has(`dim_${num}`)) num++;
    onChange([
      ...dimensions,
      { key: `dim_${num}`, title: '', icon: 'HelpCircle', question: '' },
    ]);
  };

  const removeDimension = (index: number) => {
    onChange(dimensions.filter((_, i) => i !== index));
  };

  const moveDimension = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= dimensions.length) return;
    const updated = [...dimensions];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            Dimensies ({dimensions.length})
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Elke dimensie bevat een strategische vraag die de AI stelt tijdens de exploration
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onLoadDefaults && (
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={onLoadDefaults}
            >
              Laad standaard
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={addDimension}
          >
            Dimensie toevoegen
          </Button>
        </div>
      </div>

      {/* Dimension cards */}
      {dimensions.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">Nog geen dimensies geconfigureerd.</p>
          <p className="text-xs text-gray-400 mt-1">
            Voeg dimensies toe of laad de standaard configuratie.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {onLoadDefaults && (
              <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onLoadDefaults}>
                Laad standaard dimensies
              </Button>
            )}
            <Button variant="primary" size="sm" icon={Plus} onClick={addDimension}>
              Eerste dimensie toevoegen
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {dimensions.map((dim, i) => (
            <DimensionCard
              key={i}
              dimension={dim}
              index={i}
              total={dimensions.length}
              hasError={validationErrors.has(i)}
              onChange={(field, value) => updateDimension(i, field, value)}
              onMoveUp={() => moveDimension(i, 'up')}
              onMoveDown={() => moveDimension(i, 'down')}
              onRemove={() => removeDimension(i)}
            />
          ))}
        </div>
      )}

      {/* Add button at bottom if there are already dimensions */}
      {dimensions.length > 0 && (
        <button
          type="button"
          onClick={addDimension}
          className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Dimensie toevoegen
        </button>
      )}
    </div>
  );
}
