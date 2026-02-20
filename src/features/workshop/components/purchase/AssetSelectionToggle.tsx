"use client";

import type { SelectionMode } from "../../types/workshop-purchase.types";

interface AssetSelectionToggleProps {
  mode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
}

export function AssetSelectionToggle({
  mode,
  onModeChange,
}: AssetSelectionToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onModeChange("bundles")}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
          mode === "bundles"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Bundles
      </button>
      <button
        onClick={() => onModeChange("individual")}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
          mode === "individual"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Individual
      </button>
    </div>
  );
}
