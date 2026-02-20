'use client';

import { cn } from '@/components/ui/utils';
import {
  BarChart3,
  LayoutGrid,
  Presentation,
  StickyNote,
  Image,
} from 'lucide-react';

type ResultsTab = 'overview' | 'canvas' | 'workshop' | 'notes' | 'gallery';

const TABS: { id: ResultsTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'canvas', label: 'Canvas', icon: LayoutGrid },
  { id: 'workshop', label: 'Workshop', icon: Presentation },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'gallery', label: 'Gallery', icon: Image },
];

interface ResultsTabsProps {
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
}

export function ResultsTabs({ activeTab, onTabChange }: ResultsTabsProps) {
  return (
    <div data-testid="results-tabs" className="flex items-center gap-1 border-b border-gray-200 mb-6">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          data-testid={`results-tab-${id}`}
          onClick={() => onTabChange(id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === id
              ? 'border-emerald-500 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
