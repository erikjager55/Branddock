'use client';

import React, { useState } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

interface CategoryItem {
  name?: string;
  slug?: string;
  confidence: number;
}

interface CategoryResultCardProps {
  title: string;
  icon: LucideIcon;
  color: string;
  items: CategoryItem[];
  description: string;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 75) return 'text-emerald-600';
  if (confidence >= 50) return 'text-amber-600';
  return 'text-gray-400';
}

function getConfidenceBg(confidence: number): string {
  if (confidence >= 75) return 'bg-emerald-50';
  if (confidence >= 50) return 'bg-amber-50';
  return 'bg-gray-50';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 75) return 'High';
  if (confidence >= 50) return 'Medium';
  return 'Low';
}

const COLOR_MAP: Record<string, { bg: string; text: string; iconBg: string }> = {
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', iconBg: 'bg-teal-100' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100' },
};

export function CategoryResultCard({ title, icon: Icon, color, items, description }: CategoryResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = COLOR_MAP[color] ?? COLOR_MAP.teal;
  const avgConfidence = items.length > 0
    ? Math.round(items.reduce((sum, i) => sum + i.confidence, 0) / items.length)
    : 0;

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 opacity-60">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${colors.text}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">No data found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${colors.text}`} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${getConfidenceColor(avgConfidence)}`}>
            {avgConfidence}% confident
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-2">
          {items.map((item, i) => (
            <div
              key={item.slug ?? item.name ?? i}
              className={`flex items-center justify-between p-2.5 rounded-lg ${getConfidenceBg(item.confidence)}`}
            >
              <span className="text-sm text-gray-700">
                {item.name ?? item.slug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? `Item ${i + 1}`}
              </span>
              <span className={`text-xs font-medium ${getConfidenceColor(item.confidence)}`}>
                {getConfidenceLabel(item.confidence)} ({item.confidence}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
