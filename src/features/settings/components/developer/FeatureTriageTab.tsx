'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lightbulb,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface FeatureReportItem {
  id: string;
  page: string;
  title: string;
  description: string;
  impact: string;
  screenshot: string | null;
  status: string;
  notes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
  resolvedBy: { name: string | null; email: string } | null;
  workspace: { name: string } | null;
}

// ─── Constants ──────────────────────────────────────────────

const IMPACT_COLORS: Record<string, string> = {
  'nice-to-have': 'bg-gray-100 text-gray-700',
  useful: 'bg-blue-100 text-blue-700',
  important: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_FILTERS = ['all', 'open', 'planned', 'in_progress', 'shipped', 'declined'] as const;
const STATUS_OPTIONS = ['open', 'planned', 'in_progress', 'shipped', 'declined'] as const;

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  open: 'Open',
  planned: 'Planned',
  in_progress: 'In Progress',
  shipped: 'Shipped',
  declined: 'Declined',
};

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-gray-100 text-gray-600',
  planned: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-blue-100 text-blue-700',
  shipped: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-gray-100 text-gray-400',
};

// ─── Component ──────────────────────────────────────────────

export function FeatureTriageTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['feature-triage'],
    queryFn: async (): Promise<FeatureReportItem[]> => {
      const res = await fetch('/api/feature-reports?all=true');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      return json.features ?? [];
    },
    refetchInterval: 15000,
  });

  const features = data ?? [];
  const filtered =
    statusFilter === 'all' ? features : features.filter((f) => f.status === statusFilter);

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status?: string;
      notes?: string | null;
    }) => {
      const res = await fetch(`/api/feature-reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feature-triage'] }),
  });

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // ─── Counts ──────────────────────────────────────────────
  const openCount = features.filter((f) => f.status === 'open').length;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Lightbulb size={18} className="text-emerald-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Feature Triage</h2>
            <p className="text-sm text-gray-500">
              {openCount} open {openCount === 1 ? 'request' : 'requests'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter pills — inline hex for the active state because Tailwind 4
          purge drops bg-gray-800 from the compiled CSS (see gotchas.md). */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const isActive = statusFilter === f;
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={isActive ? { backgroundColor: '#1f2937' } : undefined}
            >
              {STATUS_LABELS[f]}
              {f !== 'all' && (
                <span className="ml-1 opacity-60">
                  ({features.filter((x) => x.status === f).length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-12 text-center text-sm text-gray-400">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Loading feature requests...
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">
          No feature requests {statusFilter !== 'all' ? `with status "${STATUS_LABELS[statusFilter]}"` : 'yet'}.
        </div>
      )}

      {/* Feature cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((feature) => {
            const isExpanded = expandedId === feature.id;
            const noteValue = noteDrafts[feature.id] ?? feature.notes ?? '';
            const noteDirty = noteValue.trim() !== (feature.notes ?? '').trim();

            return (
              <div
                key={feature.id}
                className="border border-gray-200 bg-white rounded-xl transition-colors"
              >
                {/* Header row */}
                <button
                  onClick={() => handleToggle(feature.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  )}

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                      IMPACT_COLORS[feature.impact] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {feature.impact}
                  </span>

                  <span className="text-sm font-medium text-gray-800 flex-1 truncate">
                    {feature.title}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                      STATUS_BADGE[feature.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {STATUS_LABELS[feature.status] ?? feature.status}
                  </span>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 space-y-4 border-t border-gray-100">
                    {/* Description */}
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {feature.description}
                      </p>
                    </div>

                    {/* Reference link */}
                    {feature.screenshot && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Reference</p>
                        <a
                          href={feature.screenshot}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-teal-600 underline break-all"
                        >
                          {feature.screenshot}
                        </a>
                      </div>
                    )}

                    {/* Status transitions */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Status</p>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((s) => {
                          const isCurrent = feature.status === s;
                          return (
                            <button
                              key={s}
                              onClick={() =>
                                !isCurrent &&
                                updateMutation.mutate({ id: feature.id, status: s })
                              }
                              disabled={isCurrent || updateMutation.isPending}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:cursor-default ${
                                isCurrent
                                  ? `${STATUS_BADGE[s]} ring-2 ring-offset-1`
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {STATUS_LABELS[s]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Triage notes */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Triage notes</p>
                      <textarea
                        value={noteValue}
                        onChange={(e) =>
                          setNoteDrafts((prev) => ({ ...prev, [feature.id]: e.target.value }))
                        }
                        placeholder="Internal notes for the team..."
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      {noteDirty && (
                        <button
                          onClick={() =>
                            updateMutation.mutate({ id: feature.id, notes: noteValue.trim() })
                          }
                          disabled={updateMutation.isPending}
                          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-40 transition-colors"
                          style={{ backgroundColor: '#059669' }}
                        >
                          <Check size={12} />
                          Save notes
                        </button>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-400">
                      <span>Requested by {feature.user?.name ?? feature.user?.email}</span>
                      <span>Page: {feature.page}</span>
                      {feature.workspace && <span>Workspace: {feature.workspace.name}</span>}
                      <span>{new Date(feature.createdAt).toLocaleString()}</span>
                      {feature.resolvedBy && (
                        <span>Closed by {feature.resolvedBy.name ?? feature.resolvedBy.email}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
