'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import { LockBanner, LockOverlay, LockConfirmDialog } from '@/components/lock';
import { useLockState } from '@/hooks/useLockState';
import { useLockVisibility } from '@/hooks/useLockVisibility';
import { usePersonaDetail, useUpdatePersona, useGenerateImplications, useDeletePersona, personaKeys } from '../../hooks';
import { useClawStore } from '@/stores/useClawStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as explorationApi from '@/lib/api/exploration.api';
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
import { DeletePersonaConfirmDialog } from './DeletePersonaConfirmDialog';
import { exportPersonaPdf } from '../../utils/exportPersonaPdf';
import { useFormFillStore, type FormFillField } from '@/stores/useFormFillStore';
import type { UpdatePersonaBody } from '../../types/persona.types';

/**
 * Velden die we exposeren aan de Brand Assistant via `useFormFillStore`.
 * String-velden krijgen scalar setters; string[]-velden accepteren een
 * volledige array OR een comma-separated string en normaliseren naar string[].
 *
 * Bracket-notatie wordt hier NIET gebruikt voor persona — alle array-velden
 * zijn flat string[] zonder objects, dus full-array vervanging is natuurlijker
 * dan per-index assignments. (Bracket-notatie wel relevant voor frameworkData
 * in BrandAssetDetail — andere page-wiring.)
 */
/**
 * String-velden. `nullable: true` velden (quote, bio) accepteren `null` in
 * UpdatePersonaBody; andere velden zijn `string?` en accepteren alleen
 * `undefined`. Bij een AI-fill met null/undefined sturen we voor non-nullable
 * velden een lege string ipv `null` zodat het PATCH-schema niet breekt.
 */
const PERSONA_STRING_FIELDS: ReadonlyArray<{
  key: keyof UpdatePersonaBody;
  label: string;
  nullable: boolean;
}> = [
  { key: 'name', label: 'Naam', nullable: false },
  { key: 'tagline', label: 'Tagline', nullable: false },
  { key: 'age', label: 'Leeftijd', nullable: false },
  { key: 'gender', label: 'Gender', nullable: false },
  { key: 'location', label: 'Locatie', nullable: false },
  { key: 'occupation', label: 'Beroep', nullable: false },
  { key: 'education', label: 'Opleiding', nullable: false },
  { key: 'income', label: 'Inkomen', nullable: false },
  { key: 'familyStatus', label: 'Gezinssituatie', nullable: false },
  { key: 'personalityType', label: 'Persoonlijkheidstype', nullable: false },
  { key: 'strategicImplications', label: 'Strategische implicaties', nullable: false },
  { key: 'quote', label: 'Quote', nullable: true },
  { key: 'bio', label: 'Bio', nullable: true },
];

const PERSONA_ARRAY_FIELDS: ReadonlyArray<{ key: keyof UpdatePersonaBody; label: string }> = [
  { key: 'coreValues', label: 'Core values' },
  { key: 'interests', label: 'Interesses' },
  { key: 'goals', label: 'Doelen' },
  { key: 'motivations', label: 'Motivaties' },
  { key: 'frustrations', label: 'Frustraties' },
  { key: 'behaviors', label: 'Gedragingen' },
  { key: 'preferredChannels', label: 'Voorkeurs-kanalen' },
  { key: 'techStack', label: 'Tech stack' },
  { key: 'buyingTriggers', label: 'Aankoop-triggers' },
  { key: 'decisionCriteria', label: 'Beslissingscriteria' },
];

/** Normaliseer AI-output naar een string-array voor array-velden. */
function normalizeArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string') {
    return value
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

/** Format een array als comma-separated preview, of null wanneer leeg. */
function formatArrayPreview(arr: string[] | null | undefined): string | null {
  if (!arr || arr.length === 0) return null;
  return arr.join(', ');
}

interface PersonaDetailPageProps {
  personaId: string;
  onBack: () => void;
  onNavigateToAnalysis: () => void;
  initialEditing?: boolean;
}

export function PersonaDetailPage({ personaId, onBack, onNavigateToAnalysis, initialEditing }: PersonaDetailPageProps) {
  const { t } = useTranslation('personas');
  const { data: persona, isLoading } = usePersonaDetail(personaId);
  const updatePersona = useUpdatePersona(personaId);
  const generateImplications = useGenerateImplications(personaId);
  const deletePersona = useDeletePersona(personaId);
  const [stubMessage, setStubMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditing = usePersonaDetailStore((s) => s.isEditing);
  const setEditing = usePersonaDetailStore((s) => s.setEditing);
  const isChatModalOpen = usePersonaDetailStore((s) => s.isChatModalOpen);
  const setChatModalOpen = usePersonaDetailStore((s) => s.setChatModalOpen);

  const queryClient = useQueryClient();

  // Fetch latest AI Exploration session for PDF export enrichment
  const { data: explorationData } = useQuery({
    queryKey: ['exploration-latest', 'persona', personaId],
    queryFn: () => explorationApi.fetchLatestExplorationSession('persona', personaId),
    staleTime: 5 * 60 * 1000, // 5 min — not critical for export
    enabled: !!personaId,
  });

  // Set initial editing state from prop (for newly created personas)
  useEffect(() => {
    if (initialEditing) {
      setEditing(true);
    }
  }, [initialEditing, setEditing]);

  // Sync active entity to Brand Assistant
  const setActiveEntity = useClawStore((s) => s.setActiveEntity);
  useEffect(() => {
    if (persona?.id && persona?.name) {
      setActiveEntity({ type: 'persona', id: persona.id, name: persona.name });
    }
    return () => setActiveEntity(null);
  }, [persona?.id, persona?.name, setActiveEntity]);

  // Batched-mutate via microtask: meerdere setters in dezelfde tick (zoals
  // wanneer `fill_form_fields` N assignments synchroon doorloopt) worden
  // in één enkele `updatePersona.mutate({ ...allFields })` call gemerged.
  // Anders zou de UI N parallelle PATCH-calls vuren, één per veld.
  const pendingUpdateRef = useRef<UpdatePersonaBody>({});
  const flushScheduledRef = useRef(false);
  const updatePersonaMutate = updatePersona.mutate;
  const enqueueUpdate = useCallback(
    (partial: UpdatePersonaBody) => {
      pendingUpdateRef.current = { ...pendingUpdateRef.current, ...partial };
      if (flushScheduledRef.current) return;
      flushScheduledRef.current = true;
      queueMicrotask(() => {
        const payload = pendingUpdateRef.current;
        pendingUpdateRef.current = {};
        flushScheduledRef.current = false;
        if (Object.keys(payload).length > 0) {
          updatePersonaMutate(payload);
        }
      });
    },
    [updatePersonaMutate],
  );

  // Lock state & visibility
  const lockState = useLockState({
    entityType: 'personas',
    entityId: personaId,
    entityName: persona?.name ?? t('detail.entityFallback'),
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

  // Form-fill registry — exposeert persona-velden aan de Brand Assistant
  // zodat `fill_form_fields` ze via `updatePersona.mutate()` kan schrijven.
  // Verborgen wanneer locked (alle setters zouden falen op de API anyway).
  const formFillFields = useMemo<FormFillField[]>(() => {
    if (!persona || lockState.isLocked) return [];
    const stringFields = PERSONA_STRING_FIELDS.map<FormFillField>((field) => {
      const current = persona[field.key as keyof typeof persona];
      const currentString = typeof current === 'string' ? current : null;
      return {
        key: field.key,
        label: field.label,
        currentValue: currentString && currentString.trim().length > 0 ? currentString : null,
        setter: (value) => {
          // Null/undefined → '' voor non-nullable velden (PATCH-schema staat
          // null niet toe); voor nullable velden (quote, bio) blijft null
          // expliciet behouden zodat "clear" semantisch correct landt in DB.
          const normalized =
            value == null
              ? field.nullable
                ? null
                : ''
              : String(value);
          enqueueUpdate({ [field.key]: normalized } as UpdatePersonaBody);
        },
      };
    });
    const arrayFields = PERSONA_ARRAY_FIELDS.map<FormFillField>((field) => {
      const current = persona[field.key as keyof typeof persona];
      const currentArray = Array.isArray(current) ? (current as string[]) : null;
      return {
        key: field.key,
        label: field.label,
        currentValue: formatArrayPreview(currentArray),
        setter: (value) => {
          enqueueUpdate({ [field.key]: normalizeArrayValue(value) } as UpdatePersonaBody);
        },
      };
    });
    return [...stringFields, ...arrayFields];
  }, [persona, lockState.isLocked, enqueueUpdate]);

  useEffect(() => {
    useFormFillStore.getState().registerFields(formFillFields);
    return () => {
      useFormFillStore.getState().clearFields();
    };
  }, [formFillFields]);

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
          {t('detail.notFound')}
        </div>
      </PageShell>
    );
  }

  const handleStartMethod = (method: string) => {
    if (method === 'AI_EXPLORATION') {
      onNavigateToAnalysis();
    } else {
      const labels: Record<string, string> = {
        INTERVIEWS: t('detail.stubModule.interviews'),
        QUESTIONNAIRE: t('detail.stubModule.questionnaire'),
        USER_TESTING: t('detail.stubModule.userTesting'),
      };
      setStubMessage(t('detail.comingSoon', { module: labels[method] ?? method }));
      setTimeout(() => setStubMessage(null), 3000);
    }
  };

  const handleSave = () => {
    setEditing(false);
    toast.success(t('detail.savedSuccess'));
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const handleDelete = () => {
    deletePersona.mutate(undefined, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        toast.success(t('detail.deletedSuccess'));
        onBack();
      },
      onError: (error) => {
        setShowDeleteConfirm(false);
        const message = error instanceof Error ? error.message : t('detail.deleteFailed');
        toast.error(message);
      },
    });
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
          {t('detail.backToPersonas')}
        </button>

        {/* Hero Header */}
        <PersonaDetailHeader
          persona={persona}
          isEditing={isEditing}
          lockState={lockState}
          visibility={visibility}
          onEditToggle={() => setEditing(true)}
          onSave={handleSave}
          onCancelEdit={handleCancelEdit}
          onChat={() => setChatModalOpen(true)}
          onUpdate={(data) => updatePersona.mutate(data)}
          onVersionRestore={() => {
            queryClient.invalidateQueries({ queryKey: personaKeys.detail(personaId) });
            queryClient.invalidateQueries({ queryKey: personaKeys.list() });
          }}
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

          {/* Sidebar — right column (1/3), sticky.
              Order: primary research actions first, then validation state,
              then strategic output, then secondary actions (chat/export/delete). */}
          <div className="min-w-0">
            <div className="md:sticky md:top-6 space-y-4">
              {/* Research sidebar: hide non-started methods when locked */}
              <ResearchSidebarCard
                persona={persona}
                onStartMethod={handleStartMethod}
                isLocked={lockState.isLocked}
              />

              <ProfileCompletenessCard persona={persona} />

              {/* Strategic Implications: show if filled, hide generate when locked */}
              <StrategicImplicationsSidebar
                persona={persona}
                isEditing={isEditing}
                onUpdate={(data) => updatePersona.mutate(data)}
                onGenerate={visibility.showAITools ? () => generateImplications.mutate() : undefined}
                isGenerating={generateImplications.isPending}
              />

              <QuickActionsCard
                onChat={() => setChatModalOpen(true)}
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
                    exploration: explorationData?.session?.insightsData ? {
                      dimensions: explorationData.session.insightsData.dimensions?.map(d => ({
                        key: d.key ?? '',
                        title: d.title ?? d.key ?? '',
                        summary: d.summary ?? '',
                      })),
                      findings: explorationData.session.insightsData.findings?.map(f => ({
                        title: f.title ?? '',
                        description: f.description ?? '',
                      })),
                      recommendations: explorationData.session.insightsData.recommendations,
                      executiveSummary: explorationData.session.insightsData.executiveSummary,
                      completedAt: explorationData.session.createdAt,
                    } : undefined,
                  });
                }}
                onDelete={() => setShowDeleteConfirm(true)}
                isLocked={lockState.isLocked}
                isDeleting={deletePersona.isPending}
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

        {/* Delete Confirm Dialog */}
        {showDeleteConfirm && (
          <DeletePersonaConfirmDialog
            personaName={persona?.name ?? t('detail.thisPersona')}
            isDeleting={deletePersona.isPending}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </div>
    </PageShell>
  );
}
