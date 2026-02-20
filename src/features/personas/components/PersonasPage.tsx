"use client";

import { Users, Plus } from "lucide-react";
import { EmptyState, SkeletonCard, Button } from "@/components/shared";
import { PageShell, PageHeader } from "@/components/ui/layout";
import { usePersonas } from "../hooks";
import { usePersonasOverviewStore } from "../stores/usePersonasOverviewStore";
import { PersonaStatsCards } from "./PersonaStatsCards";
import { PersonaSearchFilter } from "./PersonaSearchFilter";
import { PersonaCard } from "./PersonaCard";
import type { PersonaWithMeta } from "../types/persona.types";

interface PersonasPageProps {
  onNavigateToDetail?: (personaId: string) => void;
  onNavigateToCreate?: () => void;
  onOpenChat?: (persona: PersonaWithMeta) => void;
  onNavigate?: (route: string) => void;
}

export function PersonasPage({
  onNavigateToDetail,
  onNavigateToCreate,
  onOpenChat,
  onNavigate,
}: PersonasPageProps) {
  const { searchQuery, filter } = usePersonasOverviewStore();
  const { data, isLoading } = usePersonas(searchQuery || undefined, filter);

  return (
    <PageShell>
      <PageHeader
        moduleKey="personas"
        title="Personas"
        subtitle="Strategic decision instruments prioritized by research coverage"
        actions={
          <Button data-testid="add-persona-button" onClick={() => onNavigateToCreate?.()} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Persona
          </Button>
        }
      />

      <div className="space-y-6">
      {/* Stats */}
      {data?.stats && <PersonaStatsCards stats={data.stats} />}

      {/* Search + Filter */}
      <PersonaSearchFilter />

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !data?.personas?.length ? (
        <EmptyState
          icon={Users}
          title="No personas yet"
          description="Create your first persona to start building research-based audience representations."
          action={{
            label: "Create Persona",
            onClick: () => onNavigateToCreate?.(),
          }}
        />
      ) : (
        <div data-testid="personas-grid" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
          {data.personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              onClick={() => onNavigateToDetail?.(persona.id)}
              onChat={() => onOpenChat?.(persona)}
            />
          ))}
        </div>
      )}
      </div>
    </PageShell>
  );
}
