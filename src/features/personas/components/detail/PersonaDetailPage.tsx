'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import { LockBanner, LockOverlay, LockConfirmDialog } from '@/components/lock';
import { useLockState } from '@/hooks/useLockState';
import { useLockVisibility } from '@/hooks/useLockVisibility';
import { usePersonaDetail, useUpdatePersona, useGenerateImplications, useDuplicatePersona, personaKeys } from '../../hooks';
import { useQueryClient } from '@tanstack/react-query';
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
import { exportPersonaPdf } from '../../utils/exportPersonaPdf';

interface PersonaDetailPageProps {
  personaId: string;
  onBack: () => void;
  onNavigateToAnalysis: () => void;
}

export function PersonaDetailPage({ personaId, onBack, onNavigateToAnalysis }: PersonaDetailPageProps) {
  const { data: persona, isLoading } = usePersonaDetail(personaId);
  const updatePersona = useUpdatePersona(personaId);
  const generateImplications = useGenerateImplications(personaId);
  const duplicatePersona = useDuplicatePersona(personaId);
  const [stubMessage, setStubMessage] = useState<string | null>(null);

  const isEditing = usePersonaDetailStore((s) => s.isEditing);
  const setEditing = usePersonaDetailStore((s) => s.setEditing);
  const isChatModalOpen = usePersonaDetailStore((s) => s.isChatModalOpen);
  const setChatModalOpen = usePersonaDetailStore((s) => s.setChatModalOpen);

  const queryClient = useQueryClient();

  // Lock state & visibility
  const lockState = useLockState({
    entityType: 'personas',
    entityId: personaId,
    entityName: persona?.name ?? 'Persona',
    initialState: {
      isLocked: persona?.isLocked ?? false,
      lockedAt: persona?.lockedAt ?? null,
      lockedBy: persona?.lockedBy ?? null,
    },
    onLockChange: () => {
      queryClient.invalidateQueries({ queryKey: personaKeys.detail(personaId) });
      queryClient.invalidateQueries({ queryKey: personaKeys.list() });
    },
  });
  const visibility = useLockVisibility(lockState.isLocked);

  // Force editing off when locked
  useEffect(() => {
    if (lockState.isLocked && isEditing) {
      setEditing(false);
    }
  }, [lockState.isLocked, isEditing, setEditing]);

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
          lockState={lockState}
          visibility={visibility}
          onEditToggle={() => setEditing(!isEditing)}
          onChat={() => setChatModalOpen(true)}
        />

        {/* Lock Banner */}
        <LockBanner
          isLocked={lockState.isLocked}
          onUnlock={lockState.requestToggle}
          lockedBy={lockState.lockedBy}
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
            {/* Row 1: Demographics (full width) — always visible, overlay when locked */}
            <LockOverlay isLocked={lockState.isLocked}>
              <DemographicsSection
                persona={persona}
                isEditing={isEditing}
                onUpdate={(data) => updatePersona.mutate(data)}
              />
            </LockOverlay>

            {/* Row 2: Quote & Bio — visible if filled, overlay when locked */}
            {(persona.quote || persona.bio || !lockState.isLocked) && (
              <LockOverlay isLocked={lockState.isLocked}>
                <QuoteBioSection
                  persona={persona}
                  isEditing={isEditing}
                  onUpdate={(data) => updatePersona.mutate(data)}
                />
              </LockOverlay>
            )}

            {/* Row 3: Psychographics + Channels — overlay when locked */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <LockOverlay isLocked={lockState.isLocked}>
                <PsychographicsSection
                  persona={persona}
                  isEditing={isEditing}
                  onUpdate={(data) => updatePersona.mutate(data)}
                />
              </LockOverlay>
              {((persona.preferredChannels?.length ?? 0) > 0 || (persona.techStack?.length ?? 0) > 0 || !lockState.isLocked) && (
                <LockOverlay isLocked={lockState.isLocked}>
                  <ChannelsToolsSection
                    persona={persona}
                    isEditing={isEditing}
                    onUpdate={(data) => updatePersona.mutate(data)}
                  />
                </LockOverlay>
              )}
            </div>

            {/* Row 4: Goals + Motivations + Frustrations — overlay when locked */}
            <LockOverlay isLocked={lockState.isLocked}>
              <GoalsMotivationsCards
                persona={persona}
                isEditing={isEditing}
                onUpdate={(data) => updatePersona.mutate(data)}
              />
            </LockOverlay>

            {/* Row 5: Behaviors + Buying Triggers — hide empty sections when locked */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {((persona.behaviors?.length ?? 0) > 0 || !lockState.isLocked) && (
                <LockOverlay isLocked={lockState.isLocked}>
                  <BehaviorsSection
                    persona={persona}
                    isEditing={isEditing}
                    onUpdate={(data) => updatePersona.mutate(data)}
                  />
                </LockOverlay>
              )}
              {((persona.buyingTriggers?.length ?? 0) > 0 || (persona.decisionCriteria?.length ?? 0) > 0 || !lockState.isLocked) && (
                <LockOverlay isLocked={lockState.isLocked}>
                  <BuyingTriggersSection
                    persona={persona}
                    isEditing={isEditing}
                    onUpdate={(data) => updatePersona.mutate(data)}
                  />
                </LockOverlay>
              )}
            </div>
          </div>

          {/* Sidebar — right column (1/3), sticky */}
          <div className="min-w-0">
            <div className="md:sticky md:top-6 space-y-4">
              <QuickActionsCard
                onChat={() => setChatModalOpen(true)}
                onDuplicate={() => duplicatePersona.mutate()}
                onExportPdf={() => {
                  exportPersonaPdf({
                    name: persona.name,
                    tagline: persona.tagline ?? undefined,
                    location: persona.location ?? undefined,
                    occupation: persona.occupation ?? undefined,
                    quote: persona.quote ?? undefined,
                    bio: persona.bio ?? undefined,
                    age: persona.age ?? undefined,
                    gender: persona.gender ?? undefined,
                    education: persona.education ?? undefined,
                    income: persona.income ?? undefined,
                    familyStatus: persona.familyStatus ?? undefined,
                    personalityType: persona.personalityType ?? undefined,
                    coreValues: persona.coreValues ?? undefined,
                    interests: persona.interests ?? undefined,
                    goals: persona.goals ?? undefined,
                    motivations: persona.motivations ?? undefined,
                    frustrations: persona.frustrations ?? undefined,
                    behaviors: persona.behaviors ?? undefined,
                    preferredChannels: persona.preferredChannels ?? undefined,
                    buyingTriggers: persona.buyingTriggers ?? undefined,
                    strategicImplications: persona.strategicImplications ?? undefined,
                  });
                }}
                isLocked={lockState.isLocked}
              />

              <ProfileCompletenessCard persona={persona} />

              {/* Research sidebar: hide non-started methods when locked */}
              <ResearchSidebarCard
                persona={persona}
                onStartMethod={handleStartMethod}
                isLocked={lockState.isLocked}
              />

              {/* Strategic Implications: show if filled, hide generate when locked */}
              <StrategicImplicationsSidebar
                persona={persona}
                isEditing={isEditing}
                onUpdate={(data) => updatePersona.mutate(data)}
                onGenerate={visibility.showAITools ? () => generateImplications.mutate() : undefined}
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

        {/* Lock Confirm Dialog */}
        <LockConfirmDialog
          isOpen={lockState.showConfirm}
          isLocking={!lockState.isLocked}
          entityName={persona.name}
          onConfirm={lockState.confirmToggle}
          onCancel={lockState.cancelToggle}
        />
      </div>
    </PageShell>
  );
}
