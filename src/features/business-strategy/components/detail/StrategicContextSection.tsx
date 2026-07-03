'use client';

import { useState } from 'react';
import { Pencil, X, Check, Plus, Trash2, Eye, Lightbulb, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared';
import type { StrategyDetailResponse, UpdateContextBody } from '../../types/business-strategy.types';

interface StrategicContextSectionProps {
  strategy: StrategyDetailResponse;
  onUpdate: (data: UpdateContextBody) => void;
  isUpdating: boolean;
}

type EditingField = 'vision' | 'rationale' | 'assumptions' | null;

export function StrategicContextSection({
  strategy,
  onUpdate,
  isUpdating,
}: StrategicContextSectionProps) {
  const { t } = useTranslation('business-strategy');
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const [editAssumptions, setEditAssumptions] = useState<string[]>([]);

  const handleStartEdit = (field: EditingField) => {
    if (field === 'vision') setEditValue(strategy.vision ?? '');
    else if (field === 'rationale') setEditValue(strategy.rationale ?? '');
    else if (field === 'assumptions') setEditAssumptions([...strategy.keyAssumptions]);
    setEditingField(field);
  };

  const handleSave = () => {
    if (editingField === 'vision') onUpdate({ vision: editValue });
    else if (editingField === 'rationale') onUpdate({ rationale: editValue });
    else if (editingField === 'assumptions') onUpdate({ keyAssumptions: editAssumptions.filter(Boolean) });
    setEditingField(null);
  };

  const handleCancel = () => {
    setEditingField(null);
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('context.title')}</h2>

      <div className="space-y-5">
        {/* Vision */}
        <ContextBlock
          icon={<Eye className="w-4 h-4 text-blue-500" />}
          label={t('context.vision')}
          value={strategy.vision}
          isEditing={editingField === 'vision'}
          onStartEdit={() => handleStartEdit('vision')}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isUpdating}
        >
          {editingField === 'vision' && (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              autoFocus
            />
          )}
        </ContextBlock>

        {/* Rationale */}
        <ContextBlock
          icon={<Lightbulb className="w-4 h-4 text-amber-500" />}
          label={t('context.rationale')}
          value={strategy.rationale}
          isEditing={editingField === 'rationale'}
          onStartEdit={() => handleStartEdit('rationale')}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isUpdating}
        >
          {editingField === 'rationale' && (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              autoFocus
            />
          )}
        </ContextBlock>

        {/* Key Assumptions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-medium text-gray-700">{t('context.keyAssumptions')}</span>
            </div>
            {editingField !== 'assumptions' && (
              <button
                onClick={() => handleStartEdit('assumptions')}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {editingField === 'assumptions' ? (
            <div className="space-y-2">
              {editAssumptions.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={a}
                    onChange={(e) => {
                      const updated = [...editAssumptions];
                      updated[i] = e.target.value;
                      setEditAssumptions(updated);
                    }}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <button
                    onClick={() => setEditAssumptions(editAssumptions.filter((_, j) => j !== i))}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEditAssumptions([...editAssumptions, ''])}
                className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
              >
                <Plus className="w-3.5 h-3.5" /> {t('context.addAssumption')}
              </button>
              <div className="flex items-center gap-2 mt-2">
                <Button variant="cta" size="sm" onClick={handleSave} isLoading={isUpdating}>
                  {t('actions.save')}
                </Button>
                <Button variant="secondary" size="sm" onClick={handleCancel}>
                  {t('actions.cancel')}
                </Button>
              </div>
            </div>
          ) : strategy.keyAssumptions.length > 0 ? (
            <ul className="space-y-1">
              {strategy.keyAssumptions.map((a, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  {a}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 italic">{t('context.noAssumptions')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Context Block Sub-component ────────────────────────────

function ContextBlock({
  icon,
  label,
  value,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  isSaving,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation('business-strategy');
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        {!isEditing && (
          <button
            onClick={onStartEdit}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div>
          {children}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="p-1 text-emerald-600 hover:text-emerald-700"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : value ? (
        <p className="text-sm text-gray-600">{value}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">{t('context.notDefined')}</p>
      )}
    </div>
  );
}
