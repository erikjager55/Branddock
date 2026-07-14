'use client';

import React, { useState } from 'react';
import { MessageCircle, Inbox, Zap, AlertTriangle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageShell, DetailHeader, SectionCard, SelectionCard } from '@/components/ui/layout';
import { Button, EmptyState } from '@/components/shared';
import { useClawStore } from '@/stores/useClawStore';
import { useFormat } from '@/lib/ui-i18n/format';
import { AgentIconTile } from './AgentIcon';
import { AgentMemoryCard } from './AgentMemoryCard';
import { RunStatusBadge } from './RunStatusBadge';
import { ScheduleManagerCard } from './ScheduleManagerCard';
import { UseCaseForm } from './UseCaseForm';
import { useAgentCatalog, useAgentRuns } from '../hooks';
import { useQuery } from '@tanstack/react-query';
import { useAgentsStore } from '../stores/useAgentsStore';
import { isRunStale } from '../lib/run-utils';

/**
 * Agent-detail: persona-header, klikbare use-cases → input-formulier →
 * run, recente runs van deze agent, en chat via de Claw panel-mode met
 * agent-scoping (ADR D6 — de globale overlay blijft ongewijzigd).
 */
export function AgentDetailPage({
  agentId,
  onBack,
  onNavigate,
}: {
  agentId: string;
  onBack: () => void;
  onNavigate: (section: string) => void;
}) {
  const { t } = useTranslation('agents');
  const { formatRelative } = useFormat();
  const { data: agents, isLoading, isError, refetch } = useAgentCatalog();
  const { data: runs } = useAgentRuns();
  const setInboxFocusRunId = useAgentsStore((s) => s.setInboxFocusRunId);
  const openClawForAgent = useClawStore((s) => s.openClawForAgent);
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(null);

  const agent = agents?.find((candidate) => candidate.id === agentId);
  // Lege-staat-gate voor de ads-watchdog (tasks/agent-ads-watchdog.md):
  // zonder gekoppeld account weigert de run-route (400) — leg dat hier uit
  // mét koppel-CTA i.p.v. de user tegen de foutmelding te laten aanlopen.
  const { data: adAccounts } = useQuery<{ accounts?: Array<{ status: string }> }>({
    queryKey: ['ad-accounts', 'gate'],
    queryFn: async () => {
      const res = await fetch('/api/ad-accounts');
      if (!res.ok) throw new Error('ad-accounts fetch failed');
      return res.json();
    },
    enabled: agentId === 'ads-watchdog',
    staleTime: 30_000,
  });
  const needsAdAccount =
    agentId === 'ads-watchdog' &&
    adAccounts !== undefined &&
    !(adAccounts.accounts ?? []).some((a) => a.status === 'active');
  const agentRuns = (runs ?? []).filter((run) => run.agentId === agentId).slice(0, 5);

  const viewInInbox = (runId: string) => {
    setInboxFocusRunId(runId);
    onNavigate('agents-inbox');
  };

  if (isLoading) {
    return (
      <PageShell maxWidth="5xl">
        <div data-testid="agent-detail-loading" className="space-y-4 pt-4">
          <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell maxWidth="5xl">
        <div
          data-testid="agent-detail-error"
          className="flex flex-col items-center gap-3 py-16 text-center"
        >
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-gray-600">{t('catalog.error.title')}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              {t('catalog.error.retry')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onBack}>
              {t('detail.back')}
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!agent) {
    return (
      <PageShell maxWidth="5xl">
        <EmptyState
          icon={AlertTriangle}
          title={t('detail.notFound.title')}
          description={t('detail.notFound.description')}
          action={{ label: t('detail.back'), onClick: onBack, variant: 'secondary' }}
        />
      </PageShell>
    );
  }

  const selectedUseCase = agent.useCases.find((useCase) => useCase.id === selectedUseCaseId);

  return (
    <PageShell maxWidth="5xl">
      <DetailHeader
        onBack={onBack}
        backLabel={t('detail.back')}
        title={agent.persona.name}
        subtitle={agent.persona.role}
        avatar={<AgentIconTile iconName={agent.persona.icon} size="lg" />}
        actions={
          <>
            <Button
              data-testid="agent-chat-button"
              variant="secondary"
              icon={MessageCircle}
              onClick={() =>
                openClawForAgent({
                  agentId: agent.id,
                  personaName: agent.persona.name,
                  personaRole: agent.persona.role,
                })
              }
            >
              {t('detail.chatButton', { name: agent.persona.name })}
            </Button>
            <Button
              data-testid="agent-inbox-button"
              variant="ghost"
              icon={Inbox}
              onClick={() => onNavigate('agents-inbox')}
            >
              {t('detail.inboxButton')}
            </Button>
          </>
        }
      />

      <div className="space-y-8">
        <SectionCard
          icon={Zap}
          title={t('detail.useCasesTitle', { name: agent.persona.name })}
        >
          <p className="text-sm text-muted-foreground mb-4">{t('detail.useCasesSubtitle')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {agent.useCases.map((useCase) => (
              <SelectionCard
                key={useCase.id}
                title={useCase.label}
                selected={selectedUseCaseId === useCase.id}
                onSelect={() => setSelectedUseCaseId(useCase.id)}
              />
            ))}
          </div>
          {selectedUseCase && (
            <UseCaseForm
              key={selectedUseCase.id}
              agentId={agent.id}
              useCase={selectedUseCase}
              onViewInInbox={viewInInbox}
            />
          )}
        </SectionCard>

        {needsAdAccount && (
          <SectionCard title={t('detail.adAccountGate.title')}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-gray-600">{t('detail.adAccountGate.body')}</p>
                <a href="/settings/integrations/ad-accounts" className="inline-block mt-3">
                  <Button size="sm">{t('detail.adAccountGate.cta')}</Button>
                </a>
              </div>
            </div>
          </SectionCard>
        )}

        <ScheduleManagerCard agentId={agent.id} useCases={agent.useCases} />

        <AgentMemoryCard agentId={agent.id} />

        <SectionCard icon={Inbox} title={t('detail.recentRuns.title')}>
          {agentRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('detail.recentRuns.empty')}</p>
          ) : (
            <ul className="space-y-1">
              {agentRuns.map((run) => (
                <li key={run.id}>
                  <button
                    type="button"
                    data-testid="recent-run-row"
                    onClick={() => viewInInbox(run.id)}
                    className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-gray-50 rounded-lg px-2 transition-colors"
                  >
                    <RunStatusBadge status={run.status} stale={isRunStale(run)} />
                    <span className="text-sm text-gray-600 truncate flex-1">
                      {run.error ?? t('detail.result.artifacts', { count: run.artifacts.length })}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatRelative(run.createdAt)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('agents-inbox')}>
              {t('detail.recentRuns.viewAll')}
            </Button>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
