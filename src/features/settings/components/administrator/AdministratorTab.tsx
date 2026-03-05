'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ExplorationConfigData } from '@/lib/ai/exploration/config.types';
import { ConfigListView } from './ConfigListView';
import { ConfigDetailView } from './ConfigDetailView';

// ─── API Functions ─────────────────────────────────────────

async function fetchConfigs() {
  const res = await fetch('/api/admin/exploration-configs');
  if (!res.ok) throw new Error('Failed to fetch configs');
  return res.json();
}

async function createConfig(data: Record<string, unknown>) {
  const res = await fetch('/api/admin/exploration-configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create config');
  return res.json();
}

async function updateConfig(id: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/admin/exploration-configs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update config');
  return res.json();
}

async function deleteConfig(id: string) {
  const res = await fetch(`/api/admin/exploration-configs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete config');
  return res.json();
}

// ─── Component ─────────────────────────────────────────────

export function AdministratorTab() {
  const queryClient = useQueryClient();
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [duplicateData, setDuplicateData] = useState<ExplorationConfigData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'exploration-configs'],
    queryFn: fetchConfigs,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'exploration-configs'] });
      toast.success('Configuratie verwijderd');
      setSelectedConfigId(null);
    },
  });

  const configs = (data?.configs ?? []) as ExplorationConfigData[];
  const selectedConfig = selectedConfigId
    ? configs.find((c) => c.id === selectedConfigId)
    : null;

  // ─── Handlers ──────────────────────────────────────────

  const handleSelectConfig = useCallback((id: string) => {
    setSelectedConfigId(id);
    setIsCreating(false);
    setDuplicateData(null);
  }, []);

  const handleCreateConfig = useCallback(() => {
    setIsCreating(true);
    setSelectedConfigId(null);
    setDuplicateData(null);
  }, []);

  const handleDuplicateConfig = useCallback((config: ExplorationConfigData) => {
    setDuplicateData({
      ...config,
      id: `new-duplicate-${Date.now()}`,
      label: config.label ? `${config.label} (kopie)` : null,
      isActive: false,
    });
    setIsCreating(true);
    setSelectedConfigId(null);
  }, []);

  const handleDeleteConfig = useCallback((id: string) => {
    if (confirm('Weet je zeker dat je deze configuratie wilt verwijderen?')) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const handleCancel = useCallback(() => {
    setSelectedConfigId(null);
    setIsCreating(false);
    setDuplicateData(null);
  }, []);

  const handleSaveCreate = useCallback(async (configData: Record<string, unknown>) => {
    await createConfig(configData);
    queryClient.invalidateQueries({ queryKey: ['admin', 'exploration-configs'] });
    setIsCreating(false);
    setDuplicateData(null);
    toast.success('Configuratie aangemaakt');
  }, [queryClient]);

  const handleSaveUpdate = useCallback(async (configData: Record<string, unknown>) => {
    if (!selectedConfigId) return;
    await updateConfig(selectedConfigId, configData);
    queryClient.invalidateQueries({ queryKey: ['admin', 'exploration-configs'] });
    toast.success('Configuratie opgeslagen');
  }, [selectedConfigId, queryClient]);

  // ─── Loading state ─────────────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-6xl p-6 space-y-4">
        <div className="h-8 w-64 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Detail View (editing or creating) ─────────────────

  if (selectedConfig) {
    return (
      <div className="max-w-5xl p-6">
        <ConfigDetailView
          initialData={selectedConfig}
          onSave={handleSaveUpdate}
          onCancel={handleCancel}
          onDelete={() => handleDeleteConfig(selectedConfig.id)}
          onDuplicate={() => handleDuplicateConfig(selectedConfig)}
        />
      </div>
    );
  }

  if (isCreating) {
    return (
      <div className="max-w-5xl p-6">
        <ConfigDetailView
          initialData={duplicateData ?? undefined}
          onSave={handleSaveCreate}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  // ─── List View ─────────────────────────────────────────

  return (
    <div className="max-w-6xl p-6">
      <ConfigListView
        configs={configs}
        onSelectConfig={handleSelectConfig}
        onCreateConfig={handleCreateConfig}
        onDeleteConfig={handleDeleteConfig}
        onDuplicateConfig={handleDuplicateConfig}
      />
    </div>
  );
}
