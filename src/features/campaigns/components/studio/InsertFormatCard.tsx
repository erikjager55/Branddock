'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { InsertFormatType } from '@/types/studio';

// ─── Types ─────────────────────────────────────────────

interface InsertFormatCardProps {
  format: InsertFormatType;
  label: string;
  description: string;
  icon: LucideIcon;
  isSelected: boolean;
  onSelect: (format: InsertFormatType) => void;
}

// ─── Component ─────────────────────────────────────────

export function InsertFormatCard({
  format,
  label,
  description,
  icon: Icon,
  isSelected,
  onSelect,
}: InsertFormatCardProps) {
  return (
    <button
      onClick={() => onSelect(format)}
      className={`
        flex flex-col items-center gap-2 p-4 rounded-lg border-2 text-center transition-colors
        ${
          isSelected
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-gray-200 hover:border-gray-300 bg-white'
        }
      `}
    >
      <Icon
        className={`w-6 h-6 ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`}
      />
      <span
        className={`text-sm font-medium ${
          isSelected ? 'text-emerald-700' : 'text-gray-900'
        }`}
      >
        {label}
      </span>
      <span className="text-xs text-gray-500 leading-tight">{description}</span>
    </button>
  );
}

export default InsertFormatCard;
