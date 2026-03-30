"use client";

import { useState, useMemo } from "react";
import { Cpu, Plus, Sparkles } from "lucide-react";
import { Button, EmptyState, SkeletonCard } from "@/components/shared";
import { PageHeader } from "@/components/shared";
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

interface ConsistentModelsPageProps {
  onNavigateToDetail: (id: string) => void;
}

/** Overview page for consistent AI models */
export function ConsistentModelsPage({
  onNavigateToDetail,
}: ConsistentModelsPageProps) {
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
      <PageHeader
        icon={Cpu}
        title="AI Models"
        subtitle={
          models.length > 0
            ? `${models.length} model${models.length !== 1 ? "s" : ""}`
            : undefined
        }
        primaryAction={{
          label: "Create Model",
          icon: Plus,
          onClick: () => openCreateModal(),
        }}
      />

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
