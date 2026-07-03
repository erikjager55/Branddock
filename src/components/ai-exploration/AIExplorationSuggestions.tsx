'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Lightbulb,
  Check,
  Pencil,
  X,
  Sparkles,
} from 'lucide-react';
import type { ExplorationConfig, ExplorationInsightsData, FieldSuggestion } from './types';

// ─── Display Helpers ──────────────────────────────────────

/**
 * Format a field value for display. Handles JSON-stringified objects/arrays
 * by rendering them as readable key: value pairs or bullet lists.
 */
function formatDisplayValue(value: string | string[] | null): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value !== 'string' || value.length === 0) return '—';

  // Try to parse as JSON for structured display
  const trimmed = value.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      return formatParsedValue(parsed);
    } catch {
      // Not valid JSON, return as-is
    }
  }

  return value;
}

/** Recursively format a parsed JSON value for display. */
function formatParsedValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    return val.map((item) => formatParsedValue(item)).join(' | ');
  }
  if (typeof val === 'object') {
    return Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => {
        const formatted = typeof v === 'object' && v !== null ? formatParsedValue(v) : String(v);
        return `${k}: ${formatted}`;
      })
      .join(', ');
  }
  return String(val);
}


interface AIExplorationSuggestionsProps {
  config: ExplorationConfig;
  insightsData: ExplorationInsightsData;
  onBackToReport: () => void;
}

type SuggestionAction = 'pending' | 'accepted' | 'edited' | 'rejected';

export function AIExplorationSuggestions({
  config,
  insightsData,
  onBackToReport,
}: AIExplorationSuggestionsProps) {
  const { t } = useTranslation('ai-exploration');
  const suggestions = insightsData.fieldSuggestions ?? [];
  const [actions, setActions] = useState<Record<string, SuggestionAction>>(
    () => Object.fromEntries(suggestions.map((s) => [s.field, 'pending']))
  );
  const [editValues, setEditValues] = useState<Record<string, string>>(
    () => Object.fromEntries(suggestions.map((s) => [s.field, Array.isArray(s.suggestedValue) ? s.suggestedValue.join(', ') : String(s.suggestedValue ?? '')]))
  );
  const [isApplying, setIsApplying] = useState(false);

  const acceptedCount = Object.values(actions).filter((a) => a === 'accepted' || a === 'edited').length;

  const handleAcceptAll = () => {
    const updated: Record<string, SuggestionAction> = {};
    suggestions.forEach((s) => {
      // Preserve items the user has already edited
      updated[s.field] = actions[s.field] === 'edited' ? 'edited' : 'accepted';
    });
    setActions(updated);
  };

  const [applySuccess, setApplySuccess] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const updates: Record<string, unknown> = {};
      suggestions.forEach((s) => {
        const action = actions[s.field];
        if (action === 'accepted') updates[s.field] = s.suggestedValue;
        if (action === 'edited') {
          const editVal = editValues[s.field];
          // If the original was an array, parse comma-separated values back
          if (Array.isArray(s.suggestedValue)) {
            updates[s.field] = editVal.split(',').map((v) => v.trim()).filter(Boolean);
          } else {
            updates[s.field] = editVal;
          }
        }
      });
      if (config.onApplyChanges && Object.keys(updates).length > 0) {
        await config.onApplyChanges(updates);
      }
      setApplySuccess(true);
      // Navigate back after a short delay so user sees the success state
      setTimeout(() => config.onBack(), 1200);
    } catch (error) {
      console.error('[AIExplorationSuggestions] Failed to apply changes:', error);
      setIsApplying(false);
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBackToReport}
          className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: '#6b7280' }}
        >
          <ArrowLeft className="w-4 h-4" /> {t('suggestions.backToReport')}
        </button>
        <div className="text-center" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: '#f3f4f6', marginBottom: '12px' }}>
            <Lightbulb className="h-6 w-6" style={{ color: '#9ca3af' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#111827' }}>{t('suggestions.noSuggestionsTitle')}</p>
          <p className="text-sm" style={{ color: '#6b7280', marginTop: '4px' }}>{t('suggestions.noSuggestionsBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={onBackToReport}
        className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
        style={{ color: '#6b7280' }}
      >
        <ArrowLeft className="w-4 h-4" /> {t('suggestions.backToReport')}
      </button>

      {/* Header card */}
      <div
        className="rounded-xl"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
          border: '1px solid #fde68a',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
              <Lightbulb className="h-5 w-5" style={{ color: '#d97706' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>{t('suggestions.heading')}</h2>
              <p className="text-sm" style={{ color: '#92400e', marginTop: '2px' }}>
                {t('suggestions.countFor', { count: suggestions.length, itemName: config.itemName })}
              </p>
            </div>
          </div>
          <button
            onClick={handleAcceptAll}
            className="flex items-center gap-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{
              padding: '8px 16px',
              color: '#065f46',
              border: '1px solid #6ee7b7',
              backgroundColor: '#ecfdf5',
            }}
          >
            <Check className="h-4 w-4" /> {t('suggestions.acceptAll', { count: suggestions.length })}
          </button>
        </div>
        <p className="text-sm" style={{ color: '#78716c', marginTop: '12px' }}>
          {t('suggestions.intro')}
        </p>
      </div>

      {/* Suggestion cards */}
      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.field}
            suggestion={suggestion}
            action={actions[suggestion.field]}
            editValue={editValues[suggestion.field]}
            onAccept={() => setActions({ ...actions, [suggestion.field]: 'accepted' })}
            onReject={() => setActions({ ...actions, [suggestion.field]: 'rejected' })}
            onEdit={() => setActions({ ...actions, [suggestion.field]: 'edited' })}
            onEditValueChange={(val) => setEditValues({ ...editValues, [suggestion.field]: val })}
          />
        ))}
      </div>

      {/* Success banner */}
      {applySuccess && (
        <div
          className="rounded-xl flex items-center gap-3"
          style={{ padding: '16px 20px', backgroundColor: '#ecfdf5', border: '1px solid #6ee7b7' }}
        >
          <Check className="h-5 w-5 flex-shrink-0" style={{ color: '#059669' }} />
          <p className="text-sm font-medium" style={{ color: '#065f46' }}>
            {t('suggestions.applySuccess', { itemName: config.itemName })}
          </p>
        </div>
      )}

      {/* Footer */}
      {!applySuccess && (
        <div className="flex items-center justify-between" style={{ paddingTop: '16px', paddingBottom: '8px' }}>
          <button
            onClick={onBackToReport}
            className="flex items-center gap-2 rounded-lg text-sm transition-colors hover:opacity-80"
            style={{ padding: '10px 16px', color: '#4b5563', border: '1px solid #e5e7eb' }}
          >
            <ArrowLeft className="h-4 w-4" /> {t('suggestions.backToReport')}
          </button>
          {acceptedCount > 0 && (
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="flex items-center gap-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #14b8a6, #10b981)',
                boxShadow: '0 2px 8px rgba(20,184,166,0.3)',
              }}
            >
              <Sparkles className="h-4 w-4" />
              {isApplying ? t('suggestions.applying') : t('suggestions.apply', { count: acceptedCount })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Individual Card ──────────────────────────────────────

function SuggestionCard({
  suggestion,
  action,
  editValue,
  onAccept,
  onReject,
  onEdit,
  onEditValueChange,
}: {
  suggestion: FieldSuggestion;
  action: SuggestionAction;
  editValue: string;
  onAccept: () => void;
  onReject: () => void;
  onEdit: () => void;
  onEditValueChange: (val: string) => void;
}) {
  const { t } = useTranslation('ai-exploration');
  const [isEditing, setIsEditing] = useState(false);

  const borderColor =
    action === 'accepted' || action === 'edited' ? '#6ee7b7'
    : action === 'rejected' ? '#fca5a5'
    : '#e5e7eb';

  return (
    <div className="rounded-xl" style={{ padding: '20px', backgroundColor: '#ffffff', border: `1px solid ${borderColor}` }}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1" style={{ minWidth: 0 }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef3c7' }}>
            <Lightbulb className="h-4 w-4" style={{ color: '#d97706' }} />
          </div>
          <div className="flex-1" style={{ minWidth: 0 }}>
            <h4 className="text-sm font-semibold" style={{ color: '#111827' }}>{suggestion.label}</h4>
            {suggestion.reason && (
              <p className="text-xs" style={{ color: '#6b7280', marginTop: '2px' }}>{suggestion.reason}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {action === 'pending' && (
          <div className="flex items-center gap-2 flex-shrink-0" style={{ marginLeft: '16px' }}>
            <button
              onClick={onAccept}
              className="flex items-center gap-1 rounded-md text-xs font-medium transition-colors hover:opacity-80"
              style={{ padding: '6px 12px', color: '#059669', border: '1px solid #6ee7b7', backgroundColor: '#ecfdf5' }}
            >
              <Check className="h-3 w-3" /> {t('suggestions.accept')}
            </button>
            <button
              onClick={() => { onEdit(); setIsEditing(true); }}
              className="flex items-center gap-1 rounded-md text-xs font-medium transition-colors hover:opacity-80"
              style={{ padding: '6px 12px', color: '#4b5563', border: '1px solid #e5e7eb' }}
            >
              <Pencil className="h-3 w-3" /> {t('suggestions.edit')}
            </button>
            <button
              onClick={onReject}
              className="rounded-md transition-colors hover:opacity-80"
              style={{ padding: '6px 8px', color: '#9ca3af', border: '1px solid #e5e7eb' }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {action === 'accepted' && (
          <span className="text-xs font-medium" style={{ color: '#059669', padding: '6px 12px', backgroundColor: '#ecfdf5', borderRadius: '6px' }}>{t('suggestions.accepted')}</span>
        )}
        {action === 'edited' && (
          <span className="text-xs font-medium" style={{ color: '#2563eb', padding: '6px 12px', backgroundColor: '#eff6ff', borderRadius: '6px' }}>{t('suggestions.edited')}</span>
        )}
        {action === 'rejected' && (
          <span className="text-xs font-medium" style={{ color: '#dc2626', padding: '6px 12px', backgroundColor: '#fef2f2', borderRadius: '6px' }}>{t('suggestions.dismissed')}</span>
        )}
      </div>

      {/* Current → Suggested */}
      <div className="grid grid-cols-2 gap-6" style={{ marginTop: '16px' }}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9ca3af', marginBottom: '4px' }}>{t('suggestions.current')}</div>
          <p className="text-sm" style={{ color: suggestion.currentValue ? '#374151' : '#d1d5db' }}>
            {formatDisplayValue(suggestion.currentValue)}
          </p>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9ca3af', marginBottom: '4px' }}>{t('suggestions.suggested')}</div>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={(e) => onEditValueChange(e.target.value)}
                rows={2}
                className="w-full rounded-lg text-sm resize-none outline-none"
                style={{ padding: '8px 10px', border: '1px solid #14b8a6', color: '#111827' }}
              />
              <button
                onClick={() => { onEdit(); setIsEditing(false); }}
                className="text-xs font-medium rounded-md text-white"
                style={{ padding: '4px 12px', backgroundColor: '#14b8a6' }}
              >
                {t('suggestions.save')}
              </button>
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#374151' }}>{formatDisplayValue(suggestion.suggestedValue)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
