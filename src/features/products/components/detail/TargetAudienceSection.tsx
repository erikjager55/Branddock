"use client";

import { Users, Plus, X } from "lucide-react";
import { EmptyState, OptimizedImage } from "@/components/shared";

interface TargetAudienceSectionProps {
  personas: { id: string; name: string; avatarUrl: string | null }[];
  onAdd: () => void;
  onRemove: (personaId: string) => void;
}

export function TargetAudienceSection({
  personas,
  onAdd,
  onRemove,
}: TargetAudienceSectionProps) {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Target Audience
          </h3>
        </div>
        {personas.length > 0 && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Persona
          </button>
        )}
      </div>

      {personas.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {personas.map((persona) => (
            <div
              key={persona.id}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5"
            >
              <OptimizedImage
                src={persona.avatarUrl}
                alt={persona.name}
                avatar="xs"
                fallback={
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[10px] font-semibold text-green-700">
                    {getInitials(persona.name)}
                  </div>
                }
              />
              <span className="text-sm text-gray-700">{persona.name}</span>
              <button
                onClick={() => onRemove(persona.id)}
                className="ml-0.5 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No personas linked yet"
          description="Link personas to understand who this product serves."
          action={{
            label: "+ Add Persona",
            onClick: onAdd,
          }}
        />
      )}
    </div>
  );
}
