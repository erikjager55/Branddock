'use client';

interface RelevanceSliderProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}

export function RelevanceSlider({ value, onChange, min = 0, max = 100 }: RelevanceSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">Relevance Score</label>
        <span className="text-sm font-semibold text-green-600">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-green-600"
      />
    </div>
  );
}
