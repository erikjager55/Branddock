"use client";

import { useState, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { EmptyState, SkeletonCard } from "@/components/shared";
import { ModelStatsCards } from "./ModelStatsCards";
import { ModelFilterBar } from "./ModelFilterBar";
import { ModelCard } from "./ModelCard";
import { CreateModelModal } from "./CreateModelModal";
import { useConsistentModels, useConsistentModelStats } from "../hooks";
import { useConsistentModelStore } from "../stores/useConsistentModelStore";
import type {
  ConsistentModelType,
  ConsistentModelStatus,
} from "../types/consistent-model.types";

interface ConsistentModelsContentProps {
  onNavigateToDetail: (id: string, status?: string) => void;
}

/** Content-only component for consistent AI models (used as tab in AiTrainerPage) */
export function ConsistentModelsContent({
  onNavigateToDetail,
}: ConsistentModelsContentProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { isCreateModalOpen, openCreateModal, closeCreateModal } =
    useConsistentModelStore();

  const params = useMemo(
    () => ({
      ...(typeFilter ? { type: typeFilter as ConsistentModelType } : {}),
      ...(statusFilter ? { status: statusFilter as ConsistentModelStatus } : {}),
      ...(search ? { search } : {}),
    }),
    [typeFilter, statusFilter, search],
  );

  const { data, isLoading } = useConsistentModels(params);
  const { data: stats, isLoading: statsLoading } = useConsistentModelStats();

  const models = data?.models ?? [];

  return (
    <div className="space-y-6">
      <ModelStatsCards stats={stats} isLoading={statsLoading} />

      <ModelFilterBar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : models.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No AI models yet"
          description="Create your first consistent AI model to generate on-brand imagery for people, products, and styles."
          action={{
            label: "Create Model",
            onClick: () => openCreateModal(),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onClick={onNavigateToDetail}
            />
          ))}
        </div>
      )}

      <CreateModelModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onCreated={onNavigateToDetail}
      />
    </div>
  );
}
