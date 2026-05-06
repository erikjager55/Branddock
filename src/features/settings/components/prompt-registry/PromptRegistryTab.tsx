'use client';

import { useState } from 'react';
import { FileCode, Activity, Clock, AlertCircle, BarChart3, List } from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/shared';
import {
  usePromptRegistry,
  usePromptDetail,
} from '@/features/settings/hooks/use-prompt-registry';
import type { PromptRegistryEntry, PromptVersionDetail } from '@/features/settings/api/prompt-registry.api';
import { PromptUsageDashboard } from './PromptUsageDashboard';

type TabView = 'dashboard' | 'registry';

/**
 * AI Prompts Registry — read-only Settings page (Phase 6, niveau A).
 *
 * Lists all unique AI prompt-templates used in this workspace based on
 * `AICallSnapshot.sourceIdentifier`. Per template:
 * - Aggregate stats (calls, avg latency, total tokens, error rate)
 * - Version history (one entry per content-hash)
 * - Per-version payload preview (system + user messages, model, params)
 *
 * Developer-only access. No editing — prompts blijven TS-resident
 * (zie beslissing 5: niveau A = read-only registry).
 */
export function PromptRegistryTab() {
  const [view, setView] = useState<TabView>('dashboard');
  const [selectedIdentifier, setSelectedIdentifier] = useState<string | null>(null);
  const { data: prompts, isLoading, error } = usePromptRegistry();

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <header className="px-8 pt-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Prompts</h2>
            <p className="text-sm text-gray-500 mt-1">
              Read-only view of all AI prompt-templates in use. Dashboard shows
              30-day aggregates; registry has version history per template.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1.5 transition-colors ${
                view === 'dashboard'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setView('registry')}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1.5 transition-colors ${
                view === 'registry'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Registry
            </button>
          </div>
        </div>
      </header>

      {view === 'dashboard' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <PromptUsageDashboard />
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Loading prompt registry…
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={AlertCircle}
            title="Failed to load prompts"
            description={error instanceof Error ? error.message : 'Unknown error'}
          />
        </div>
      ) : !prompts || prompts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={FileCode}
            title="No prompts tracked yet"
            description="AI prompts appear here once tracking is wired into a route. Trigger any AI flow to see entries."
          />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex">
          {/* Left: list */}
          <div className="w-96 border-r border-gray-200 overflow-y-auto p-4 space-y-2">
            {prompts.map((p) => (
              <PromptListItem
                key={p.sourceIdentifier}
                prompt={p}
                isSelected={p.sourceIdentifier === selectedIdentifier}
                onSelect={() => setSelectedIdentifier(p.sourceIdentifier)}
              />
            ))}
          </div>

          {/* Right: detail */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedIdentifier ? (
              <PromptDetail identifier={selectedIdentifier} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                Select a prompt to see version history and payload preview.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function PromptListItem({
  prompt,
  isSelected,
  onSelect,
}: {
  prompt: PromptRegistryEntry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const errorRate =
    prompt.callCount > 0
      ? Math.round((prompt.errorCount / prompt.callCount) * 100)
      : 0;
  const shortName = prompt.sourceIdentifier.split(':').pop() ?? prompt.sourceIdentifier;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-medium text-sm text-gray-900 truncate flex-1">
          {shortName}
        </div>
        <Badge variant={prompt.sourceType === 'db-config' ? 'info' : 'default'}>
          {prompt.sourceType}
        </Badge>
      </div>
      <div className="text-xs text-gray-500 truncate mb-2 font-mono">
        {prompt.sourceIdentifier}
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          {prompt.callCount} calls
        </span>
        <span>{prompt.uniqueVersions} versions</span>
        {errorRate > 0 && (
          <span className="text-red-600">{errorRate}% errors</span>
        )}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function PromptDetail({ identifier }: { identifier: string }) {
  const { data: detail, isLoading, error } = usePromptDetail(identifier);

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading detail…</div>;
  }
  if (error || !detail) {
    return (
      <div className="text-sm text-red-600">
        Failed to load detail: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-mono text-sm text-gray-700 break-all">
          {detail.sourceIdentifier}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {detail.versionCount} unique version{detail.versionCount === 1 ? '' : 's'}
        </p>
      </div>

      <div className="space-y-4">
        {detail.versions.map((v, i) => (
          <VersionCard key={v.snapshotId} version={v} index={i} />
        ))}
      </div>
    </div>
  );
}

function VersionCard({ version, index }: { version: PromptVersionDetail; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const errorRate =
    version.callCount > 0
      ? Math.round((version.errorCount / version.callCount) * 100)
      : 0;

  return (
    <Card>
      <Card.Header>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={index === 0 ? 'success' : 'default'}>
                {index === 0 ? 'Current' : `v${version.callCount > 0 ? '' : 'unused-'}${version.contentHash.slice(0, 8)}`}
              </Badge>
              {version.gitSha && (
                <span className="text-xs text-gray-500 font-mono">
                  {version.gitSha.slice(0, 7)}
                </span>
              )}
              <span className="text-xs text-gray-500">
                {new Date(version.firstSeenAt).toLocaleDateString()}
              </span>
            </div>
            <div className="text-xs text-gray-600 font-mono break-all">
              {version.contentHash.slice(0, 16)}…
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </Card.Header>
      <Card.Body>
        <div className="grid grid-cols-4 gap-4 text-xs mb-4">
          <Stat label="Calls" value={version.callCount.toString()} icon={Activity} />
          <Stat
            label="Avg latency"
            value={`${version.avgLatencyMs}ms`}
            icon={Clock}
          />
          <Stat
            label="Tokens (in/out)"
            value={`${version.totalInputTokens}/${version.totalOutputTokens}`}
          />
          <Stat
            label="Errors"
            value={errorRate > 0 ? `${errorRate}%` : '0'}
            highlight={errorRate > 0}
          />
        </div>

        {expanded && (
          <div className="space-y-3 pt-3 border-t border-gray-100">
            {version.model && (
              <div className="text-xs">
                <span className="text-gray-500">Model:</span>{' '}
                <span className="font-mono text-gray-900">{version.model}</span>
              </div>
            )}
            {version.params != null && (
              <div className="text-xs">
                <div className="text-gray-500 mb-1">Params:</div>
                <pre className="bg-gray-50 p-2 rounded text-[11px] font-mono overflow-x-auto">
                  {JSON.stringify(version.params, null, 2)}
                </pre>
              </div>
            )}
            {version.messages.map((m, i) => (
              <div key={i} className="text-xs">
                <div className="text-gray-500 mb-1">{m.role}:</div>
                <pre className="bg-gray-50 p-2 rounded text-[11px] font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                  {m.content}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-gray-500 mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div
        className={`font-medium ${highlight ? 'text-red-600' : 'text-gray-900'}`}
      >
        {value}
      </div>
    </div>
  );
}
