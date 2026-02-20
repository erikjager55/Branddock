'use client';

interface BrandContextToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
}

export function BrandContextToggle({ checked, onChange }: BrandContextToggleProps) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-700">Use my brand context</p>
        <p className="text-xs text-gray-500">
          Include your brand foundation, personas, and products in the research
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-green-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
