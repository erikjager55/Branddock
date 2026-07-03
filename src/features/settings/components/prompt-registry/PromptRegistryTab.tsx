'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileCode, Activity, Clock, AlertCircle, BarChart3, List } from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/shared';
import {
  usePromptRegistry,
  usePromptDetail,
} from '@/features/settings/hooks/use-prompt-registry';
import type { PromptRegistryEntry, PromptVersionDetail } from '@/features/settings/api/prompt-registry.api';
import { useFormat } from '@/lib/ui-i18n/format';
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
  const { t } = useTranslation('settings-misc');
  const [view, setView] = useState<TabView>('dashboard');
  const [selectedIdentifier, setSelectedIdentifier] = useState<string | null>(null);
  const { data: prompts, isLoading, error } = usePromptRegistry();

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <header className="px-8 pt-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('prompts.heading')}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('prompts.description')}
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
              {t('prompts.dashboard')}
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
              {t('prompts.registry')}
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
          {t('prompts.loadingRegistry')}
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={AlertCircle}
            title={t('prompts.loadFailedTitle')}
            description={error instanceof Error ? error.message : t('prompts.unknownError')}
          />
        </div>
      ) : !prompts || prompts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={FileCode}
            title={t('prompts.emptyTitle')}
            description={t('prompts.emptyDescription')}
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
                {t('prompts.selectPrompt')}
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
  const { t } = useTranslation('settings-misc');
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
          {t('prompts.list.calls', { count: prompt.callCount })}
        </span>
        <span>{t('prompts.list.versions', { count: prompt.uniqueVersions })}</span>
        {errorRate > 0 && (
          <span className="text-red-600">{t('prompts.list.errors', { rate: errorRate })}</span>
        )}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function PromptDetail({ identifier }: { identifier: string }) {
  const { t } = useTranslation('settings-misc');
  const { data: detail, isLoading, error } = usePromptDetail(identifier);

  if (isLoading) {
    return <div className="text-sm text-gray-400">{t('prompts.detail.loading')}</div>;
  }
  if (error || !detail) {
    return (
      <div className="text-sm text-red-600">
        {t('prompts.detail.loadFailed', { message: error instanceof Error ? error.message : t('prompts.unknownError') })}
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
          {t('prompts.detail.uniqueVersions', { count: detail.versionCount })}
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
  const { t } = useTranslation('settings-misc');
  const { formatDate } = useFormat();
  const [expanded, setExpanded] = useState(index === 0);
  const errorRate =
    version.callCount > 0
      ? Math.round((version.errorCount / version.callCount) * 100)
      : 0;
  const propEvalPassRate = version.propertyEvalPassRate;
  const propEvalHighlight = propEvalPassRate !== null && propEvalPassRate < 80;

  return (
    <Card>
      <Card.Header>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant={index === 0 ? 'success' : 'default'}>
                {index === 0 ? t('prompts.version.current') : `v${version.callCount > 0 ? '' : 'unused-'}${version.contentHash.slice(0, 8)}`}
              </Badge>
              {/* Semver badge — content-test #5.A foundation */}
              {version.promptVersion && (
                <Badge variant="info">
                  v{version.promptVersion}
                </Badge>
              )}
              {version.gitSha && (
                <span className="text-xs text-gray-500 font-mono">
                  {version.gitSha.slice(0, 7)}
                </span>
              )}
              <span className="text-xs text-gray-500">
                {formatDate(new Date(version.firstSeenAt))}
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
            {expanded ? t('prompts.version.collapse') : t('prompts.version.expand')}
          </button>
        </div>
      </Card.Header>
      <Card.Body>
        <div className="grid grid-cols-5 gap-4 text-xs mb-4">
          <Stat label={t('prompts.stat.calls')} value={version.callCount.toString()} icon={Activity} />
          <Stat
            label={t('prompts.stat.avgLatency')}
            value={`${version.avgLatencyMs}ms`}
            icon={Clock}
          />
          <Stat
            label={t('prompts.stat.tokens')}
            value={`${version.totalInputTokens}/${version.totalOutputTokens}`}
          />
          <Stat
            label={t('prompts.stat.errors')}
            value={errorRate > 0 ? `${errorRate}%` : '0'}
            highlight={errorRate > 0}
          />
          {/* Layer 1 property-eval pass-rate — content-test #5.A */}
          <Stat
            label={t('prompts.stat.layer1Pass')}
            value={
              propEvalPassRate !== null
                ? `${propEvalPassRate}% (${version.propertyEvalRunCount})`
                : '—'
            }
            highlight={propEvalHighlight}
          />
        </div>
        {(version.propertyEvalTotalBlock > 0 || version.propertyEvalTotalWarn > 0) && (
          <div className="text-xs text-gray-600 mb-3 -mt-2">
            {t('prompts.version.layer1Totals', { block: version.propertyEvalTotalBlock, warn: version.propertyEvalTotalWarn })}
          </div>
        )}

        {expanded && (
          <div className="space-y-3 pt-3 border-t border-gray-100">
            {version.model && (
              <div className="text-xs">
                <span className="text-gray-500">{t('prompts.version.model')}</span>{' '}
                <span className="font-mono text-gray-900">{version.model}</span>
              </div>
            )}
            {version.params != null && (
              <div className="text-xs">
                <div className="text-gray-500 mb-1">{t('prompts.version.params')}</div>
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
