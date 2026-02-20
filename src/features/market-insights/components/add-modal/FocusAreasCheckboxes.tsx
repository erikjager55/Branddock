'use client';

import { FOCUS_AREAS } from '../../constants/insight-constants';

interface FocusAreasCheckboxesProps {
  selected: string[];
  onChange: (areas: string[]) => void;
}

export function FocusAreasCheckboxes({ selected, onChange }: FocusAreasCheckboxesProps) {
  const toggle = (area: string) => {
    if (selected.includes(area)) {
      onChange(selected.filter((a) => a !== area));
    } else {
      onChange([...selected, area]);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">Focus Areas</label>
      <div className="grid grid-cols-2 gap-3">
        {FOCUS_AREAS.map((area) => (
          <label
            key={area}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(area)}
              onChange={() => toggle(area)}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">{area}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
