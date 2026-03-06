"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";

interface FeaturesSpecsSectionProps {
  features: string[];
  isEditing?: boolean;
  onChange?: (features: string[]) => void;
}

export function FeaturesSpecsSection({
  features,
  isEditing,
  onChange,
}: FeaturesSpecsSectionProps) {
  const [newItem, setNewItem] = useState("");

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed || !onChange) return;
    onChange([...features, trimmed]);
    setNewItem("");
  };

  const handleRemove = (index: number) => {
    if (!onChange) return;
    onChange(features.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Features &amp; Specifications
      </h3>

      {isEditing ? (
        <div className="space-y-2">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
              <span className="text-sm text-gray-700 flex-1">{feature}</span>
              <button
                onClick={() => handleRemove(idx)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5 text-red-400 hover:text-red-600" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-3">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a feature..."
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary"
            />
            <button
              onClick={handleAdd}
              disabled={!newItem.trim()}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>
      ) : features.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <Check className="h-4 w-4 flex-shrink-0 text-green-500 mt-0.5" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No features added yet</p>
      )}
    </div>
  );
}
