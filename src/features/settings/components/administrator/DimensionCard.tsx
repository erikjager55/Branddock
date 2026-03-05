'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, Trash2, GripVertical, Key } from 'lucide-react';
import { IconPicker, resolveIcon } from './IconPicker';
import type { StoredDimension } from '@/lib/ai/exploration/config.types';

// ─── Props ──────────────────────────────────────────────────

interface DimensionCardProps {
  dimension: StoredDimension;
  index: number;
  total: number;
  hasError: boolean;
  onChange: (field: keyof StoredDimension, value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

// ─── Component ──────────────────────────────────────────────

export function DimensionCard({
  dimension,
  index,
  total,
  hasError,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: DimensionCardProps) {
  const [editingKey, setEditingKey] = useState(false);
  const Icon = resolveIcon(dimension.icon);

  return (
    <div
      className={`border rounded-xl bg-white overflow-hidden transition-colors ${
        hasError ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">
              {index + 1}. {dimension.title || 'Naamloze dimensie'}
            </span>
            {hasError && (
              <span className="text-[10px] text-red-500 font-medium bg-red-50 px-1.5 py-0.5 rounded-full">
                Incompleet
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100"
            title="Omhoog"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100"
            title="Omlaag"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
            title="Verwijderen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Title + Icon row */}
        <div className="grid grid-cols-[1fr_160px] gap-3">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
              Titel
            </label>
            <input
              value={dimension.title}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="Bijv. Waarom — Bestaansrecht"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 ${
                hasError && !dimension.title?.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
              Icoon
            </label>
            <IconPicker
              value={dimension.icon}
              onChange={(iconName) => onChange('icon', iconName)}
            />
          </div>
        </div>

        {/* Question */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
            Vraag
          </label>
          <textarea
            value={dimension.question}
            onChange={(e) => onChange('question', e.target.value)}
            placeholder="De vraag die de AI aan de gebruiker stelt voor deze dimensie..."
            rows={3}
            className={`w-full px-3 py-2 text-sm border rounded-lg resize-y focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 ${
              hasError && !dimension.question?.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          />
        </div>

        {/* Follow-up hint */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
            Follow-up hint <span className="text-gray-400 normal-case">(optioneel)</span>
          </label>
          <input
            value={dimension.followUpHint ?? ''}
            onChange={(e) => onChange('followUpHint', e.target.value)}
            placeholder="Extra instructie voor de AI om dieper door te vragen..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        {/* Key - collapsed by default */}
        <div className="pt-1">
          {editingKey ? (
            <div className="flex items-center gap-2">
              <Key className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <input
                value={dimension.key}
                onChange={(e) => onChange('key', e.target.value)}
                onBlur={() => setEditingKey(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingKey(false); }}
                placeholder="dim_key"
                autoFocus
                className="px-2 py-1 text-[11px] font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 w-48"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <Key className="w-3 h-3" />
              <span className="font-mono">{dimension.key}</span>
              <button
                type="button"
                onClick={() => setEditingKey(true)}
                className="text-gray-300 hover:text-teal-500 ml-1 cursor-pointer"
              >
                bewerken
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
