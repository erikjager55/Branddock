'use client';

import React from 'react';
import { Bot, Inbox, AlertTriangle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { Button, EmptyState } from '@/components/shared';
import { AgentCard } from './AgentCard';
import { useAgentCatalog } from '../hooks';
import { useAgentsStore } from '../stores/useAgentsStore';

/**
 * Agents-catalogus — data-driven op de code-registry (via GET
 * /api/agents). Toont persona-kaarten met rol + use-cases, de
 * afbakenings-copy Claw ↔ Agents (ADR D6) en de ingang naar de
 * results-inbox.
 */
export function AgentsCatalogPage({ onNavigate }: { onNavigate: (section: string) => void }) {
  const { t } = useTranslation('agents');
  const { data: agents, isLoading, isError, refetch } = useAgentCatalog();
  const setSelectedAgentId = useAgentsStore((s) => s.setSelectedAgentId);

  const openAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    onNavigate('agent-detail');
  };

  return (
    <PageShell>
      <PageHeader
        moduleKey="agents"
        title={t('catalog.title')}
        subtitle={t('catalog.subtitle')}
        actions={
          <Button
            data-testid="open-inbox"
            variant="secondary"
            icon={Inbox}
            onClick={() => onNavigate('agents-inbox')}
          >
            {t('catalog.inboxButton')}
          </Button>
        }
      />

      {/* Afbakening Claw (assistent) vs Agents (taken → resultaten) — ADR D6. */}
      <div
        data-testid="agents-scope-note"
        className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-4 mb-8"
      >
        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{t('catalog.scopeNoteTitle')}</p>
          <p className="text-sm text-gray-500 mt-0.5">{t('catalog.scopeNote')}</p>
        </div>
      </div>

      {isError ? (
        <div
          data-testid="catalog-error"
          className="flex flex-col items-center gap-3 py-16 text-center"
        >
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-gray-600">{t('catalog.error.title')}</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            {t('catalog.error.retry')}
          </Button>
        </div>
      ) : isLoading ? (
        <div data-testid="catalog-loading" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-44 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : !agents || agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title={t('catalog.empty.title')}
          description={t('catalog.empty.description')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onOpen={openAgent} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
