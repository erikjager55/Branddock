'use client';

import React, { useEffect, useState } from 'react';
import { Bug, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useClawStore } from '@/stores/useClawStore';
import type { BugReportItem } from '@/stores/useClawStore';

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  open: { icon: <Clock size={12} />, label: 'Open', color: 'text-amber-600' },
  fixed: { icon: <CheckCircle size={12} />, label: 'Fixed', color: 'text-emerald-600' },
  wontfix: { icon: <XCircle size={12} />, label: "Won't Fix", color: 'text-gray-500' },
};

export function BugLogbook() {
  const { bugLogbook, setBugLogbook, closeBugLogbook } = useClawStore();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBugs() {
      try {
        const res = await fetch('/api/bug-reports');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setBugLogbook(data.bugs ?? []);
      } catch {
        setBugLogbook([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBugs();
  }, [setBugLogbook]);

  const handleStatusChange = async (bug: BugReportItem, newStatus: string) => {
    try {
      const res = await fetch(`/api/bug-reports/${bug.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      // Update in store
      setBugLogbook(
        (bugLogbook ?? []).map((b) =>
          b.id === bug.id ? { ...b, status: newStatus } : b
        )
      );
    } catch {
      // Ignore
    }
  };

  if (bugLogbook === null) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
            <Bug size={14} className="text-amber-700" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">
            Bug Logbook
            {!isLoading && (
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                ({bugLogbook.length} {bugLogbook.length === 1 ? 'report' : 'reports'})
              </span>
            )}
          </h3>
        </div>
        <button
          onClick={closeBugLogbook}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-400"
        >
          <X size={16} />
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-6 text-center text-sm text-gray-400">Loading...</div>
      )}

      {/* Empty */}
      {!isLoading && bugLogbook.length === 0 && (
        <div className="py-6 text-center text-sm text-gray-400">
          No bug reports yet. Type <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">/bug</code> to create one.
        </div>
      )}

      {/* Bug list */}
      {!isLoading && bugLogbook.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {bugLogbook.map((bug) => {
            const status = STATUS_CONFIG[bug.status] ?? STATUS_CONFIG.open;
            const isExpanded = expandedId === bug.id;

            return (
              <div
                key={bug.id}
                className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : bug.id)}
              >
                {/* Top row */}
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${SEVERITY_COLORS[bug.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                    {bug.severity}
                  </span>
                  <span className="text-xs text-gray-500 truncate flex-1">{bug.page}</span>
                  <span className={`flex items-center gap-1 text-[10px] font-medium ${status.color}`}>
                    {status.icon}
                    {status.label}
                  </span>
                </div>

                {/* Description preview */}
                <p className={`text-sm text-gray-700 mt-1.5 ${isExpanded ? '' : 'line-clamp-2'}`}>
                  {bug.description}
                </p>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    {bug.screenshot && (
                      <div className="space-y-1.5">
                        {/\.(png|jpe?g|webp|gif)(\?|$)/i.test(bug.screenshot) || bug.screenshot.startsWith('/uploads/') ? (
                          <a href={bug.screenshot} target="_blank" rel="noopener noreferrer">
                            <img
                              src={bug.screenshot}
                              alt="Bug screenshot"
                              className="max-h-40 rounded-lg border border-gray-200 object-contain"
                            />
                          </a>
                        ) : (
                          <div className="text-xs text-gray-500">
                            <span className="font-medium">Screenshot:</span>{' '}
                            <a href={bug.screenshot} target="_blank" rel="noopener noreferrer" className="text-teal-600 underline break-all">
                              {bug.screenshot}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      {bug.user?.name ?? bug.user?.email} &middot;{' '}
                      {new Date(bug.createdAt).toLocaleString()}
                    </div>

                    {/* Status toggle */}
                    <div className="flex gap-1.5 pt-1">
                      {['open', 'fixed', 'wontfix'].map((s) => (
                        <button
                          key={s}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(bug, s);
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                            bug.status === s
                              ? 'bg-gray-800 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {s === 'wontfix' ? "Won't Fix" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
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
