'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AgentIconTile } from './AgentIcon';
import type { CatalogAgent } from '../types/agents.types';

/** Catalog persona-card: icon-tile, name, role, use-case chips. */
export function AgentCard({
  agent,
  onOpen,
}: {
  agent: CatalogAgent;
  onOpen: (agentId: string) => void;
}) {
  const { t } = useTranslation('agents');
  const visibleUseCases = agent.useCases.slice(0, 3);
  const remaining = agent.useCases.length - visibleUseCases.length;

  return (
    <button
      type="button"
      data-testid="agent-card"
      data-agent-id={agent.id}
      onClick={() => onOpen(agent.id)}
      className="group text-left bg-white border border-gray-200 rounded-xl p-6 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <AgentIconTile iconName={agent.persona.icon} />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{agent.persona.name}</h3>
            <p className="text-sm text-gray-500 truncate">{agent.persona.role}</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-emerald-500 transition-colors flex-shrink-0 mt-1" />
      </div>

      {agent.useCases.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            {t('catalog.card.useCases')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {visibleUseCases.map((useCase) => (
              <span
                key={useCase.id}
                className="px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-600"
              >
                {useCase.label}
              </span>
            ))}
            {remaining > 0 && (
              <span className="px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-400">
                +{remaining}
              </span>
            )}
          </div>
        </div>
      )}
    </button>
  );
}
