// ─── AI Persona Analysis — Thin Wrapper ─────────────────────
// Delegates to the generic AIExplorationPage with persona-specific config.
// All logic lives in the universal ai-exploration module.
// Fetches the latest session to support resume/view results.
// ────────────────────────────────────────────────────────────

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AIExplorationPage } from '@/components/ai-exploration';
import type { ResumeSessionData } from '@/components/ai-exploration';
import type { BackendDimension } from '@/components/ai-exploration/types';
import { usePersonaDetail, useUpdatePersona } from '../../hooks';
import { PERSONA_DIMENSIONS } from '../../constants/persona-exploration-config';
import { SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import * as explorationApi from '@/lib/api/exploration.api';

interface AIPersonaAnalysisPageProps {
  personaId: string;
  onBack: () => void;
}

export function AIPersonaAnalysisPage({ personaId, onBack }: AIPersonaAnalysisPageProps) {
  const { data: persona } = usePersonaDetail(personaId);
  const updatePersona = useUpdatePersona(personaId);
  const queryClient = useQueryClient();

  // Fetch latest exploration session for this persona
  const { data: latestData, isLoading: isLoadingLatest } = useQuery({
    queryKey: ['exploration-latest', 'persona', personaId],
    queryFn: () => explorationApi.fetchLatestExplorationSession('persona', personaId),
    staleTime: 0, // Always fetch fresh on navigation
  });

  if (!persona || isLoadingLatest) {
    return (
      <PageShell>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageShell>
    );
  }

  // Build resumeSession from latest data if session exists
  let resumeSession: ResumeSessionData | null = null;
  if (latestData?.session) {
    const s = latestData.session;
    const metadata = s.metadata as Record<string, unknown> | null;
    const dimensions = (metadata?.dimensions as BackendDimension[] | undefined) ?? undefined;

    resumeSession = {
      sessionId: s.id,
      status: s.status,
      messages: s.messages,
      progress: s.progress,
      answeredDimensions: s.answeredDimensions,
      dimensions,
      insightsData: s.insightsData ?? undefined,
    };
  }

  return (
    <AIExplorationPage
      resumeSession={resumeSession}
      config={{
        itemType: 'persona',
        itemId: personaId,
        itemName: persona.name,
        pageTitle: 'AI Persona Analysis',
        pageDescription: 'Answer questions to validate and enrich your persona',
        backLabel: 'Back to Persona',
        onBack,
        dimensions: PERSONA_DIMENSIONS,
        fieldMapping: [], // Field mapping handled by backend persona-builder
        onApplyChanges: async (updates) => {
          await updatePersona.mutateAsync(updates);
          queryClient.invalidateQueries({ queryKey: ['exploration-latest', 'persona', personaId] });
        },
      }}
      onStartSession={() =>
        explorationApi.startExplorationSession('persona', personaId)
      }
      onSendAnswer={(sessionId, content) =>
        explorationApi.sendExplorationAnswer('persona', personaId, sessionId, content)
      }
      onComplete={(sessionId) =>
        explorationApi.completeExploration('persona', personaId, sessionId)
      }
    />
  );
}
