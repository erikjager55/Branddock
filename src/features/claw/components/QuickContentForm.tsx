'use client';

import React, { useState } from 'react';
import { Sparkles, X, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useClawStore } from '@/stores/useClawStore';
import { useCampaigns } from '@/features/campaigns/hooks';
import { useCampaignStore } from '@/features/campaigns/stores/useCampaignStore';
import {
  DELIVERABLE_TYPES,
  DELIVERABLE_CATEGORIES,
  getDeliverableTypeById,
} from '@/features/campaigns/lib/deliverable-types';
import type { CampaignListResponse } from '@/types/campaign';

/**
 * Quick Content form — opened by the TopNav Quick Content button or the
 * `/quick` slash command. Structured alternative to the AI mini-interview.
 *
 * Quick Content is meant to be *quick*: it requires an existing campaign so
 * the user doesn't get pulled into a campaign-setup detour. If the workspace
 * has no campaigns yet we show an empty state pointing to the Campaigns
 * section. Submission then:
 *  1. Creates the deliverable on the chosen campaign with `settings.brief`
 *     populated from the four briefing fields.
 *  2. Sets selected IDs in useCampaignStore + asks Claw to navigate to
 *     `content-canvas` so the user lands in Step 1 with the brief
 *     pre-filled (matches the create_deliverable tool flow).
 */
export function QuickContentForm() {
  const { t } = useTranslation('claw');
  const { quickContentForm, updateQuickContentForm, closeQuickContentForm, addMessage, requestNavigation } =
    useClawStore();
  const { data: campaignsData, isLoading: isLoadingCampaigns } = useCampaigns();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!quickContentForm) return null;

  // Surface only campaigns the user can drop a deliverable into. /api/campaigns
  // already excludes CONTENT-typed shells, so this list is the right scope.
  const campaigns = (() => {
    const raw = campaignsData as
      | CampaignListResponse
      | { campaigns?: Array<{ id: string; title?: string; name?: string }> }
      | Array<{ id: string; title?: string; name?: string }>
      | undefined;
    const list = Array.isArray(raw) ? raw : raw?.campaigns ?? [];
    return (list as Array<{ id: string; title?: string; name?: string }>).map(
      (c) => ({ id: c.id, name: c.title ?? c.name ?? t('quick.untitled') }),
    );
  })();

  const handleSubmit = async () => {
    if (!quickContentForm.contentType) {
      setError(t('quick.pickContentType'));
      return;
    }
    if (!quickContentForm.campaignId) {
      setError(t('quick.pickCampaignError'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const campaignId = quickContentForm.campaignId;

      // ── Step 1: build settings.brief from the four optional fields.
      const brief: Record<string, string> = {};
      if (quickContentForm.objective.trim()) brief.objective = quickContentForm.objective.trim();
      if (quickContentForm.keyMessage.trim()) brief.keyMessage = quickContentForm.keyMessage.trim();
      if (quickContentForm.toneDirection.trim())
        brief.toneDirection = quickContentForm.toneDirection.trim();
      if (quickContentForm.callToAction.trim())
        brief.callToAction = quickContentForm.callToAction.trim();

      const typeDef = getDeliverableTypeById(quickContentForm.contentType);
      const title =
        quickContentForm.title.trim() || typeDef?.name || quickContentForm.contentType;

      // ── Step 2: create the deliverable on the chosen campaign.
      const dRes = await fetch(`/api/campaigns/${campaignId}/deliverables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          contentType: quickContentForm.contentType,
          ...(Object.keys(brief).length > 0 ? { settings: { brief } } : {}),
        }),
      });
      if (!dRes.ok) {
        const data = await dRes.json().catch(() => ({}));
        throw new Error(data.error ?? t('quick.createDeliverableFailed'));
      }
      const deliverable = await dRes.json();

      // ── Step 3: prime the route + ask App.tsx to switch sections.
      // Same handshake the create_deliverable tool does on confirm.
      useCampaignStore.getState().setSelectedCampaignId(campaignId);
      useCampaignStore.getState().setSelectedDeliverableId(deliverable.id);
      requestNavigation({ section: 'content-canvas' });

      // Drop a confirmation crumb in the chat so the user sees what just
      // happened — Claw stays open in panel-mode as a sidekick.
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: t('quick.created', { title }),
        createdAt: new Date().toISOString(),
      });

      closeQuickContentForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('quick.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center">
            <Sparkles size={14} className="text-teal-700" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{t('quick.title')}</h3>
        </div>
        <button
          onClick={closeQuickContentForm}
          className="p-1 rounded-md hover:bg-teal-100 text-gray-400"
          aria-label={t('quick.close')}
        >
          <X size={16} />
        </button>
      </div>

      {/* Content type */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('quick.contentTypeLabel')} <span className="text-red-500">*</span>
        </label>
        <select
          value={quickContentForm.contentType}
          onChange={(e) => updateQuickContentForm({ contentType: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="">{t('quick.pickType')}</option>
          {DELIVERABLE_CATEGORIES.map((cat) => (
            <optgroup key={cat} label={cat}>
              {DELIVERABLE_TYPES.filter((dt) => dt.category === cat).map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Campaign — existing only. Setting up a new campaign is a workflow
          on its own and lives in the Campaigns section, not in Quick Content. */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          {t('quick.campaignLabel')} <span className="text-red-500">*</span>
        </label>
        {isLoadingCampaigns ? (
          <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">
            {t('quick.loadingCampaigns')}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
            <p className="font-semibold">{t('quick.noCampaignsTitle')}</p>
            <p className="text-amber-700">
              {t('quick.noCampaignsBody')}
            </p>
            <button
              type="button"
              onClick={() => {
                requestNavigation({ section: 'active-campaigns' });
                closeQuickContentForm();
              }}
              className="inline-flex items-center gap-1 font-medium text-amber-900 hover:text-amber-700 underline underline-offset-2"
            >
              {t('quick.openCampaigns')}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <select
            value={quickContentForm.campaignId ?? ''}
            onChange={(e) =>
              updateQuickContentForm({ campaignId: e.target.value || null })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="">{t('quick.pickCampaign')}</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('quick.titleLabel')} <span className="text-gray-400 font-normal">{t('quick.optional')}</span>
        </label>
        <input
          type="text"
          value={quickContentForm.title}
          onChange={(e) => updateQuickContentForm({ title: e.target.value })}
          placeholder={
            getDeliverableTypeById(quickContentForm.contentType)?.name ??
            t('quick.titlePlaceholder')
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
      </div>

      {/* Briefing — collapsible-ish via grouping */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-gray-700">
          {t('quick.briefingLabel')} <span className="text-gray-400 font-normal">{t('quick.briefingOptional')}</span>
        </p>
        <BriefField
          label={t('quick.objectiveLabel')}
          value={quickContentForm.objective}
          onChange={(v) => updateQuickContentForm({ objective: v })}
          placeholder={t('quick.objectivePlaceholder')}
        />
        <BriefField
          label={t('quick.keyMessageLabel')}
          value={quickContentForm.keyMessage}
          onChange={(v) => updateQuickContentForm({ keyMessage: v })}
          placeholder={t('quick.keyMessagePlaceholder')}
        />
        <BriefField
          label={t('quick.toneLabel')}
          value={quickContentForm.toneDirection}
          onChange={(v) => updateQuickContentForm({ toneDirection: v })}
          placeholder={t('quick.tonePlaceholder')}
        />
        <BriefField
          label={t('quick.ctaLabel')}
          value={quickContentForm.callToAction}
          onChange={(v) => updateQuickContentForm({ callToAction: v })}
          placeholder={t('quick.ctaPlaceholder')}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600" role="alert">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            !quickContentForm.contentType ||
            !quickContentForm.campaignId ||
            campaigns.length === 0
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          {isSubmitting ? t('quick.creating') : t('quick.create')}
        </button>
        <button
          onClick={closeQuickContentForm}
          className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {t('quick.cancel')}
        </button>
      </div>
    </div>
  );
}

function BriefField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-gray-600 mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-teal-400"
      />
    </label>
  );
}
