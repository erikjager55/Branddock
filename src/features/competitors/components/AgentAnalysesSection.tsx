'use client';

// =============================================================
// Agent-analyses op de Competitors-pagina (agents-domain-integraties).
//
// Marco's (Market Analyst) geaccepteerde concurrentie-analyses landen als
// KnowledgeResource met category 'competitor-analysis' (accept-
// materialisatie); deze sectie maakt ze zichtbaar in de module waar ze
// thuishoren — domain-first write-through, dogfood-feedback 2026-07-06.
// De volledige markdown wordt lazy per analyse opgehaald bij uitklappen.
// =============================================================

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bot, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { MarkdownContent } from '@/features/claw/components/MarkdownContent';

interface AnalysisResource {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  isArchived: boolean;
}

async function fetchAnalyses(): Promise<AnalysisResource[]> {
  const res = await fetch(
    '/api/knowledge?category=competitor-analysis&sortBy=createdAt&sortOrder=desc',
  );
  if (!res.ok) throw new Error('Failed to load agent analyses');
  const data = (await res.json()) as { resources?: AnalysisResource[] };
  return (data.resources ?? []).filter((r) => !r.isArchived);
}

async function fetchAnalysisContent(id: string): Promise<string> {
  const res = await fetch(`/api/knowledge/${id}`);
  if (!res.ok) throw new Error('Failed to load analysis');
  const data = (await res.json()) as { resource?: { content?: string | null } };
  return data.resource?.content ?? '';
}

export function AgentAnalysesSection() {
  const { t, i18n } = useTranslation('competitors');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const analyses = useQuery({
    queryKey: ['knowledge-resources', 'competitor-analysis'],
    queryFn: fetchAnalyses,
    staleTime: 30_000,
  });

  const detail = useQuery({
    queryKey: ['knowledge-resources', 'competitor-analysis', expandedId],
    queryFn: () => fetchAnalysisContent(expandedId as string),
    enabled: expandedId !== null,
  });

  // Geen analyses = geen sectie — de pagina blijft schoon tot Marco iets
  // oplevert dat de user accepteert.
  if (!analyses.data || analyses.data.length === 0) return null;

  return (
    <section aria-labelledby="agent-analyses-heading" data-testid="agent-analyses-section">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-4 h-4 text-emerald-500" />
        <h2 id="agent-analyses-heading" className="text-sm font-semibold text-gray-900">
          {t('agentAnalyses.title')}
        </h2>
        <span className="text-xs text-gray-500">{t('agentAnalyses.subtitle')}</span>
      </div>
      <div className="space-y-2">
        {analyses.data.map((analysis) => {
          const expanded = expandedId === analysis.id;
          return (
            <div key={analysis.id} className="rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                aria-expanded={expanded}
                aria-controls={`agent-analysis-${analysis.id}`}
                onClick={() => setExpandedId(expanded ? null : analysis.id)}
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{analysis.title}</p>
                  {analysis.description && (
                    <p className="truncate text-xs text-gray-500">{analysis.description}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {new Date(analysis.createdAt).toLocaleDateString(i18n.language, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </button>
              {expanded && (
                <div
                  id={`agent-analysis-${analysis.id}`}
                  className="border-t border-gray-100 px-4 py-3"
                  style={{ maxHeight: 480, overflowY: 'auto' }}
                >
                  {detail.isLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('agentAnalyses.loading')}
                    </div>
                  )}
                  {detail.isError && (
                    <p className="text-sm text-red-600">{t('agentAnalyses.loadError')}</p>
                  )}
                  {detail.data && <MarkdownContent content={detail.data} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
