'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, RotateCcw, Loader2, Search } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface ContentTypeThreshold {
  id: string;
  label: string;
  category: string;
  threshold: number;
  isCustomized: boolean;
}

interface ThresholdsResponse {
  defaultThreshold: number;
  types: ContentTypeThreshold[];
}

// ─── Data fetching ──────────────────────────────────────────

const thresholdsKeys = { all: ['content-type-thresholds'] as const };

async function fetchThresholds(): Promise<ThresholdsResponse> {
  const res = await fetch('/api/settings/content-type-thresholds');
  if (!res.ok) throw new Error('Failed to fetch thresholds');
  return res.json();
}

async function setThreshold(body: { contentTypeId: string; threshold: number }) {
  const res = await fetch('/api/settings/content-type-thresholds', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update threshold');
  return res.json();
}

async function resetThreshold(contentTypeId: string) {
  const res = await fetch('/api/settings/content-type-thresholds', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentTypeId }),
  });
  if (!res.ok) throw new Error('Failed to reset threshold');
  return res.json();
}

// ─── Component ──────────────────────────────────────────────

export function ValidationTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: thresholdsKeys.all,
    queryFn: fetchThresholds,
  });

  const updateMutation = useMutation({
    mutationFn: setThreshold,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: thresholdsKeys.all }),
  });

  const resetMutation = useMutation({
    mutationFn: resetThreshold,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: thresholdsKeys.all }),
  });

  const filteredTypes = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.types;
    return data.types.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    );
  }, [data, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ContentTypeThreshold[]>();
    for (const t of filteredTypes) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTypes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 text-sm">
        Failed to load thresholds
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-6 h-6 text-primary mt-1" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Validation Thresholds</h2>
          <p className="text-sm text-gray-600 mt-1">
            A fidelity threshold (0-100) per content type. Anything below this score
            triggers auto-iterate (max 2 attempts). Default {data.defaultThreshold}.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by type or category..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="space-y-6">
        {grouped.map(([category, types]) => (
          <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {category}
            </div>
            <div className="divide-y divide-gray-100">
              {types.map((t) => (
                <ThresholdRow
                  key={t.id}
                  type={t}
                  defaultThreshold={data.defaultThreshold}
                  onUpdate={(threshold) =>
                    updateMutation.mutate({ contentTypeId: t.id, threshold })
                  }
                  onReset={() => resetMutation.mutate(t.id)}
                  isMutating={
                    (updateMutation.isPending && updateMutation.variables?.contentTypeId === t.id) ||
                    (resetMutation.isPending && resetMutation.variables === t.id)
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredTypes.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-8">
          No types match &quot;{search}&quot;
        </div>
      )}
    </div>
  );
}

// ─── ThresholdRow ───────────────────────────────────────────

interface ThresholdRowProps {
  type: ContentTypeThreshold;
  defaultThreshold: number;
  onUpdate: (threshold: number) => void;
  onReset: () => void;
  isMutating: boolean;
}

function ThresholdRow({ type, defaultThreshold, onUpdate, onReset, isMutating }: ThresholdRowProps) {
  const [localValue, setLocalValue] = useState(type.threshold);

  const handleBlur = () => {
    if (localValue !== type.threshold) onUpdate(localValue);
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{type.label}</div>
        {type.isCustomized && (
          <div className="text-[11px] text-emerald-700 mt-0.5">Customized (default {defaultThreshold})</div>
        )}
      </div>
      <div className="flex items-center gap-2 w-64">
        <input
          type="range"
          min={0}
          max={100}
          value={localValue}
          onChange={(e) => setLocalValue(parseInt(e.target.value, 10))}
          onMouseUp={handleBlur}
          onTouchEnd={handleBlur}
          className="flex-1 accent-primary"
          disabled={isMutating}
        />
        <span className="text-sm font-mono w-10 text-right tabular-nums text-gray-700">
          {localValue}
        </span>
      </div>
      <button
        onClick={onReset}
        disabled={!type.isCustomized || isMutating}
        title={type.isCustomized ? 'Reset to default' : 'Already default'}
        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
      </button>
    </div>
  );
}
