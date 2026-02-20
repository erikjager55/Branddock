import React from 'react';
import { AlertTriangle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAttentionItems } from '../../hooks/use-dashboard';
import { Skeleton } from '../shared';
import type { AttentionItem } from '../../types/dashboard';

function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || LucideIcons.Circle;
}

interface AttentionItemCardProps {
  item: AttentionItem;
  index: number;
  onNavigate: (section: string) => void;
}

function AttentionItemCard({ item, index, onNavigate }: AttentionItemCardProps) {
  const Icon = getIcon(item.icon);
  const isFixAction = item.actionType === 'fix';

  return (
    <div data-testid="attention-item" className="flex items-center gap-4 py-3">
      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-medium text-gray-500">{index}</span>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconColor}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{item.title}</div>
        <div className="text-xs text-gray-500 truncate">{item.description}</div>
      </div>
      <button
        onClick={() => onNavigate(item.actionHref)}
        className={`px-3 py-1.5 text-xs font-medium rounded-md flex-shrink-0 transition-colors ${
          isFixAction
            ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
            : 'bg-green-50 text-green-700 hover:bg-green-100'
        }`}
      >
        {item.actionLabel} &gt;
      </button>
    </div>
  );
}

interface AttentionListProps {
  onNavigate: (section: string) => void;
}

export function AttentionList({ onNavigate }: AttentionListProps) {
  const { data, isLoading } = useAttentionItems();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <Skeleton className="h-5 w-56 mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-3 w-60" />
            </div>
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div data-testid="attention-list" className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-gray-900">What Needs Your Attention</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {data.map((item, idx) => (
          <AttentionItemCard key={item.id} item={item} index={idx + 1} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}
