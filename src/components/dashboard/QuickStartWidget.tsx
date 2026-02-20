import React, { useMemo } from 'react';
import { ChevronDown, Check, Rocket } from 'lucide-react';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useDashboardPreferences, useCompleteQuickStart } from '../../hooks/use-dashboard';

interface QuickStartWidgetProps {
  onNavigate: (section: string) => void;
}

export function QuickStartWidget({ onNavigate }: QuickStartWidgetProps) {
  const { showQuickStart, quickStartCollapsed, dismissQuickStart, toggleQuickStartCollapse } = useDashboardStore();
  const { data: preferences } = useDashboardPreferences();
  const completeItem = useCompleteQuickStart();

  const raw = preferences?.quickStartItems;
  const items = Array.isArray(raw) ? raw : [];

  const completedCount = useMemo(() => items.filter(i => i.completed).length, [items]);
  const allComplete = completedCount === items.length && items.length > 0;

  // Don't render if dismissed, all complete, or no data
  if (!showQuickStart || preferences?.quickStartDismissed || allComplete || items.length === 0) return null;

  const handleToggleItem = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    completeItem.mutate(key);
  };

  return (
    <div data-testid="quick-start-widget" className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-green-600" />
          <h3 className="text-sm font-semibold text-gray-900">Quick Start</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{completedCount}/{items.length} complete</span>
          <button data-testid="quick-start-collapse-btn" onClick={() => toggleQuickStartCollapse()} className="text-gray-400 hover:text-gray-600">
            <ChevronDown className={`h-4 w-4 transition-transform ${quickStartCollapsed ? '-rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div data-testid="quick-start-progress" className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
        <div
          className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${(completedCount / items.length) * 100}%` }}
        />
      </div>

      {/* Items */}
      {!quickStartCollapsed && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.key}
              data-testid="quick-start-item"
              className="flex items-center gap-3 py-1.5 group cursor-pointer"
              onClick={() => !item.completed && onNavigate(item.href)}
            >
              {/* Circular checkbox */}
              <button
                data-testid={item.completed ? 'quick-start-checkbox-checked' : 'quick-start-checkbox'}
                onClick={(e) => !item.completed && handleToggleItem(item.key, e)}
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  item.completed
                    ? 'bg-green-600'
                    : 'border-2 border-gray-300 hover:border-green-400'
                }`}
              >
                {item.completed && <Check className="h-3 w-3 text-white" />}
              </button>

              {/* Label */}
              <span
                className={`text-sm ${
                  item.completed
                    ? 'text-gray-400 line-through'
                    : 'text-gray-700 group-hover:text-gray-900'
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Dismiss link */}
      {!quickStartCollapsed && (
        <button
          onClick={() => dismissQuickStart()}
          className="text-xs text-gray-400 hover:text-gray-600 mt-3"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
