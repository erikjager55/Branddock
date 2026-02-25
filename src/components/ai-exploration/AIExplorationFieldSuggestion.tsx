'use client';

import { useState } from 'react';
import { Check, X, Pencil, Lightbulb, ArrowRight } from 'lucide-react';
import type { FieldSuggestion } from './types';

interface AIExplorationFieldSuggestionProps {
  suggestion: FieldSuggestion;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string, newValue: string | string[]) => void;
}

function formatValue(value: string | string[] | null): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
  return value || '—';
}

export function AIExplorationFieldSuggestion({
  suggestion,
  onAccept,
  onReject,
  onEdit,
}: AIExplorationFieldSuggestionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    Array.isArray(suggestion.suggestedValue)
      ? suggestion.suggestedValue.join('\n')
      : suggestion.suggestedValue,
  );

  const isArray = Array.isArray(suggestion.suggestedValue);
  const isAccepted = suggestion.status === 'accepted';
  const isRejected = suggestion.status === 'rejected';
  const isEdited = suggestion.status === 'edited';

  const handleSaveEdit = () => {
    const newValue = isArray
      ? editValue.split('\n').map((s) => s.trim()).filter(Boolean)
      : editValue.trim();
    onEdit(suggestion.id, newValue);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(
      Array.isArray(suggestion.suggestedValue)
        ? suggestion.suggestedValue.join('\n')
        : suggestion.suggestedValue,
    );
    setIsEditing(false);
  };

  if (isRejected) return null;

  return (
    <div
      className={`border rounded-xl p-4 transition-all ${
        isAccepted || isEdited
          ? 'border-emerald-200 bg-emerald-50/50'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isAccepted || isEdited ? 'bg-emerald-100' : 'bg-amber-100'
            }`}
          >
            {isAccepted || isEdited ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
            )}
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">{suggestion.label}</span>
            {(isAccepted || isEdited) && (
              <span className="ml-2 text-xs text-emerald-600 font-medium">
                {isEdited ? 'Edited' : 'Accepted'}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons — only show if pending */}
        {suggestion.status === 'pending' && !isEditing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onAccept(suggestion.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              title="Accept suggestion"
            >
              <Check className="h-3 w-3" />
              Accept
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
              title="Edit suggestion"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
            <button
              onClick={() => onReject(suggestion.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
              title="Reject suggestion"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Reason */}
      <p className="text-xs text-gray-500 mb-3 pl-9">{suggestion.reason}</p>

      {/* Edit mode */}
      {isEditing && (
        <div className="pl-9 space-y-2">
          {isArray ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={4}
              className="w-full p-2 text-xs border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
              placeholder="One item per line"
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full p-2 text-xs border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveEdit}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Check className="h-3 w-3" />
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current → Suggested comparison */}
      {!isEditing && (
        <div className="pl-9 flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
              Current
            </span>
            <p
              className="text-xs text-gray-500 mt-0.5 truncate"
              title={formatValue(suggestion.currentValue)}
            >
              {formatValue(suggestion.currentValue)}
            </p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0 mt-4" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
              Suggested
            </span>
            <p
              className={`text-xs mt-0.5 ${
                isAccepted || isEdited ? 'text-emerald-700 font-medium' : 'text-gray-900'
              }`}
              title={formatValue(suggestion.suggestedValue)}
            >
              {formatValue(isEdited ? editValue : suggestion.suggestedValue)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
