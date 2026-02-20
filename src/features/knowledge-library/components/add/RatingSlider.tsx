'use client';

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function RatingSlider({ value, onChange }: RatingSliderProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Rating: {value.toFixed(1)}/5
      </label>
      <input
        type="range"
        min={0}
        max={5}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-green-600"
      />
    </div>
  );
}
