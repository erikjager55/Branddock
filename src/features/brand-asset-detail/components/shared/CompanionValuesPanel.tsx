'use client';

import { useState } from 'react';
import { Info, ChevronDown, ChevronUp, Package, Heart, Crown } from 'lucide-react';

interface CompanionValuesPanelProps {
  companionName: string;
  values: {
    functional?: string;
    emotional?: string;
    selfExpressive?: string;
  };
  perspective: 'identity' | 'commitment';
}

const VALUE_FIELDS = [
  { key: 'functional' as const, icon: Package, label: 'Functional', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { key: 'emotional' as const, icon: Heart, label: 'Emotional', iconBg: 'bg-rose-50', iconColor: 'text-rose-600' },
  { key: 'selfExpressive' as const, icon: Crown, label: 'Self-Expressive', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
];

/** Collapsible panel showing the companion asset's 3-layer values read-only. */
export function CompanionValuesPanel({
  companionName,
  values,
  perspective,
}: CompanionValuesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasValues = values.functional || values.emotional || values.selfExpressive;

  const label = perspective === 'identity'
    ? `These describe who your brand IS at its core. Compare with ${companionName} (what you deliver).`
    : `These articulate what you deliver to customers. Compare with ${companionName} (who you are).`;

  return (
    <div className="border border-blue-100 rounded-lg overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start gap-2 p-3 bg-blue-50 text-left hover:bg-blue-100/60 transition-colors"
      >
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="flex-1 text-xs text-blue-700">{label}</p>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        )}
      </button>

      {isOpen && (
        <div className="p-3 bg-blue-50/30 border-t border-blue-100 space-y-2">
          {hasValues ? (
            VALUE_FIELDS.map(({ key, icon: Icon, label: fieldLabel, iconBg, iconColor }) => {
              const value = values[key];
              if (!value) return null;
              return (
                <div key={key} className="flex items-start gap-2">
                  <div className={`h-5 w-5 rounded ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`h-3 w-3 ${iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-gray-500">{fieldLabel}:</span>
                    <p className="text-xs text-gray-700 leading-relaxed">{value}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-gray-500 italic">
              Not yet defined — fill in {companionName} first.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
