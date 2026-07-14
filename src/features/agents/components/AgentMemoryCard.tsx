'use client';

import React from 'react';
import { Brain, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/ui/layout';
import { Button } from '@/components/shared';
import { useFormat } from '@/lib/ui-i18n/format';
import { useAgentMemories, useDeleteAgentMemory } from '../hooks';

/**
 * Memory-lijst op de agent-detail-pagina (agents-scheduling, slice 4):
 * user-bevestigde voorkeuren/feiten die deze agent tussen runs onthoudt.
 * Items ontstaan uitsluitend via het confirm-pad (remember-proposal);
 * hier kan de user ze inzien en verwijderen (acceptatiecriterium).
 */
export function AgentMemoryCard({ agentId }: { agentId: string }) {
  const { t } = useTranslation('agents');
  const { formatRelative } = useFormat();
  const { data: memories, isLoading, isError, refetch } = useAgentMemories(agentId);
  const deleteMemory = useDeleteAgentMemory(agentId);

  return (
    <SectionCard icon={Brain} title={t('detail.memory.title')}>
      <p className="text-sm text-muted-foreground mb-4">{t('detail.memory.subtitle')}</p>

      {isError ? (
        <div className="flex items-center justify-between gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span>{t('detail.memory.loadError')}</span>
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            {t('detail.memory.retry')}
          </Button>
        </div>
      ) : isLoading ? (
        <div data-testid="memory-loading" className="h-10 rounded-lg bg-gray-100 animate-pulse" />
      ) : !memories || memories.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('detail.memory.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {memories.map((memory) => (
            <li
              key={memory.id}
              data-testid="memory-row"
              className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 break-words">{memory.content}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-500 mr-2">
                    {t(`detail.memory.types.${memory.memoryType}`)}
                  </span>
                  {formatRelative(memory.createdAt)}
                </p>
              </div>
              <Button
                data-testid="memory-delete"
                variant="ghost"
                size="sm"
                icon={Trash2}
                disabled={deleteMemory.isPending}
                onClick={() => deleteMemory.mutate(memory.id)}
                aria-label={t('detail.memory.delete')}
              >
                {t('detail.memory.delete')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {deleteMemory.isError && (
        <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
          {t('detail.memory.deleteError')}
        </p>
      )}
    </SectionCard>
  );
}
