'use client';

import { useState } from 'react';
import { Shield, Plus, Bot, Pencil, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EXPLORATION_AI_MODELS } from '@/lib/ai/exploration/config.types';
import type { ExplorationConfigData } from '@/lib/ai/exploration/config.types';
import { ExplorationConfigEditor } from './ExplorationConfigEditor';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'exploration-configs'],
    queryFn: fetchConfigs,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'exploration-configs'] });
      toast.success('Configuration deleted');
    },
  });

  const configs = (data?.configs ?? []) as ExplorationConfigData[];

  return (
    <div className="max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-semibold text-gray-900">AI Exploration Configuration</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Configureer prompts, dimensies, AI model en context per onderdeel
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nieuwe configuratie
        </button>
      </div>

      {/* Create form */}
      {isCreating && (
        <ExplorationConfigEditor
          onSave={async (configData) => {
            await createConfig(configData);
            queryClient.invalidateQueries({ queryKey: ['admin', 'exploration-configs'] });
            setIsCreating(false);
            toast.success('Configuration created');
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Config list */}
      {!isLoading && configs.length === 0 && !isCreating && (
        <div className="text-center py-12 text-gray-400 text-sm">
          <Bot className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nog geen AI Exploration configuraties.</p>
          <p className="mt-1">Het systeem gebruikt standaard instellingen totdat je een configuratie aanmaakt.</p>
        </div>
      )}

      <div className="space-y-3">
        {configs.map((config) => (
          <div key={config.id}>
            {editingId === config.id ? (
              <ExplorationConfigEditor
                initialData={config}
                onSave={async (configData) => {
                  await updateConfig(config.id, configData);
                  queryClient.invalidateQueries({ queryKey: ['admin', 'exploration-configs'] });
                  setEditingId(null);
                  toast.success('Configuration updated');
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ExplorationConfigCard
                config={config}
                onEdit={() => setEditingId(config.id)}
                onDelete={() => {
                  if (confirm('Weet je zeker dat je deze configuratie wilt verwijderen?')) {
                    deleteMutation.mutate(config.id);
                  }
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Config Card (collapsed view) ──────────────────────────

function ExplorationConfigCard({
  config,
  onEdit,
  onDelete,
}: {
  config: ExplorationConfigData;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const model = EXPLORATION_AI_MODELS.find((m) => m.id === config.model);
  const dimensionCount = Array.isArray(config.dimensions) ? config.dimensions.length : 0;

  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.isActive ? 'bg-teal-50' : 'bg-gray-100'}`}>
            <Bot className={`w-5 h-5 ${config.isActive ? 'text-teal-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {config.label || `${config.itemType}${config.itemSubType ? ` → ${config.itemSubType}` : ''}`}
              </h3>
              {!config.isActive && (
                <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  Inactive
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
              <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                {config.itemType}{config.itemSubType ? ` / ${config.itemSubType}` : ''}
              </span>
              <span>{model?.label ?? config.model}</span>
              <span>·</span>
              <span>{dimensionCount} dimensies</span>
              <span>·</span>
              <span>temp {config.temperature}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Bewerken"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Verwijderen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
