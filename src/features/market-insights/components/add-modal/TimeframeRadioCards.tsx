'use client';

type TimeframeFocus = 'short-term' | 'all' | 'long-term';

const OPTIONS: { value: TimeframeFocus; label: string; description: string }[] = [
  { value: 'short-term', label: 'Short-Term', description: '<1 year' },
  { value: 'all', label: 'All Timeframes', description: 'No filter' },
  { value: 'long-term', label: 'Long-Term', description: '2+ years' },
];

interface TimeframeRadioCardsProps {
  value: TimeframeFocus;
  onChange: (val: TimeframeFocus) => void;
}

export function TimeframeRadioCards({ value, onChange }: TimeframeRadioCardsProps) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">Timeframe Focus</label>
      <div className="grid grid-cols-3 gap-3">
        {OPTIONS.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`p-3 rounded-lg border text-center transition-colors cursor-pointer ${
                isSelected
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="timeframe-focus"
                value={opt.value}
                checked={isSelected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <span className={`text-sm font-medium block ${isSelected ? 'text-green-700' : 'text-gray-700'}`}>
                {opt.label}
              </span>
              <span className="text-xs text-gray-500">{opt.description}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
