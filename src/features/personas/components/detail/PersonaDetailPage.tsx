'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import { usePersonaDetail, useUpdatePersona, useTogglePersonaLock, useGenerateImplications, useDuplicatePersona } from '../../hooks';
import { usePersonaDetailStore } from '../../stores/usePersonaDetailStore';
import { PersonaDetailHeader } from './PersonaDetailHeader';
import { PersonaActionBar } from './PersonaActionBar';
import { DemographicsSection } from './DemographicsSection';
import { PsychographicsSection } from './PsychographicsSection';
import { GoalsMotivationsCards } from './GoalsMotivationsCards';
import { BehaviorsSection } from './BehaviorsSection';
import { StrategicImplicationsSection } from './StrategicImplicationsSection';
import { ResearchMethodsSection } from './ResearchMethodsSection';
import { ChatWithPersonaModal } from '../chat/ChatWithPersonaModal';
import { WhatArePersonasPanel } from '../WhatArePersonasPanel';

interface PersonaDetailPageProps {
  personaId: string;
  onBack: () => void;
  onNavigateToAnalysis: () => void;
}

export function PersonaDetailPage({ personaId, onBack, onNavigateToAnalysis }: PersonaDetailPageProps) {
  const { data: persona, isLoading } = usePersonaDetail(personaId);
  const updatePersona = useUpdatePersona(personaId);
  const toggleLock = useTogglePersonaLock(personaId);
  const generateImplications = useGenerateImplications(personaId);
  const duplicatePersona = useDuplicatePersona(personaId);
  const [stubMessage, setStubMessage] = useState<string | null>(null);

  const isEditing = usePersonaDetailStore((s) => s.isEditing);
  const setEditing = usePersonaDetailStore((s) => s.setEditing);
  const isChatModalOpen = usePersonaDetailStore((s) => s.isChatModalOpen);
  const setChatModalOpen = usePersonaDetailStore((s) => s.setChatModalOpen);

  if (isLoading) {
    return (
      <PageShell maxWidth="5xl">
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageShell>
    );
  }

  if (!persona) {
    return (
      <PageShell maxWidth="5xl">
        <div className="text-center text-gray-500">
          Persona not found.
        </div>
      </PageShell>
    );
  }

  const handleStartMethod = (method: string) => {
    if (method === 'AI_EXPLORATION') {
      onNavigateToAnalysis();
    } else {
      // Stub for other research methods
      const labels: Record<string, string> = {
        INTERVIEWS: 'Interview module',
        QUESTIONNAIRE: 'Questionnaire module',
        USER_TESTING: 'User Testing module',
      };
      setStubMessage(`${labels[method] ?? method} coming in a future sprint`);
      setTimeout(() => setStubMessage(null), 3000);
    }
  };

  const handleDuplicate = () => {
    duplicatePersona.mutateAsync().then(() => {
      onBack();
    });
  };

  return (
    <PageShell maxWidth="5xl">
      <div data-testid="persona-detail" className="space-y-6">
        {/* Breadcrumb */}
        <button
          data-testid="persona-detail-back"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Personas
        </button>

        {/* Header (now includes Edit/Regenerate/Lock buttons) */}
        <PersonaDetailHeader
          persona={persona}
          isEditing={isEditing}
          onEditToggle={() => setEditing(!isEditing)}
          onLockToggle={() => toggleLock.mutate(!persona.isLocked)}
          onRegenerate={() => {}}
        />

        {/* Action Bar (Duplicate + Chat only) */}
        <PersonaActionBar
          persona={persona}
          onChat={() => setChatModalOpen(true)}
          onDuplicate={handleDuplicate}
          isDuplicating={duplicatePersona.isPending}
        />

        {/* What Are Personas Panel */}
        <WhatArePersonasPanel />

        {/* Stub toast */}
        {stubMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
            {stubMessage}
          </div>
        )}

        {/* Sections */}
        <div className="space-y-8">
          <DemographicsSection
            persona={persona}
            isEditing={isEditing}
            onUpdate={(data) => updatePersona.mutate(data)}
          />

          <PsychographicsSection
            persona={persona}
            isEditing={isEditing}
            onUpdate={(data) => updatePersona.mutate(data)}
          />

          <GoalsMotivationsCards
            persona={persona}
            isEditing={isEditing}
            onUpdate={(data) => updatePersona.mutate(data)}
          />

          <BehaviorsSection
            persona={persona}
            isEditing={isEditing}
            onUpdate={(data) => updatePersona.mutate(data)}
          />

          <StrategicImplicationsSection
            persona={persona}
            isEditing={isEditing}
            onUpdate={(data) => updatePersona.mutate(data)}
            onGenerate={() => generateImplications.mutate()}
            isGenerating={generateImplications.isPending}
          />

          <ResearchMethodsSection
            persona={persona}
            onStartMethod={handleStartMethod}
          />
        </div>

        {/* Chat Modal */}
        {isChatModalOpen && (
          <ChatWithPersonaModal
            persona={persona}
            isOpen={isChatModalOpen}
            onClose={() => setChatModalOpen(false)}
          />
        )}
      </div>
    </PageShell>
  );
}
