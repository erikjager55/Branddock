'use client';

import React, { useEffect, useState } from 'react';
import {
  Bot,
  ArrowLeft,
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { Button, EmptyState } from '@/components/shared';
import { FILTER_PATTERNS } from '@/lib/constants/design-tokens';
import { useFormat } from '@/lib/ui-i18n/format';
import { resolveAgentIcon } from './AgentIcon';
import { RunStatusBadge } from './RunStatusBadge';
import { ArtifactViewer } from './ArtifactViewer';
import { useAgentCatalog, useAgentRun, useAgentRuns } from '../hooks';
import { useAgentsStore } from '../stores/useAgentsStore';
import { isRunStale } from '../lib/run-utils';
import type { AgentRunSummary, CatalogAgent, RunTriggerFilter } from '../types/agents.types';

const TRIGGER_TABS: Array<{ value: RunTriggerFilter | undefined; labelKey: string }> = [
  { value: undefined, labelKey: 'inbox.filter.all' },
  { value: 'manual', labelKey: 'inbox.filter.manual' },
  { value: 'scheduled', labelKey: 'inbox.filter.scheduled' },
];

/**
 * Results-inbox: alle runs van de workspace met uitklapbare artefact-
 * details (REPORT/TABLE/FINDINGS/LINK/PROPOSAL). Pollt zolang er een
 * actieve run is; stale-RUNNING (>15 min) wordt als "mogelijk
 * vastgelopen" getoond i.p.v. een eeuwige spinner.
 */
export function AgentsInboxPage({ onNavigate }: { onNavigate: (section: string) => void }) {
  const { t } = useTranslation('agents');
  const [triggerFilter, setTriggerFilter] = useState<RunTriggerFilter | undefined>(undefined);
  const { data: runs, isLoading, isError, refetch } = useAgentRuns(triggerFilter);
  const { data: agents } = useAgentCatalog();
  const inboxFocusRunId = useAgentsStore((s) => s.inboxFocusRunId);
  const setInboxFocusRunId = useAgentsStore((s) => s.setInboxFocusRunId);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // One-shot focus vanaf agent-detail ("Bekijk in inbox").
  useEffect(() => {
    if (inboxFocusRunId) {
      setExpandedRunId(inboxFocusRunId);
      setInboxFocusRunId(null);
    }
  }, [inboxFocusRunId, setInboxFocusRunId]);

  const agentById = new Map<string, CatalogAgent>((agents ?? []).map((agent) => [agent.id, agent]));

  return (
    <PageShell>
      <PageHeader
        moduleKey="agents"
        title={t('inbox.title')}
        subtitle={t('inbox.subtitle')}
        actions={
          <Button
            data-testid="inbox-back-to-catalog"
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => onNavigate('agents')}
          >
            {t('inbox.backToCatalog')}
          </Button>
        }
      />

      <div className={`${FILTER_PATTERNS.tabsContainer} w-fit mb-4`} role="tablist">
        {TRIGGER_TABS.map((tab) => {
          const active = triggerFilter === tab.value;
          return (
            <button
              key={tab.labelKey}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`inbox-filter-${tab.value ?? 'all'}`}
              className={`${FILTER_PATTERNS.tabItem} ${
                active ? FILTER_PATTERNS.tabItemActive : FILTER_PATTERNS.tabItemInactive
              }`}
              onClick={() => setTriggerFilter(tab.value)}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {isError ? (
        <div data-testid="inbox-error" className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-gray-600">{t('inbox.error.title')}</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            {t('inbox.error.retry')}
          </Button>
        </div>
      ) : isLoading ? (
        <div data-testid="inbox-loading" className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : !runs || runs.length === 0 ? (
        <EmptyState
          icon={Bot}
          title={t('inbox.empty.title')}
          description={t('inbox.empty.description')}
          action={{ label: t('inbox.empty.cta'), onClick: () => onNavigate('agents') }}
        />
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              agent={agentById.get(run.agentId)}
              expanded={expandedRunId === run.id}
              onToggle={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

// ─── Run card ────────────────────────────────────────────────

function RunCard({
  run,
  agent,
  expanded,
  onToggle,
  onNavigate,
}: {
  run: AgentRunSummary;
  agent: CatalogAgent | undefined;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (section: string) => void;
}) {
  const { t } = useTranslation('agents');
  const { formatRelative, formatCurrency } = useFormat();

  const stale = isRunStale(run);
  const Icon = resolveAgentIcon(agent?.persona.icon ?? 'Bot');
  const needsApproval = run.status === 'AWAITING_CONFIRMATION';

  return (
    <div
      data-testid="run-card"
      data-run-id={run.id}
      className={`bg-white border rounded-xl transition-colors ${
        needsApproval ? 'border-amber-300 ring-1 ring-amber-100' : 'border-gray-200'
      }`}
    >
      <button
        type="button"
        data-testid="run-card-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`run-artifacts-${run.id}`}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#1FD1B2] to-emerald-500 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {agent ? `${agent.persona.name} — ${agent.persona.role}` : run.agentId}
            </span>
            <RunStatusBadge status={run.status} stale={stale} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
            <span>{formatRelative(run.createdAt)}</span>
            {run.triggerType === 'scheduled' && (
              <span
                data-testid="run-scheduled-badge"
                className="inline-flex items-center gap-1 text-gray-500"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                {t('inbox.run.scheduled')}
              </span>
            )}
            {run.totalCostUsd > 0 && (
              <span>
                {t('inbox.run.cost')}: {formatCurrency(run.totalCostUsd, 'USD', { maximumFractionDigits: 4 })}
              </span>
            )}
            {run.latencyMs > 0 && (
              <span>
                {t('inbox.run.duration')}: {(run.latencyMs / 1000).toFixed(1)}s
              </span>
            )}
            <span>{t('inbox.run.artifacts', { count: run.artifacts.length })}</span>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {(run.error || run.truncated || stale) && (
        <div className="px-4 pb-3 space-y-1.5">
          {stale && (
            <p
              data-testid="run-stale-note"
              className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5"
            >
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {t('inbox.run.staleNote')}
            </p>
          )}
          {run.error && (
            <p
              data-testid="run-error"
              className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 break-words"
            >
              {run.error}
            </p>
          )}
          {run.truncated && !run.error && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              {t('inbox.run.truncated')}
            </p>
          )}
        </div>
      )}

      {expanded && (
        <div id={`run-artifacts-${run.id}`} className="border-t border-gray-100 px-4 py-4">
          <RunArtifacts runId={run.id} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
}

// ─── Expanded run detail (full artifacts) ────────────────────

function RunArtifacts({
  runId,
  onNavigate,
}: {
  runId: string;
  onNavigate: (section: string) => void;
}) {
  const { t } = useTranslation('agents');
  const { data: run, isLoading, isError, refetch } = useAgentRun(runId);

  if (isLoading) {
    return (
      <div data-testid="run-detail-loading" className="flex items-center gap-2 text-sm text-gray-400 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (isError || !run) {
    return (
      <div
        data-testid="run-detail-error"
        className="flex items-center justify-between gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
      >
        <span>{t('inbox.run.detailError')}</span>
        <Button size="sm" variant="secondary" onClick={() => refetch()}>
          {t('inbox.run.detailRetry')}
        </Button>
      </div>
    );
  }

  if (run.artifacts.length === 0) {
    return <p className="text-sm text-muted-foreground py-1">{t('inbox.run.noArtifacts')}</p>;
  }

  return (
    <div className="space-y-3">
      {run.artifacts.map((artifact) => (
        <ArtifactViewer
          key={artifact.id}
          artifact={artifact}
          onNavigate={onNavigate}
          agentId={run.agentId}
        />
      ))}
    </div>
  );
}
