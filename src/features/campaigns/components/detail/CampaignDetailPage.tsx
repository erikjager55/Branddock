"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import { ArrowLeft, Download, Megaphone, Zap, Pencil, Check, X, Sparkles, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Badge, Button, Modal, Input, Select } from "@/components/shared";
import { DELIVERABLE_TYPES, DELIVERABLE_CATEGORIES } from "../../lib/deliverable-types";
import { deriveBriefFromBlueprint } from "../../lib/derive-brief";
import { PageShell } from "@/components/ui/layout";
import { LockShield, LockStatusPill, LockBanner, LockOverlay, LockConfirmDialog } from "@/components/lock";
import { useLockState } from "@/hooks/useLockState";
import { useLockVisibility } from "@/hooks/useLockVisibility";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import {
  useCampaignDetail,
  useUpdateCampaign,
  useKnowledgeAssets,
  useStrategy,
  useDeliverables,
  useAddDeliverable,
  useDeleteDeliverable,
} from "../../hooks";
import { useBulkGenerate } from "../../hooks/useBulkGenerate";
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
  const updateCampaign = useUpdateCampaign(campaignId);
  const bulkGenerate = useBulkGenerate(campaignId);
  const activeSubTab = useCampaignStore((s) => s.activeStrategySubTab);

  const notStartedCount = useMemo(
    () => (deliverables ?? []).filter((d) => d.status === "NOT_STARTED").length,
    [deliverables],
  );

  // ── Inline title/description editing ───────────────────────
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleStartEditTitle = useCallback(() => {
    if (lock.isLocked || !campaign) return;
    setEditTitle(campaign.title);
    setEditDescription(campaign.description ?? "");
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }, [campaign, lock.isLocked]);

  const handleSaveTitle = useCallback(() => {
    const trimmed = editTitle.trim();
    if (!trimmed || !campaign) return;
    if (trimmed === campaign.title && editDescription.trim() === (campaign.description ?? "")) {
      setIsEditingTitle(false);
      return;
    }
    updateCampaign.mutate(
      { title: trimmed, description: editDescription.trim() || undefined },
      { onSuccess: () => setIsEditingTitle(false) },
    );
  }, [editTitle, editDescription, campaign, updateCampaign]);

  const handleCancelEditTitle = useCallback(() => {
    setIsEditingTitle(false);
  }, []);

  // ── Add deliverable modal ──────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addContentType, setAddContentType] = useState<string | null>(null);
  const [addCategoryFilter, setAddCategoryFilter] = useState<string | null>(null);
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


  const filteredContentTypes = useMemo(() => {
    if (!addCategoryFilter) return DELIVERABLE_TYPES;
    return DELIVERABLE_TYPES.filter((dt) => dt.category === addCategoryFilter);
  }, [addCategoryFilter]);

  const resetAddModal = () => {
    setShowAddModal(false);
    setAddTitle("");
    setAddContentType(null);
    setAddCategoryFilter(null);
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
            {isEditingTitle ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={titleInputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") handleCancelEditTitle();
                    }}
                    className="text-2xl font-bold text-gray-900 border-b-2 border-teal-500 bg-transparent outline-none w-full"
                    maxLength={200}
                  />
                  <button onClick={handleSaveTitle} className="p-1 text-teal-600 hover:text-teal-700" title="Save">
                    <Check className="h-5 w-5" />
                  </button>
                  <button onClick={handleCancelEditTitle} className="p-1 text-gray-400 hover:text-gray-600" title="Cancel">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={2}
                  className="text-sm text-gray-600 border border-gray-300 rounded-md px-2 py-1 outline-none focus:border-teal-500 resize-y"
                  maxLength={500}
                />
              </div>
            ) : (
              <div className="group cursor-pointer" onClick={handleStartEditTitle}>
                <div className="flex items-center gap-2">
                  <h1 data-testid="campaign-detail-title" className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
                  {!lock.isLocked && (
                    <Pencil className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                {campaign.description && (
                  <p className="text-sm text-gray-500 mt-1">{campaign.description}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={Sparkles}
              onClick={() => bulkGenerate.start()}
              disabled={notStartedCount === 0 || bulkGenerate.isGenerating || lock.isLocked}
              isLoading={bulkGenerate.isGenerating}
            >
              Generate Drafts ({notStartedCount})
            </Button>
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

      {/* Bulk Generate Progress */}
      {(bulkGenerate.isGenerating || bulkGenerate.result) && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {bulkGenerate.isGenerating ? 'Generating drafts...' : 'Draft generation complete'}
            </span>
            {bulkGenerate.result && (
              <span className="text-xs text-gray-500">
                {bulkGenerate.result.generated} generated, {bulkGenerate.result.failed} failed
              </span>
            )}
          </div>
          <div className="space-y-1">
            {Array.from(bulkGenerate.progress.entries()).map(([id, item]) => (
              <div key={id} className="flex items-center gap-2 text-xs">
                {item.status === 'generating' && <Loader2 className="h-3 w-3 text-teal-500 animate-spin" />}
                {item.status === 'complete' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                {item.status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                {item.status === 'pending' && <div className="h-3 w-3 rounded-full border border-gray-300" />}
                <span className={item.status === 'error' ? 'text-red-600' : 'text-gray-600'}>
                  {item.title}
                  {item.message && <span className="text-red-400 ml-1">— {item.message}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
              {(() => {
                // Strategy may be an empty object {} from the API when no blueprint exists
                const hasStrategy = strategy && typeof strategy === 'object' && Object.keys(strategy).length > 1;
                const safeDeliverables = deliverables || campaign.deliverables || [];

                if (hasStrategy && visibility.showAITools) {
                  return (
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
                  );
                }

                if (!strategyLoading && safeDeliverables.length > 0) {
                  return (
                    <DeliverablesTab
                      deliverables={safeDeliverables}
                      campaignId={campaignId}
                      onOpenInStudio={visibility.showAITools ? (did) => handleOpenInStudio(campaignId, did) : undefined}
                    />
                  );
                }

                return null;
              })()}
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
              {/* Content Type — category pills + selectable grid */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500 mr-0.5">*</span>
                  Content Type
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <button
                    type="button"
                    onClick={() => setAddCategoryFilter(null)}
                    style={!addCategoryFilter ? { backgroundColor: '#ccfbf1', color: '#0d9488' } : undefined}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                      !addCategoryFilter ? 'ring-1 ring-teal-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {DELIVERABLE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAddCategoryFilter(cat)}
                      style={addCategoryFilter === cat ? { backgroundColor: '#ccfbf1', color: '#0d9488' } : undefined}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                        addCategoryFilter === cat ? 'ring-1 ring-teal-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2">
                  {filteredContentTypes.map((dt) => (
                    <button
                      key={dt.id}
                      type="button"
                      onClick={() => setAddContentType(dt.id)}
                      style={addContentType === dt.id ? { backgroundColor: '#f0fdfa', borderColor: '#0d9488' } : undefined}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        addContentType === dt.id
                          ? 'font-medium text-teal-800'
                          : 'border-gray-100 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {dt.name}
                    </button>
                  ))}
                </div>
              </div>
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
