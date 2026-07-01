'use client';

import React, { useState, useCallback } from 'react';
import { Check, X, Pencil, Wrench } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useClawStore } from '@/stores/useClawStore';
import { useFormFillStore, type FormFillAssignment } from '@/stores/useFormFillStore';
import { useCampaignWizardStore } from '@/features/campaigns/stores/useCampaignWizardStore';
import { useCampaignStore } from '@/features/campaigns/stores/useCampaignStore';
import { useContentLibraryStore } from '@/features/campaigns/stores/useContentLibraryStore';
import type { MutationProposal, ClawMessage } from '@/lib/claw/claw.types';
import type { CampaignGoalType, CampaignType } from '@/features/campaigns/types/campaign-wizard.types';

/**
 * Map an entity type returned by /api/claw/confirm to the TanStack Query
 * key prefixes that should be invalidated so the active detail page re-fetches.
 * Broad prefixes cover both list-level and detail-level queries.
 */
const INVALIDATION_PREFIXES: Record<string, string[][]> = {
  brand_asset: [['brand-asset-detail'], ['brand-assets']],
  persona: [['personas']],
  product: [['products']],
  competitor: [['competitors']],
  strategy: [['strategies']],
  trend: [['trend-radar'], ['trends']],
  alignment: [['alignment'], ['brand-alignment']],
  interview: [['interviews']],
  // Path 2 fix: when Claw creates a deliverable we need to invalidate
  // both the campaigns tree (deliverables list, blueprint) and the cross-
  // campaign content library list so the new row shows up everywhere.
  deliverable: [['campaigns'], ['content-library']],
  // Same prefixes for a freshly created campaign — its row appears in the
  // campaigns overview, and the content library uses campaigns for the
  // filter dropdown.
  campaign: [['campaigns'], ['content-library']],
};

/** Detail-section IDs for the "View →" toast action after a create. */
const DETAIL_SECTION_FOR_ENTITY: Record<string, string> = {
  persona: 'persona-detail',
  trend: 'trend-detail',
  product: 'product-detail',
  competitor: 'competitor-detail',
  // Deliverables auto-navigate (no toast click) — handled separately below.
};

/**
 * Apply a wizard_update client-action by calling the matching setter on
 * useCampaignWizardStore. Skips empty values and unknown keys.
 */
function applyWizardUpdate(updates: Record<string, unknown>): number {
  const state = useCampaignWizardStore.getState();
  let count = 0;
  for (const [key, raw] of Object.entries(updates)) {
    if (typeof raw !== 'string' || !raw) continue;
    switch (key) {
      case 'name': state.setName(raw); count++; break;
      case 'description': state.setDescription(raw); count++; break;
      case 'campaignGoalType': state.setCampaignGoalType(raw as CampaignGoalType); count++; break;
      case 'campaignType': state.setCampaignType(raw as CampaignType); count++; break;
      case 'selectedContentType': state.setSelectedContentType(raw); count++; break;
      case 'startDate': state.setStartDate(raw); count++; break;
      case 'endDate': state.setEndDate(raw); count++; break;
      case 'briefingOccasion': state.setBriefingOccasion(raw); count++; break;
      case 'briefingAudienceObjective': state.setBriefingAudienceObjective(raw); count++; break;
      case 'briefingCoreMessage': state.setBriefingCoreMessage(raw); count++; break;
      case 'briefingTonePreference': state.setBriefingTonePreference(raw); count++; break;
      case 'briefingConstraints': state.setBriefingConstraints(raw); count++; break;
      default: /* ignore unknown keys */ break;
    }
  }
  return count;
}

export function MutationConfirmCard() {
  const { t } = useTranslation('claw');
  const { pendingMutation, setPendingMutation, activeConversationId, addMessage, requestNavigation } = useClawStore();
  const queryClient = useQueryClient();
  // Subscribe to registered form-fill fields so the proposal preview can
  // overlay user-readable labels for `fill_form_fields` proposals.
  const formFillFields = useFormFillStore((s) => s.fields);
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = useCallback(async (approved: boolean) => {
    if (!pendingMutation || !activeConversationId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        conversationId: activeConversationId,
        toolCallId: pendingMutation.toolCallId,
        approved,
      };

      // If user edited values, send the edited params
      if (approved && Object.keys(editedValues).length > 0) {
        body.editedParams = editedValues;
      }

      const res = await fetch('/api/claw/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      // Handle client-side actions (e.g. wizard updates). The server's
      // execute() returned a "clientAction" descriptor instead of mutating
      // state directly — apply it here.
      if (approved && !data.result?.isError) {
        const innerResult = data.result?.result as Record<string, unknown> | undefined;
        if (innerResult?.clientAction === 'wizard_update' && innerResult.updates) {
          const applied = applyWizardUpdate(innerResult.updates as Record<string, unknown>);
          if (applied > 0) {
            toast.success(t('toast.filledWizardFields', { count: applied }));
          }
        } else if (innerResult?.clientAction === 'form_fill' && Array.isArray(innerResult.assignments)) {
          // Generic form-fill — route to the page's registered setters via
          // useFormFillStore.applyFill. Missing keys mean the AI proposed a
          // key that the active page doesn't expose; surface as a soft warning.
          // Defensive filter — Zod validated the AI input, but the return
          // path is not Zod-checked; reject malformed entries before apply.
          const assignments = (innerResult.assignments as unknown[]).filter(
            (a): a is FormFillAssignment =>
              typeof a === 'object' &&
              a !== null &&
              typeof (a as { key: unknown }).key === 'string' &&
              'value' in a,
          );
          const { applied, missing } = useFormFillStore.getState().applyFill(assignments);
          if (applied.length > 0) {
            toast.success(t('toast.filledFields', { count: applied.length }));
          }
          if (missing.length > 0) {
            toast.warning(
              t('toast.couldNotFillFields', { count: missing.length, fields: missing.join(', ') }),
            );
          }
        }

        // F10 fix (audit 2026-05-13): update_deliverable_brief schrijft naar
        // DB maar canvas-store kent de nieuwe brief niet — UI bleef leeg.
        // Sync server-write naar canvas-store voor instant UI-update via de
        // bestaande setBriefField setter. Brief-key-naam matched canvas-store.
        const toolName = pendingMutation?.toolName;
        if (toolName === 'update_deliverable_brief') {
          const params = pendingMutation?.params as
            | {
                objective?: string;
                keyMessage?: string;
                toneDirection?: string;
                callToAction?: string;
              }
            | undefined;
          if (params) {
            // Lazy-import canvas-store om circular-dep met campaigns te
            // vermijden + alleen laden wanneer relevant tool gebruikt wordt.
            const { useCanvasStore } = await import(
              '@/features/campaigns/stores/useCanvasStore'
            );
            const setBriefField = useCanvasStore.getState().setBriefField;
            if (typeof params.objective === 'string' && params.objective.trim()) {
              setBriefField('objective', params.objective);
            }
            if (typeof params.keyMessage === 'string' && params.keyMessage.trim()) {
              setBriefField('keyMessage', params.keyMessage);
            }
            if (typeof params.toneDirection === 'string' && params.toneDirection.trim()) {
              setBriefField('toneDirection', params.toneDirection);
            }
            if (typeof params.callToAction === 'string' && params.callToAction.trim()) {
              setBriefField('callToAction', params.callToAction);
            }
          }
        }
      }

      // Refresh any visible detail pages so they show the new values without
      // a manual refresh. Dashboard is always invalidated since stats may change.
      if (approved && data.affected?.entityType) {
        const affected = data.affected as {
          entityType: string;
          entityId: string | null;
          entityName: string | null;
          campaignId?: string | null;
          isNew: boolean;
        };
        const prefixes = INVALIDATION_PREFIXES[affected.entityType] ?? [];
        for (const prefix of prefixes) {
          queryClient.invalidateQueries({ queryKey: prefix });
        }
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });

        // The Content Canvas hydrates its store via plain fetch (not
        // TanStack Query) so query invalidation alone won't update the
        // open Canvas form fields. Dispatch a window event the Canvas
        // listens for; it refetches /context + /deliverable when the
        // event id matches the currently-open deliverable.
        if (affected.entityType === 'deliverable' && affected.entityId && !affected.isNew) {
          window.dispatchEvent(
            new CustomEvent('canvas:refresh-deliverable', {
              detail: { deliverableId: affected.entityId },
            }),
          );
        }

        // Path 2 fix (2026-04-25): deliverables auto-navigate to the
        // Content Canvas instead of waiting for a toast click. Setting
        // both IDs in useCampaignStore matches how every other Canvas
        // entry-point (cards, calendar, timeline) primes the route.
        if (
          affected.isNew &&
          affected.entityType === 'deliverable' &&
          affected.entityId &&
          affected.campaignId
        ) {
          useCampaignStore.getState().setSelectedCampaignId(affected.campaignId);
          useCampaignStore.getState().setSelectedDeliverableId(affected.entityId);
          requestNavigation({ section: 'content-canvas' });
          if (affected.entityName) {
            toast.success(t('toast.openingCanvas', { name: affected.entityName }));
          }
        } else if (
          affected.isNew &&
          affected.entityType === 'campaign' &&
          affected.entityId
        ) {
          // Campaigns auto-navigate to the merged content-library campaign-
          // mode view (post-merge #212). Setting the filter to just this
          // campaign is what flips the page into single-campaign mode.
          useContentLibraryStore.getState().setFilter('campaigns', [affected.entityId]);
          requestNavigation({ section: 'content-library' });
          if (affected.entityName) {
            toast.success(t('toast.openingCampaign', { name: affected.entityName }));
          }
        } else if (affected.isNew && affected.entityId && affected.entityName) {
          // Other create-tools keep the toast-click pattern.
          const section = DETAIL_SECTION_FOR_ENTITY[affected.entityType];
          const label = affected.entityName;
          if (section) {
            toast.success(t('toast.created', { name: label }), {
              action: {
                label: t('toast.view'),
                onClick: () => requestNavigation({ section, entityId: affected.entityId! }),
              },
            });
          } else {
            toast.success(t('toast.created', { name: label }));
          }
        }
      }

      // Add result message to chat
      const resultMessage: ClawMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: approved
          ? t('mutation.doneMessage', { description: pendingMutation.description.toLowerCase() })
          : t('mutation.changeSkipped'),
        toolResults: data.result ? [data.result] : undefined,
        createdAt: new Date().toISOString(),
      };
      addMessage(resultMessage);
    } catch (err) {
      console.error('Confirm error:', err);
    } finally {
      // UX-fix 2026-05-13: pop next van queue (parallel mutation-proposals
      // van 1 AI response). Wanneer queue leeg: clear pendingMutation.
      useClawStore.getState().advanceMutationQueue();
      setIsSubmitting(false);
      setIsEditing(false);
      setEditedValues({});
    }
  }, [pendingMutation, activeConversationId, editedValues, isSubmitting, setPendingMutation, addMessage, queryClient, requestNavigation, t]);

  if (!pendingMutation) return null;
  // UX-fix 2026-05-13: queue-indicator wanneer parallel proposals wachten
  const queueRemaining = useClawStore.getState().pendingMutationQueue.length;

  return (
    <div className="max-w-3xl mx-auto px-4 mb-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200/60">
          <Wrench size={14} className="text-amber-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-amber-900">{t('mutation.proposedChange')}</span>
          {queueRemaining > 0 && (
            <span className="text-[10px] font-medium text-amber-700 bg-amber-200/60 px-1.5 py-0.5 rounded-full">
              {t('mutation.moreChangesAfter', { count: queueRemaining })}
            </span>
          )}
          {pendingMutation.entityName && (
            <span className="text-xs text-amber-700 ml-auto truncate">
              {pendingMutation.entityType}: <span className="font-medium">{pendingMutation.entityName}</span>
            </span>
          )}
        </div>

        {/* Description */}
        <div className="px-4 py-3">
          <p className="text-sm text-gray-700 mb-3">{pendingMutation.description}</p>

          {/* Changes preview */}
          {pendingMutation.changes && pendingMutation.changes.length > 0 && (
            <div className="space-y-3">
              {pendingMutation.changes.map((change, i) => {
                // For fill_form_fields proposals: overlay the registered label
                // (and currentValue) from useFormFillStore — the tool only
                // knows the raw key; the page knows the human label.
                const registered =
                  pendingMutation.toolName === 'fill_form_fields'
                    ? formFillFields.find((f) => f.key === change.field)
                    : undefined;
                const displayLabel = registered?.label ?? change.label;
                const displayCurrent = registered?.currentValue ?? change.currentValue;
                return (
                  <ChangeRow
                    key={i}
                    field={displayLabel}
                    currentValue={displayCurrent}
                    proposedValue={
                      isEditing && editedValues[change.field] !== undefined
                        ? editedValues[change.field]
                        : change.proposedValue
                    }
                    isEditing={isEditing}
                    onEdit={(value) =>
                      setEditedValues((prev) => ({ ...prev, [change.field]: value }))
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Info footer — phrasing depends on whether this tool writes to the
         *  DB (snapshot created) or only updates client-side form state
         *  (user must manually save afterwards). */}
        <div className="px-4 py-2 border-t border-amber-200/40 bg-amber-50/20 text-xs text-amber-700">
          {pendingMutation.toolName === 'fill_form_fields' || pendingMutation.toolName === 'update_campaign_wizard'
            ? t('mutation.updateFormFields')
            : t('mutation.updateData')}
        </div>

        {/* Actions — primary Apply on the right, secondary Edit next to it, tertiary Skip on the left */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-amber-200/60 bg-white">
          <button
            onClick={() => handleConfirm(false)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <X size={14} />
            {t('mutation.skip')}
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setIsEditing(!isEditing)}
            disabled={isSubmitting}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isEditing
                ? 'bg-teal-50 border border-teal-300 text-teal-700 hover:bg-teal-100'
                : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <Pencil size={14} />
            {isEditing ? t('mutation.editing') : t('mutation.edit')}
          </button>

          <button
            onClick={() => handleConfirm(true)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-teal-600 text-white text-sm font-semibold shadow-sm hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed transition-colors"
          >
            <Check size={15} strokeWidth={2.5} />
            {isSubmitting ? t('mutation.applying') : (isEditing ? t('mutation.applyWithEdits') : t('mutation.applyChange'))}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangeRow({
  field,
  currentValue,
  proposedValue,
  isEditing,
  onEdit,
}: {
  field: string;
  currentValue: string | null;
  proposedValue: string;
  isEditing: boolean;
  onEdit: (value: string) => void;
}) {
  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '...' : text;

  return (
    <div className="text-xs">
      <div className="font-medium text-gray-600 mb-1">{field}</div>

      {currentValue && (
        <div className="px-3 py-2 rounded-md bg-red-50/60 text-gray-500 mb-1.5 line-through">
          {truncate(currentValue, 200)}
        </div>
      )}

      {isEditing ? (
        <textarea
          value={proposedValue}
          onChange={(e) => onEdit(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-teal-300 bg-white text-gray-800 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-teal-500"
          rows={3}
        />
      ) : (
        <div className="px-3 py-2 rounded-md bg-teal-50 text-teal-800">
          {truncate(proposedValue, 300)}
        </div>
      )}
    </div>
  );
}
