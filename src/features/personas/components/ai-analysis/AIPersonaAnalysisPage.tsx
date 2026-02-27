// ─── AI Persona Analysis — Thin Wrapper ─────────────────────
// Delegates to the generic AIExplorationPage with persona-specific config.
// All logic lives in the universal ai-exploration module.
// ────────────────────────────────────────────────────────────

'use client';

import { AIExplorationPage } from '@/components/ai-exploration';
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

  if (!persona) {
    return (
      <PageShell>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageShell>
    );
  }

  return (
    <AIExplorationPage
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
        onApplyChanges: (updates) => updatePersona.mutateAsync(updates),
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
