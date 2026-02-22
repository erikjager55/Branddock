'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import { usePersonaDetail, useUpdatePersona, useTogglePersonaLock, useGenerateImplications, useDuplicatePersona } from '../../hooks';
import { usePersonaDetailStore } from '../../stores/usePersonaDetailStore';
import { PersonaDetailHeader } from './PersonaDetailHeader';
import { DemographicsSection } from './DemographicsSection';
import { PsychographicsSection } from './PsychographicsSection';
import { GoalsMotivationsCards } from './GoalsMotivationsCards';
import { BehaviorsSection } from './BehaviorsSection';
import { QuoteBioSection } from './QuoteBioSection';
import { ChannelsToolsSection } from './ChannelsToolsSection';
import { BuyingTriggersSection } from './BuyingTriggersSection';
import { ProfileCompletenessCard, ResearchSidebarCard, QuickActionsCard, StrategicImplicationsSidebar } from './sidebar';
import { ChatWithPersonaModal } from '../chat/ChatWithPersonaModal';

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
      <PageShell maxWidth="7xl">
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
      <PageShell maxWidth="7xl">
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
      const labels: Record<string, string> = {
        INTERVIEWS: 'Interview module',
        QUESTIONNAIRE: 'Questionnaire module',
        USER_TESTING: 'User Testing module',
      };
      setStubMessage(`${labels[method] ?? method} coming in a future sprint`);
      setTimeout(() => setStubMessage(null), 3000);
    }
  };

  return (
    <PageShell maxWidth="7xl">
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

        {/* Hero Header */}
        <PersonaDetailHeader
          persona={persona}
          isEditing={isEditing}
          onEditToggle={() => setEditing(!isEditing)}
          onLockToggle={() => toggleLock.mutate(!persona.isLocked)}
          onRegenerate={() => {}}
          onChat={() => setChatModalOpen(true)}
        />

        {/* Stub toast */}
        {stubMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
            {stubMessage}
          </div>
        )}

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content — left column (2/3) */}
          <div className="md:col-span-2 min-w-0 space-y-4">
            {/* Row 1: Demographics (full width) */}
            <DemographicsSection
              persona={persona}
              isEditing={isEditing}
              onUpdate={(data) => updatePersona.mutate(data)}
            />

            {/* Row 2: Quote & Bio (full width) */}
            <QuoteBioSection
              persona={persona}
              isEditing={isEditing}
              onUpdate={(data) => updatePersona.mutate(data)}
            />

            {/* Row 3: Psychographics + Channels (2 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PsychographicsSection
                persona={persona}
                isEditing={isEditing}
                onUpdate={(data) => updatePersona.mutate(data)}
              />
              <ChannelsToolsSection
                persona={persona}
                isEditing={isEditing}
                onUpdate={(data) => updatePersona.mutate(data)}
              />
            </div>

            {/* Row 4: Goals + Motivations + Frustrations (3 columns, internal grid) */}
            <GoalsMotivationsCards
              persona={persona}
              isEditing={isEditing}
              onUpdate={(data) => updatePersona.mutate(data)}
            />

            {/* Row 5: Behaviors + Buying Triggers (2 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BehaviorsSection
                persona={persona}
                isEditing={isEditing}
                onUpdate={(data) => updatePersona.mutate(data)}
              />
              <BuyingTriggersSection
                persona={persona}
                isEditing={isEditing}
                onUpdate={(data) => updatePersona.mutate(data)}
              />
            </div>
          </div>

          {/* Sidebar — right column (1/3), sticky */}
          <div className="min-w-0">
            <div className="md:sticky md:top-6 space-y-4">
              <ProfileCompletenessCard persona={persona} />

              <ResearchSidebarCard
                persona={persona}
                onStartMethod={handleStartMethod}
              />

              <QuickActionsCard
                onChat={() => setChatModalOpen(true)}
                onRegenerate={() => {}}
                onDuplicate={() => duplicatePersona.mutate()}
                onExport={() => {
                  setStubMessage('Export coming in a future sprint');
                  setTimeout(() => setStubMessage(null), 3000);
                }}
                isLocked={persona.isLocked}
              />

              <StrategicImplicationsSidebar
                persona={persona}
                isEditing={isEditing}
                onUpdate={(data) => updatePersona.mutate(data)}
                onGenerate={() => generateImplications.mutate()}
                isGenerating={generateImplications.isPending}
              />
            </div>
          </div>
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
