'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bug,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { MarkdownContent } from '@/features/claw/components/MarkdownContent';

// ─── Types ──────────────────────────────────────────────────

interface BugReportItem {
  id: string;
  page: string;
  description: string;
  severity: string;
  screenshot: string | null;
  status: string;
  aiSuggestion: string | null;
  aiStatus: string;
  resolvedAt: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
  resolvedBy: { name: string | null; email: string } | null;
  workspace: { name: string } | null;
}

// ─── Constants ──────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_FILTERS = ['all', 'open', 'fixed', 'wontfix'] as const;

const AI_STATUS_INDICATOR: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pending: { icon: <Clock size={12} />, label: 'Pending', color: 'text-gray-400' },
  analyzing: { icon: <Loader2 size={12} className="animate-spin" />, label: 'Analyzing...', color: 'text-blue-500' },
  ready: { icon: <Sparkles size={12} />, label: 'Suggestion ready', color: 'text-emerald-600' },
  failed: { icon: <AlertCircle size={12} />, label: 'Analysis failed', color: 'text-red-500' },
};

// ─── Component ──────────────────────────────────────────────

export function BugTriageTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bug-triage'],
    queryFn: async (): Promise<BugReportItem[]> => {
      const res = await fetch('/api/bug-reports?all=true');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      return json.bugs ?? [];
    },
    refetchInterval: 10000, // Poll for AI status updates
  });

  const bugs = data ?? [];
  const filtered = statusFilter === 'all' ? bugs : bugs.filter((b) => b.status === statusFilter);

  const approveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const res = await fetch(`/api/bug-reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bug-triage'] }),
  });

  const reanalyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bug-reports/${id}/reanalyze`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bug-triage'] }),
  });

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // ─── Counts ──────────────────────────────────────────────
  const openCount = bugs.filter((b) => b.status === 'open').length;
  const readyCount = bugs.filter((b) => b.aiStatus === 'ready' && b.status === 'open').length;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <Bug size={18} className="text-amber-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bug Triage</h2>
            <p className="text-sm text-gray-500">
              {openCount} open {openCount === 1 ? 'bug' : 'bugs'}
              {readyCount > 0 && (
                <span className="ml-1 text-emerald-600">
                  ({readyCount} with AI suggestion)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === f
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'wontfix' ? "Won't Fix" : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span className="ml-1 opacity-60">
                ({bugs.filter((b) => b.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-12 text-center text-sm text-gray-400">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Loading bug reports...
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">
          No bug reports {statusFilter !== 'all' ? `with status "${statusFilter}"` : 'yet'}.
        </div>
      )}

      {/* Bug cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((bug) => {
            const isExpanded = expandedId === bug.id;
            const aiIndicator = AI_STATUS_INDICATOR[bug.aiStatus] ?? AI_STATUS_INDICATOR.pending;
            const isOpen = bug.status === 'open';

            return (
              <div
                key={bug.id}
                className={`border rounded-xl transition-colors ${
                  isOpen ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                }`}
              >
                {/* Header row */}
                <button
                  onClick={() => handleToggle(bug.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  {isExpanded ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}

                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${SEVERITY_COLORS[bug.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                    {bug.severity}
                  </span>

                  <span className="text-xs text-gray-400 flex-shrink-0 w-32 truncate">{bug.page}</span>

                  <span className="text-sm text-gray-700 flex-1 truncate">{bug.description}</span>

                  {/* AI status */}
                  <span className={`flex items-center gap-1 text-[10px] font-medium flex-shrink-0 ${aiIndicator.color}`}>
                    {aiIndicator.icon}
                    {aiIndicator.label}
                  </span>

                  {/* Bug status */}
                  {bug.status === 'fixed' && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 flex-shrink-0">
                      <CheckCircle size={12} /> Fixed
                    </span>
                  )}
                  {bug.status === 'wontfix' && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500 flex-shrink-0">
                      <XCircle size={12} /> Won&apos;t Fix
                    </span>
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 space-y-4 border-t border-gray-100">
                    {/* Full description */}
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{bug.description}</p>
                    </div>

                    {/* Screenshot */}
                    {bug.screenshot && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Screenshot</p>
                        {/\.(png|jpe?g|webp|gif)(\?|$)/i.test(bug.screenshot) || bug.screenshot.startsWith('/uploads/') ? (
                          <a href={bug.screenshot} target="_blank" rel="noopener noreferrer">
                            <img
                              src={bug.screenshot}
                              alt="Bug screenshot"
                              className="max-h-60 rounded-lg border border-gray-200 object-contain"
                            />
                          </a>
                        ) : (
                          <a href={bug.screenshot} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 underline break-all">
                            {bug.screenshot}
                          </a>
                        )}
                      </div>
                    )}

                    {/* AI Suggestion */}
                    {bug.aiStatus === 'ready' && bug.aiSuggestion && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles size={14} className="text-emerald-600" />
                          <p className="text-xs font-semibold text-emerald-700">AI Fix Suggestion</p>
                        </div>
                        <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                          <MarkdownContent content={bug.aiSuggestion} />
                        </div>
                      </div>
                    )}

                    {bug.aiStatus === 'failed' && (
                      <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 flex items-center justify-between">
                        <span className="text-xs text-red-600">AI analysis failed</span>
                        <button
                          onClick={() => reanalyzeMutation.mutate(bug.id)}
                          disabled={reanalyzeMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                        >
                          <RefreshCw size={12} className={reanalyzeMutation.isPending ? 'animate-spin' : ''} />
                          Retry
                        </button>
                      </div>
                    )}

                    {bug.aiStatus === 'analyzing' && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-blue-500" />
                        <span className="text-xs text-blue-600">AI is analyzing this bug...</span>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-[11px] text-gray-400">
                      <span>Reported by {bug.user?.name ?? bug.user?.email}</span>
                      {bug.workspace && <span>Workspace: {bug.workspace.name}</span>}
                      <span>{new Date(bug.createdAt).toLocaleString()}</span>
                      {bug.resolvedBy && (
                        <span>Resolved by {bug.resolvedBy.name ?? bug.resolvedBy.email}</span>
                      )}
                    </div>

                    {/* Actions */}
                    {isOpen && (
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => approveMutation.mutate({ id: bug.id, action: 'approve' })}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                        >
                          <CheckCircle size={14} />
                          Approve Fix
                        </button>
                        <button
                          onClick={() => approveMutation.mutate({ id: bug.id, action: 'reject' })}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                        >
                          <XCircle size={14} />
                          Won&apos;t Fix
                        </button>
                        {(bug.aiStatus === 'failed' || bug.aiStatus === 'pending') && (
                          <button
                            onClick={() => reanalyzeMutation.mutate(bug.id)}
                            disabled={reanalyzeMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                          >
                            <RefreshCw size={14} className={reanalyzeMutation.isPending ? 'animate-spin' : ''} />
                            Re-analyze
                          </button>
                        )}
                      </div>
                    )}
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
