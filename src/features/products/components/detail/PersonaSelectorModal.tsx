"use client";

import { useState, useMemo } from "react";
import { Search, Users } from "lucide-react";
import { Modal, Button, Input, OptimizedImage } from "@/components/shared";
import { usePersonas } from "@/contexts/PersonasContext";
import { useLinkPersona } from "../../hooks";

interface PersonaSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  linkedPersonaIds: string[];
}

export function PersonaSelectorModal({
  isOpen,
  onClose,
  productId,
  linkedPersonaIds,
}: PersonaSelectorModalProps) {
  const { personas } = usePersonas();
  const linkPersona = useLinkPersona(productId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter out already linked personas and apply search
  const availablePersonas = useMemo(() => {
    return personas
      .filter((p) => !linkedPersonaIds.includes(p.id))
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          (p.tagline && p.tagline.toLowerCase().includes(query))
        );
      });
  }, [personas, linkedPersonaIds, searchQuery]);

  const toggleSelection = (personaId: string) => {
    setSelectedIds((prev) =>
      prev.includes(personaId)
        ? prev.filter((id) => id !== personaId)
        : [...prev, personaId],
    );
  };

  const handleLink = async () => {
    for (const personaId of selectedIds) {
      linkPersona.mutate(personaId);
    }
    setSelectedIds([]);
    setSearchQuery("");
    onClose();
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSearchQuery("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Link Persona"
      subtitle="Select personas to link to this product"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="cta"
            onClick={handleLink}
            disabled={selectedIds.length === 0}
            isLoading={linkPersona.isPending}
          >
            Link Selected ({selectedIds.length})
          </Button>
        </div>
      }
    >
      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search personas..."
          icon={Search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Persona list */}
      {availablePersonas.length === 0 ? (
        <div className="text-center py-8">
          <Users className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">
            {personas.length === linkedPersonaIds.length
              ? "All personas are already linked"
              : "No personas match your search"}
          </p>
        </div>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {availablePersonas.map((persona) => {
            const isSelected = selectedIds.includes(persona.id);
            const initials = persona.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <label
                key={persona.id}
                className={`flex items-center gap-3 rounded-lg p-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-green-50 border border-green-200"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(persona.id)}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />

                {/* Avatar */}
                <OptimizedImage
                  src={(persona as { avatarUrl?: string | null }).avatarUrl}
                  alt={persona.name}
                  avatar="sm"
                  fallback={
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                      {initials}
                    </div>
                  }
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {persona.name}
                  </p>
                  {persona.tagline && (
                    <p className="text-xs text-gray-500 truncate">
                      {persona.tagline}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
