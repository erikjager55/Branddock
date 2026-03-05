"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

interface UseCasesSectionProps {
  useCases: string[];
  isEditing?: boolean;
  onChange?: (useCases: string[]) => void;
}

export function UseCasesSection({
  useCases,
  isEditing,
  onChange,
}: UseCasesSectionProps) {
  const [newItem, setNewItem] = useState("");

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed || !onChange) return;
    onChange([...useCases, trimmed]);
    setNewItem("");
  };

  const handleRemove = (index: number) => {
    if (!onChange) return;
    onChange(useCases.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Use Cases</h3>

      {isEditing ? (
        <div className="space-y-2">
          {useCases.map((useCase, idx) => (
            <div key={idx} className="flex items-center gap-2 group">
              <span className="text-sm text-gray-500 w-5 text-right flex-shrink-0">
                {idx + 1}.
              </span>
              <span className="text-sm text-gray-700 flex-1">{useCase}</span>
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
              placeholder="Add a use case..."
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
      ) : (
        <div className="space-y-2">
          {useCases.map((useCase, idx) => (
            <p key={idx} className="text-sm text-gray-600">
              {idx + 1}. {useCase}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
