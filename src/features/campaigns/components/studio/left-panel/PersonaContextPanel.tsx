"use client";

import React, { useState } from "react";
import { Users, X, ChevronDown, Check } from "lucide-react";
import { usePersonas } from "@/features/personas/hooks";
import { useContentStudioStore } from "@/stores/useContentStudioStore";

export function PersonaContextPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = usePersonas();
  const personas = data?.personas ?? [];
  const { selectedPersonaIds, togglePersonaId } = useContentStudioStore();

  const selectedPersonas = personas.filter((p) =>
    selectedPersonaIds.includes(p.id)
  );

  if (personas.length === 0) {
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Persona Context
        </label>
        <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center">
          <Users className="h-5 w-5 text-gray-300 mx-auto mb-1" />
          <p className="text-xs text-gray-400">No personas available</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-2">
        Persona Context
      </label>

      {/* Selected personas badges */}
      {selectedPersonas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedPersonas.map((persona) => (
            <span
              key={persona.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium"
            >
              {persona.name}
              <button
                onClick={() => togglePersonaId(persona.id)}
                className="hover:text-emerald-900 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Empty state */}
      {selectedPersonas.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center mb-2">
          <Users className="h-5 w-5 text-gray-300 mx-auto mb-1" />
          <p className="text-xs text-gray-400">No personas selected</p>
        </div>
      )}

      {/* Dropdown trigger */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span>Add personas...</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown list */}
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {personas.map((persona) => {
              const isSelected = selectedPersonaIds.includes(persona.id);
              return (
                <button
                  key={persona.id}
                  onClick={() => togglePersonaId(persona.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "bg-emerald-600 border-emerald-600"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  {persona.avatarUrl ? (
                    <img
                      src={persona.avatarUrl}
                      alt={persona.name}
                      className="h-5 w-5 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <Users className="h-3 w-3 text-gray-400" />
                    </div>
                  )}
                  <span className="text-xs text-gray-700 truncate">
                    {persona.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
