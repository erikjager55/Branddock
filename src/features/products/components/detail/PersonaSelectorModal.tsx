"use client";

import { useState, useMemo } from "react";
import { Search, Users, UserPlus, Loader2 } from "lucide-react";
import { Modal, Button, Input, OptimizedImage } from "@/components/shared";
import { usePersonas as usePersonasQuery } from "@/features/personas/hooks";
import { useLinkPersona } from "../../hooks";

interface PersonaSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  linkedPersonaIds: string[];
  onNavigateToCreatePersona?: () => void;
}

export function PersonaSelectorModal({
  isOpen,
  onClose,
  productId,
  linkedPersonaIds,
  onNavigateToCreatePersona,
}: PersonaSelectorModalProps) {
  const { data, isLoading, isError } = usePersonasQuery();
  const personas = data?.personas ?? [];
  const linkPersona = useLinkPersona(productId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

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
    setIsLinking(true);
    setLinkError(null);
    try {
      for (const personaId of selectedIds) {
        await linkPersona.mutateAsync(personaId);
      }
      setSelectedIds([]);
      setSearchQuery("");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to link persona";
      setLinkError(message);
    } finally {
      setIsLinking(false);
    }
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSearchQuery("");
    setLinkError(null);
    onClose();
  };

  const handleCreatePersona = () => {
    handleClose();
    onNavigateToCreatePersona?.();
  };

  // Determine empty state message
  const hasNoPersonasInWorkspace = personas.length === 0 && !isLoading;
  const allLinked = personas.length > 0 && personas.length === linkedPersonaIds.length;

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
            isLoading={isLinking}
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

      {/* Error banner */}
      {linkError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {linkError}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="mx-auto h-6 w-6 text-gray-400 animate-spin mb-2" />
          <p className="text-sm text-gray-500">Loading personas...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-8">
          <Users className="mx-auto h-8 w-8 text-red-300 mb-2" />
          <p className="text-sm text-red-600">
            Could not load personas. Please try again.
          </p>
        </div>
      ) : hasNoPersonasInWorkspace ? (
        /* No personas exist in workspace */
        <div className="text-center py-8">
          <UserPlus className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm font-medium text-gray-700 mb-1">
            No personas in this workspace yet
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Create a persona first, then link it to this product.
          </p>
          {onNavigateToCreatePersona && (
            <Button
              variant="primary"
              size="sm"
              icon={UserPlus}
              onClick={handleCreatePersona}
            >
              Create Persona
            </Button>
          )}
        </div>
      ) : allLinked ? (
        /* All personas already linked */
        <div className="text-center py-8">
          <Users className="mx-auto h-8 w-8 text-green-300 mb-2" />
          <p className="text-sm text-gray-500">
            All personas are already linked to this product
          </p>
        </div>
      ) : availablePersonas.length === 0 ? (
        /* Search returned no results */
        <div className="text-center py-8">
          <Search className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">
            No personas match your search
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
                  src={persona.avatarUrl}
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
