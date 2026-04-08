"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ArrowLeft, Download, Megaphone, Zap } from "lucide-react";
import { Badge, Button, Modal, Input, Select } from "@/components/shared";
import { DELIVERABLE_TYPES } from "../../lib/deliverable-types";
import { deriveBriefFromBlueprint } from "../../lib/derive-brief";
import { PageShell } from "@/components/ui/layout";
import { LockShield, LockStatusPill, LockBanner, LockOverlay, LockConfirmDialog } from "@/components/lock";
import { useLockState } from "@/hooks/useLockState";
import { useLockVisibility } from "@/hooks/useLockVisibility";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import {
  useCampaignDetail,
  useKnowledgeAssets,
  useStrategy,
  useDeliverables,
  useAddDeliverable,
  useDeleteDeliverable,
} from "../../hooks";
import { useCampaignStore } from "../../stores/useCampaignStore";
import { exportApprovedDeliverablesZip } from "../../lib/export-zip";
import { StrategyResultTab } from "./StrategyResultTab";
import { DeliverablesTab } from "./DeliverablesTab";
import type { BlueprintStrategyResponse, KnowledgeAssetResponse } from "@/types/campaign";
import type { CampaignBlueprint } from "@/lib/campaigns/strategy-blueprint.types";

const PRIORITY_OPTIONS = [
  { value: 'must-have', label: 'Must Have' },
  { value: 'should-have', label: 'Should Have' },
  { value: 'nice-to-have', label: 'Nice to Have' },
];

interface CampaignDetailPageProps {
  campaignId: string;
  onBack: () => void;
  onOpenInStudio?: (campaignId: string, deliverableId: string) => void;
  onOpenInCanvas?: (campaignId: string, deliverableId: string) => void;
}

export function CampaignDetailPage({ campaignId, onBack, onOpenInStudio, onOpenInCanvas }: CampaignDetailPageProps) {

  const { data: campaign, isLoading: campaignLoading } = useCampaignDetail(campaignId);

  const lock = useLockState({
    entityType: 'campaigns',
    entityId: campaignId,
    entityName: campaign?.title ?? 'Campaign',
    initialState: {
      isLocked: campaign?.isLocked ?? false,
      lockedAt: campaign?.lockedAt ?? null,
      lockedBy: campaign?.lockedBy ?? null,
    },
  });
  const visibility = useLockVisibility(lock.isLocked);
  const { data: rawAssets } = useKnowledgeAssets(campaignId);
  // API may return { assets: [...] } wrapper or bare array — normalize
  const assets: KnowledgeAssetResponse[] = Array.isArray(rawAssets) ? rawAssets : (rawAssets as any)?.assets ?? [];
  const { data: strategy, isLoading: strategyLoading } = useStrategy(campaignId);
  const { data: deliverables } = useDeliverables(campaignId);
  const addDeliverable = useAddDeliverable(campaignId);
  const deleteDeliverable = useDeleteDeliverable(campaignId);
  const activeSubTab = useCampaignStore((s) => s.activeStrategySubTab);

  // ── Add deliverable modal ──────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addContentType, setAddContentType] = useState<string | null>(null);
  const [addPhase, setAddPhase] = useState<string | null>(null);
  const [addChannel, setAddChannel] = useState<string | null>(null);
  const [addTargetPersonas, setAddTargetPersonas] = useState<string[]>([]);
  const [addPriority, setAddPriority] = useState<string | null>(null);
  const [addObjective, setAddObjective] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [bringToLifeError, setBringToLifeError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const completedCount = useMemo(
    () => (deliverables ?? []).filter((d) => d.status === "COMPLETED").length,
    [deliverables],
  );

  const handleExportApproved = useCallback(async () => {
    if (!campaign || !deliverables || completedCount === 0 || isExporting) return;
    setIsExporting(true);
    try {
      await exportApprovedDeliverablesZip(campaign.title, deliverables);
    } catch (err) {
      console.error("[handleExportApproved]", err);
    } finally {
      setIsExporting(false);
    }
  }, [campaign, deliverables, completedCount, isExporting]);

  // Extract blueprint for dropdown options
  const blueprint: CampaignBlueprint | null = useMemo(() => {
    if (strategy && 'format' in strategy && strategy.format === 'blueprint') {
      return (strategy as BlueprintStrategyResponse).blueprint;
    }
    return null;
  }, [strategy]);

  const phaseOptions = useMemo(() =>
    (blueprint?.architecture?.journeyPhases ?? []).map((p) => ({
      value: p.name,
      label: p.name,
    })),
  [blueprint]);

  const channelOptions = useMemo(() => {
    const channels = new Set<string>();
    for (const ch of blueprint?.channelPlan?.channels ?? []) {
      if (ch.name) channels.add(ch.name);
    }
    return Array.from(channels).map((c) => ({ value: c, label: c }));
  }, [blueprint]);

  const personaOptions = useMemo(() => {
    const personas = new Map<string, string>();
    for (const phase of blueprint?.architecture?.journeyPhases ?? []) {
      for (const ppd of phase.personaPhaseData ?? []) {
        if (ppd.personaId && ppd.personaName) {
          personas.set(ppd.personaId, ppd.personaName);
        }
      }
    }
    return Array.from(personas.entries()).map(([id, name]) => ({ id, name }));
  }, [blueprint]);

  // Derive brief fields from blueprint when modal context changes
  const derivedBrief = useMemo(
    () => deriveBriefFromBlueprint(blueprint, addContentType, addPhase, addChannel),
    [blueprint, addContentType, addPhase, addChannel],
  );

  const hasDerivedBrief = !!(derivedBrief.keyMessage || derivedBrief.toneDirection || derivedBrief.callToAction || derivedBrief.contentOutline.length > 0);

  const contentTypeOptions = useMemo(() => {
    const groups = new Map<string, { value: string; label: string }[]>();
    for (const dt of DELIVERABLE_TYPES) {
      if (!groups.has(dt.category)) groups.set(dt.category, []);
      groups.get(dt.category)!.push({ value: dt.id, label: dt.name });
    }
    return Array.from(groups.entries()).map(([label, options]) => ({ label, options }));
  }, []);

  const resetAddModal = () => {
    setShowAddModal(false);
    setAddTitle("");
    setAddContentType(null);
    setAddPhase(null);
    setAddChannel(null);
    setAddTargetPersonas([]);
    setAddPriority(null);
    setAddObjective("");
    setAddError(null);
  };

  /** Delete a deliverable by matching its title to the DB record */
  const handleDeleteDeliverable = (title: string) => {
    if (!deliverables) return;
    const match = deliverables.find(
      (d) => d.title.trim().toLowerCase() === title.trim().toLowerCase(),
    );
    if (!match) return;
    deleteDeliverable.mutate(match.id);
  };

  const handleAddDeliverable = async () => {
    if (!addTitle.trim() || !addContentType || addDeliverable.isPending) return;
    setAddError(null);
    try {
      // Build settings from optional fields, omit empty values
      const settings: NonNullable<import('@/types/campaign').CreateDeliverableBody['settings']> = {};
      if (addPhase) settings.phase = addPhase;
      if (addChannel) settings.channel = addChannel;
      if (addTargetPersonas.length > 0) settings.targetPersonas = addTargetPersonas;
      if (addPriority) settings.productionPriority = addPriority as 'must-have' | 'should-have' | 'nice-to-have';
      // Merge user objective with derived brief fields
      const briefFields: NonNullable<typeof settings.brief> = {};
      if (addObjective.trim()) briefFields.objective = addObjective.trim();
      if (derivedBrief.keyMessage) briefFields.keyMessage = derivedBrief.keyMessage;
      if (derivedBrief.toneDirection) briefFields.toneDirection = derivedBrief.toneDirection;
      if (derivedBrief.callToAction) briefFields.callToAction = derivedBrief.callToAction;
      if (derivedBrief.contentOutline.length > 0) briefFields.contentOutline = derivedBrief.contentOutline;
      if (Object.keys(briefFields).length > 0) settings.brief = briefFields;

      await addDeliverable.mutateAsync({
        title: addTitle.trim(),
        contentType: addContentType,
        ...(Object.keys(settings).length > 0 ? { settings } : {}),
      });
      resetAddModal();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add deliverable");
    }
  };

  /** Warm handover: set campaign context in Content Studio store before navigation */
  const handleOpenInStudio = (cId: string, did: string) => {
    // Find matching deliverable brief from blueprint, fall back to DB deliverable's own settings
    const matchedDeliverable = deliverables?.find((del) => del.id === did);
    const blueprintBrief = blueprint?.assetPlan?.deliverables?.find(
      (d) => d.title === matchedDeliverable?.title
    )?.brief ?? null;
    const settingsBrief = matchedDeliverable?.settings?.brief;
    const deliverableBrief = blueprintBrief ?? (settingsBrief ? {
      objective: settingsBrief.objective ?? '',
      keyMessage: settingsBrief.keyMessage ?? '',
      toneDirection: settingsBrief.toneDirection ?? '',
      callToAction: settingsBrief.callToAction ?? '',
      contentOutline: settingsBrief.contentOutline ?? [],
    } : null);

    useContentStudioStore.getState().setCampaignContext({
      campaignId: cId,
      campaignName: campaign?.title ?? '',
      campaignGoalType: campaign?.campaignGoalType ?? null,
      campaignKnowledgeAssetIds: (assets ?? []).map((a) => a.id),
      campaignBlueprint: blueprint,
      deliverableBrief,
    });

    onOpenInStudio?.(cId, did);
  };

  /** "Bring to Life" from Campaign Timeline: create deliverable → set context → navigate to studio */
  const handleBringToLife = async (deliverableTitle: string, contentType: string) => {
    setBringToLifeError(null);
    try {
      // Find matching deliverable from blueprint to extract full settings
      const bpDeliverable = blueprint?.assetPlan?.deliverables?.find(
        (d) => d.title === deliverableTitle
      );
      const bringSettings: NonNullable<import('@/types/campaign').CreateDeliverableBody['settings']> = {};
      if (bpDeliverable) {
        if (bpDeliverable.phase) bringSettings.phase = bpDeliverable.phase;
        if (bpDeliverable.channel) bringSettings.channel = bpDeliverable.channel;
        if (bpDeliverable.targetPersonas?.length) bringSettings.targetPersonas = bpDeliverable.targetPersonas;
        if (bpDeliverable.productionPriority) bringSettings.productionPriority = bpDeliverable.productionPriority as 'must-have' | 'should-have' | 'nice-to-have';
        if (bpDeliverable.brief) {
          const b = bpDeliverable.brief;
          bringSettings.brief = {
            ...(b.objective ? { objective: b.objective } : {}),
            ...(b.keyMessage ? { keyMessage: b.keyMessage } : {}),
            ...(b.toneDirection ? { toneDirection: b.toneDirection } : {}),
            ...(b.callToAction ? { callToAction: b.callToAction } : {}),
            ...(b.contentOutline?.length ? { contentOutline: b.contentOutline } : {}),
          };
        }
      }

      const result = await addDeliverable.mutateAsync({
        title: deliverableTitle,
        contentType,
        ...(Object.keys(bringSettings).length > 0 ? { settings: bringSettings } : {}),
      });
      if (result?.id) {
        // Pass deliverableTitle directly for brief matching — avoids stale deliverables cache
        // since the newly created deliverable may not yet be in the TanStack cache
        const matchedBrief = blueprint?.assetPlan?.deliverables?.find(
          (d) => d.title === deliverableTitle
        )?.brief ?? null;

        useContentStudioStore.getState().setCampaignContext({
          campaignId,
          campaignName: campaign?.title ?? '',
          campaignGoalType: campaign?.campaignGoalType ?? null,
          campaignKnowledgeAssetIds: (assets ?? []).map((a) => a.id),
          campaignBlueprint: blueprint,
          deliverableBrief: matchedBrief,
        });

        // Navigate to Canvas (generation) for new deliverables, fall back to Studio
        if (onOpenInCanvas) {
          onOpenInCanvas(campaignId, result.id);
        } else {
          onOpenInStudio?.(campaignId, result.id);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create deliverable";
      console.error("[handleBringToLife]", message);
      setBringToLifeError(message);
    }
  };

  if (campaignLoading) {
    return (
      <PageShell maxWidth="7xl">
        <div className="py-8">
          <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-8" />
          <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </PageShell>
    );
  }

  if (!campaign) {
    return (
      <PageShell maxWidth="7xl">
        <div className="py-8 text-center">
          <p className="text-gray-500">Campaign not found.</p>
          <Button variant="secondary" onClick={onBack} className="mt-4">
            Back to Campaigns
          </Button>
        </div>
      </PageShell>
    );
  }

  const isStrategic = campaign.type === "STRATEGIC";

  return (
    <PageShell maxWidth="7xl">
      {/* Header */}
      <div className="bg-white border-b rounded-t-lg -mx-6 px-6 py-6 mb-6">
        <button
          data-testid="campaign-back-link"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Campaigns
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isStrategic ? (
                <Badge variant="success">
                  <Megaphone className="h-3 w-3 mr-1" /> Strategic
                </Badge>
              ) : (
                <Badge variant="info" className="bg-purple-100 text-purple-700">
                  <Zap className="h-3 w-3 mr-1" /> Quick
                </Badge>
              )}
              <Badge
                variant={
                  campaign.status === "COMPLETED" ? "success" :
                  campaign.status === "ARCHIVED" ? "warning" : "default"
                }
              >
                {campaign.status}
              </Badge>
            </div>
            <h1 data-testid="campaign-detail-title" className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
            {campaign.description && (
              <p className="text-sm text-gray-500 mt-1">{campaign.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportApproved}
              disabled={completedCount === 0 || isExporting}
              isLoading={isExporting}
            >
              Export ({completedCount})
            </Button>
            <LockShield
              isLocked={lock.isLocked}
              isToggling={lock.isToggling}
              onClick={lock.requestToggle}
            />
            <LockStatusPill
              isLocked={lock.isLocked}
              lockedAt={lock.lockedAt}
              lockedBy={lock.lockedBy}
            />
          </div>
        </div>

      </div>

      {/* Lock Banner */}
      <LockBanner isLocked={lock.isLocked} onUnlock={lock.requestToggle} />

      {/* Content */}
      <LockOverlay isLocked={lock.isLocked}>
        <div>
          {isStrategic ? (
            <div className="space-y-8">
              {bringToLifeError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {bringToLifeError}
                </div>
              )}
              {visibility.showAITools && (
                <StrategyResultTab
                  strategy={strategy}
                  campaignId={campaignId}
                  campaignName={campaign.title}
                  campaignGoalType={campaign.campaignGoalType ?? undefined}
                  isLoading={strategyLoading}
                  onBringToLife={onOpenInStudio ? handleBringToLife : undefined}
                  onDeleteDeliverable={handleDeleteDeliverable}
                  onAddDeliverable={() => setShowAddModal(true)}
                  campaignStartDate={campaign?.startDate}
                  deliverables={deliverables}
                />
              )}
            </div>
          ) : (
            /* Quick Content shows deliverables directly */
            <DeliverablesTab
              deliverables={deliverables || campaign.deliverables || []}
              campaignId={campaignId}
              onOpenInStudio={visibility.showAITools ? (did) => handleOpenInStudio(campaignId, did) : undefined}
            />
          )}
        </div>
      </LockOverlay>

      {/* Lock Confirm Dialog */}
      <LockConfirmDialog
        isOpen={lock.showConfirm}
        isLocking={!lock.isLocked}
        entityName={campaign.title}
        onConfirm={lock.confirmToggle}
        onCancel={lock.cancelToggle}
      />

      {/* Add Deliverable Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={resetAddModal}
        title="Add Deliverable"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={resetAddModal}>
              Cancel
            </Button>
            <Button
              onClick={handleAddDeliverable}
              disabled={!addTitle.trim() || !addContentType || addDeliverable.isPending}
              isLoading={addDeliverable.isPending}
            >
              Add
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* ── Basics ── */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basics</h4>
            <div className="space-y-4">
              <Input
                label="Title"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="e.g. Instagram Carousel — Brand Launch"
                required
              />
              <Select
                label="Content Type"
                value={addContentType}
                onChange={setAddContentType}
                groups={contentTypeOptions}
                placeholder="Select content type..."
                required
              />
            </div>
          </div>

          {/* ── Context (optional) ── */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Context (optional)</h4>
            {!blueprint && (
              <p className="text-xs text-gray-400 mb-3">Generate a campaign strategy to populate phase and channel options.</p>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Phase"
                  value={addPhase}
                  onChange={setAddPhase}
                  options={phaseOptions}
                  placeholder={phaseOptions.length > 0 ? "Select phase..." : "No phases available"}
                  disabled={phaseOptions.length === 0}
                  allowClear
                />
                <Select
                  label="Channel"
                  value={addChannel}
                  onChange={setAddChannel}
                  options={channelOptions}
                  placeholder={channelOptions.length > 0 ? "Select channel..." : "No channels available"}
                  disabled={channelOptions.length === 0}
                  allowClear
                />
              </div>

              {/* Target Personas — checkbox list */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Personas</label>
                {personaOptions.length > 0 ? (
                  <div className="space-y-1.5">
                    {personaOptions.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          checked={addTargetPersonas.includes(p.name)}
                          onChange={(e) => {
                            setAddTargetPersonas((prev) =>
                              e.target.checked
                                ? [...prev, p.name]
                                : prev.filter((n) => n !== p.name)
                            );
                          }}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No personas available — generate a strategy first.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Priority"
                  value={addPriority}
                  onChange={setAddPriority}
                  options={PRIORITY_OPTIONS}
                  placeholder="Select priority..."
                  allowClear
                />
                <div /> {/* spacer for grid alignment */}
              </div>

              <div>
                <label htmlFor="add-deliverable-objective" className="block text-sm font-medium text-gray-700 mb-1">Objective</label>
                <textarea
                  id="add-deliverable-objective"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                  rows={2}
                  maxLength={2000}
                  value={addObjective}
                  onChange={(e) => setAddObjective(e.target.value)}
                  placeholder="Brief description of the deliverable's objective..."
                />
              </div>

              {/* Derived brief preview */}
              {hasDerivedBrief && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                  <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Derived from campaign strategy</p>
                  {derivedBrief.keyMessage && (
                    <div>
                      <span className="text-xs font-medium text-gray-500">Key Message</span>
                      <p className="text-sm text-gray-800">{derivedBrief.keyMessage}</p>
                    </div>
                  )}
                  {derivedBrief.toneDirection && (
                    <div>
                      <span className="text-xs font-medium text-gray-500">Tone</span>
                      <p className="text-sm text-gray-800">{derivedBrief.toneDirection}</p>
                    </div>
                  )}
                  {derivedBrief.callToAction && (
                    <div>
                      <span className="text-xs font-medium text-gray-500">Call to Action</span>
                      <p className="text-sm text-gray-800">{derivedBrief.callToAction}</p>
                    </div>
                  )}
                  {derivedBrief.contentOutline.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500">Content Outline</span>
                      <ul className="text-sm text-gray-800 list-disc list-inside mt-0.5">
                        {derivedBrief.contentOutline.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {addError && (
            <p className="text-sm text-red-600" role="alert">{addError}</p>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}
