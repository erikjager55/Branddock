"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import { ArrowLeft, Megaphone, Zap, Plus, Download, Sparkles, Loader2, CheckCircle2, AlertCircle, Target, Share2, FileText, FileJson, Pencil, Check, X, Users, Wand2 } from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/shared";
import { LockShield, LockStatusPill, LockBanner, LockConfirmDialog } from "@/components/lock";
import { useLockState } from "@/hooks/useLockState";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";
import { useCampaignDetail, useStrategy, useDeliverables, useUpdateCampaign, useAddDeliverable } from "../../hooks";
import { useBulkGenerate } from "../../hooks/useBulkGenerate";
import { AddDeliverableTypeModal } from "../shared/AddDeliverableTypeModal";
import { BulkGenerateModal } from "./BulkGenerateModal";
import { RepeatSplitButton } from "./RepeatSplitButton";
import { getDeliverableTypeById } from "../../lib/deliverable-types";
import type { DeliverableResponse } from "@/types/campaign";
import type { ContentLibraryItem } from "../../types/content-library.types";
import { exportApprovedDeliverablesZip } from "../../lib/export-zip";
import { StrategySection } from "../detail/strategy/StrategySection";
import { RegenerateSectionButton } from "../detail/strategy/RegenerateSectionButton";
import { exportCampaignStrategyPdf } from "../../utils/exportCampaignStrategyPdf";
import { exportCampaignStrategyJson } from "../../utils/exportCampaignStrategyJson";
import dynamic from "next/dynamic";
import type { BlueprintStrategyResponse } from "@/types/campaign";
import type { CampaignBlueprint } from "@/lib/campaigns/strategy-blueprint.types";

// Lazy-load BriefRenderView (incl. react-markdown) zodat de markdown-renderer
// alleen wordt geladen wanneer een gebruiker de modal opent. Houdt de eager
// campaign-page chunk klein — zie docs/adr/2026-05-08-markdown-rendering-library.md.
const BriefRenderView = dynamic(
  () => import("../detail/strategy/BriefRenderView").then((m) => m.BriefRenderView),
  { ssr: false },
);


interface ContentLibraryCampaignModeProps {
  campaignId: string;
  /**
   * Args ordered `(deliverableId, campaignId)` to match the rest of the
   * content-library surface (ContentCardGrid/List, Timeline, Calendar).
   */
  onOpenInCanvas?: (deliverableId: string, campaignId: string) => void;
  /**
   * Items list AFTER all active filters in the Content Library are applied.
   * Drives the "Generate Drafts (N)" header button so its count + click
   * target match what the user actually sees in the grid below — not the
   * raw campaign total.
   */
  filteredItems?: ContentLibraryItem[];
}

export function ContentLibraryCampaignMode({ campaignId, onOpenInCanvas, filteredItems }: ContentLibraryCampaignModeProps) {
  const toggleCampaignFilter = useContentLibraryStore((s) => s.toggleCampaignFilter);
  const campaignSubTab = useContentLibraryStore((s) => s.campaignSubTab);
  const { data: campaign, isLoading } = useCampaignDetail(campaignId);
  const { data: strategy } = useStrategy(campaignId);
  const { data: deliverables } = useDeliverables(campaignId);
  const bulkGenerate = useBulkGenerate(campaignId);
  const updateCampaign = useUpdateCampaign(campaignId);
  const addDeliverable = useAddDeliverable(campaignId);

  // Selecting a source — either the newest COMPLETED overall (main button)
  // or the newest of a specific type (dropdown) — is delegated to
  // RepeatSplitButton. This handler just creates the fresh deliverable and
  // hands it to auto-inherit (Sprint A · Step 1) via the Canvas.
  const handleRepeat = useCallback(
    (source: DeliverableResponse) => {
      if (addDeliverable.isPending) return;
      const typeDef = getDeliverableTypeById(source.contentType);
      const title = typeDef?.name ?? source.contentType;
      addDeliverable.mutate(
        { title, contentType: source.contentType },
        {
          onSuccess: (created) => {
            onOpenInCanvas?.(created.id, campaignId);
          },
        },
      );
    },
    [addDeliverable, campaignId, onOpenInCanvas],
  );

  // Lock state — prevents edits when locked.
  const lock = useLockState({
    entityType: "campaigns",
    entityId: campaignId,
    entityName: campaign?.title ?? "Campaign",
    initialState: {
      isLocked: campaign?.isLocked ?? false,
      lockedAt: campaign?.lockedAt ?? null,
      lockedBy: campaign?.lockedBy ?? null,
    },
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkGenerateModal, setShowBulkGenerateModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Inline title + description editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Campagne-brief render modal
  const [briefModalOpen, setBriefModalOpen] = useState(false);

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

  // Derive blueprint
  const blueprint: CampaignBlueprint | null = useMemo(() => {
    if (strategy && "format" in strategy && strategy.format === "blueprint") {
      return (strategy as BlueprintStrategyResponse).blueprint;
    }
    return null;
  }, [strategy]);

  // Campaign-scoped stat counts
  const stats = useMemo(() => {
    const phaseCount = blueprint?.architecture?.journeyPhases?.length ?? 0;
    const touchpointCount = (blueprint?.architecture?.journeyPhases ?? []).reduce(
      (sum, p) => sum + ((p as { touchpoints?: unknown[] }).touchpoints?.length ?? 0),
      0,
    );
    const channelCount = new Set(
      (blueprint?.channelPlan?.channels ?? [])
        .map((c) => c.name)
        .filter((n): n is string => !!n),
    ).size;
    const deliverableCount = deliverables?.length ?? 0;
    return { phaseCount, touchpointCount, channelCount, deliverableCount };
  }, [blueprint, deliverables]);

  // Personas + channels extracted from the blueprint — read-only context pills.
  const personaNames = useMemo(() => {
    const seen = new Map<string, string>();
    for (const phase of blueprint?.architecture?.journeyPhases ?? []) {
      for (const ppd of (phase as { personaPhaseData?: unknown[] }).personaPhaseData ?? []) {
        const { personaId, personaName } = ppd as { personaId?: string; personaName?: string };
        if (personaId && personaName && !seen.has(personaId)) {
          seen.set(personaId, personaName);
        }
      }
    }
    return Array.from(seen.values());
  }, [blueprint]);

  const channelNames = useMemo(() => {
    const seen = new Set<string>();
    for (const ch of blueprint?.channelPlan?.channels ?? []) {
      if (ch.name) seen.add(ch.name);
    }
    return Array.from(seen);
  }, [blueprint]);

  // Generate Drafts targets the FILTERED items so the count + behavior
  // match what the user sees in the grid. If no filteredItems prop was
  // passed (defensive — shouldn't happen in practice), fall back to the
  // raw campaign totals so the button still works.
  const filteredNotStartedIds = useMemo(() => {
    if (filteredItems) {
      return filteredItems
        .filter((i) => i.status === "NOT_STARTED")
        .map((i) => i.id);
    }
    return (deliverables ?? [])
      .filter((d) => d.status === "NOT_STARTED")
      .map((d) => d.id);
  }, [filteredItems, deliverables]);
  const notStartedCount = filteredNotStartedIds.length;

  // Export still targets the full campaign — we want users to be able to
  // export everything that's APPROVED, not whatever the current filter
  // happens to expose.
  const completedCount = useMemo(
    () => (deliverables ?? []).filter((d) => d.status === "COMPLETED").length,
    [deliverables],
  );

  const handleBack = useCallback(() => {
    toggleCampaignFilter(campaignId);
  }, [campaignId, toggleCampaignFilter]);

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

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="h-8 w-96 bg-gray-100 rounded animate-pulse" />
        <div className="h-16 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> All content
        </button>
        <p className="text-gray-500 mt-2">Campaign not found.</p>
      </div>
    );
  }

  const isStrategic = campaign.type === "STRATEGIC";

  return (
    <>
      {/* Header block */}
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-5 space-y-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> All content
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
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
                  campaign.status === "COMPLETED"
                    ? "success"
                    : campaign.status === "ARCHIVED"
                    ? "warning"
                    : "default"
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
                  <button
                    type="button"
                    onClick={handleSaveTitle}
                    className="p-1 text-teal-600 hover:text-teal-700"
                    title="Save"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditTitle}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Cancel"
                  >
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
              <div
                className={`group ${lock.isLocked ? "" : "cursor-pointer"}`}
                onClick={handleStartEditTitle}
                role={lock.isLocked ? undefined : "button"}
                tabIndex={lock.isLocked ? undefined : 0}
                onKeyDown={(e) => {
                  if (!lock.isLocked && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    handleStartEditTitle();
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">{campaign.title}</h1>
                  {!lock.isLocked && (
                    <Pencil className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                {campaign.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{campaign.description}</p>
                )}
              </div>
            )}

            {/* Personas + Channels pills from blueprint */}
            {(personaNames.length > 0 || channelNames.length > 0) && (
              <div className="mt-3 flex flex-col gap-1.5">
                {personaNames.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1">
                      <Users className="h-3 w-3" /> Personas
                    </span>
                    {personaNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
                {channelNames.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1">
                      <Share2 className="h-3 w-3" /> Channels
                    </span>
                    {channelNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 2026-05-19 header-toolbar simplificatie per feedback:
                'Generate more' / 'Export' / 'Repeat last' verwijderd
                (functionaliteit elders bereikbaar of niet pre-launch);
                'Add Deliverable' nu primary (teal), 'Generate Drafts'
                secondary (white outline). */}
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setShowAddModal(true)}
              disabled={lock.isLocked}
            >
              Add Deliverable
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Sparkles}
              onClick={() => bulkGenerate.start(filteredNotStartedIds)}
              disabled={notStartedCount === 0 || bulkGenerate.isGenerating || lock.isLocked}
              isLoading={bulkGenerate.isGenerating}
            >
              Generate Drafts ({notStartedCount})
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

      {/* Lock banner — slim amber strip shown when locked */}
      <LockBanner isLocked={lock.isLocked} onUnlock={lock.requestToggle} />

      {/* Lock confirmation dialog */}
      <LockConfirmDialog
        isOpen={lock.showConfirm}
        isLocking={!lock.isLocked}
        entityName={campaign.title}
        onConfirm={lock.confirmToggle}
        onCancel={lock.cancelToggle}
      />

      {/* Bulk generate progress */}
      {(bulkGenerate.isGenerating || bulkGenerate.result) && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {bulkGenerate.isGenerating ? "Generating drafts..." : "Draft generation complete"}
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
                {item.status === "generating" && <Loader2 className="h-3 w-3 text-teal-500 animate-spin" />}
                {item.status === "complete" && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                {item.status === "error" && <AlertCircle className="h-3 w-3 text-red-500" />}
                {item.status === "pending" && <div className="h-3 w-3 rounded-full border border-gray-300" />}
                <span className={item.status === "error" ? "text-red-600" : "text-gray-600"}>
                  {item.title}
                  {item.message && <span className="text-red-400 ml-1">— {item.message}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign-scoped stats grid */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
      >
        <StatTile
          icon={<Target className="h-5 w-5 text-gray-400" />}
          value={stats.phaseCount}
          label="Journey Phases"
        />
        <StatTile
          icon={<Share2 className="h-5 w-5 text-gray-400" />}
          value={stats.touchpointCount}
          label="Touchpoints"
        />
        <StatTile
          icon={<Share2 className="h-5 w-5 text-gray-400" />}
          value={stats.channelCount}
          label="Channels"
        />
        <StatTile
          icon={<FileText className="h-5 w-5 text-gray-400" />}
          value={stats.deliverableCount}
          label="Deliverables"
        />
      </div>

      {/* Strategy body — content vs strategy toggle lives in ContentFilterBar */}
      {campaignSubTab === "strategy" && (
        blueprint?.strategy ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Campaign Strategy</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={FileText}
                  onClick={() =>
                    exportCampaignStrategyPdf({
                      campaignName: campaign.title,
                      campaignGoalType: campaign.campaignGoalType ?? undefined,
                      blueprint,
                      confidence: (strategy as BlueprintStrategyResponse | undefined)?.confidence ?? null,
                      generatedAt: (strategy as BlueprintStrategyResponse | undefined)?.generatedAt ?? null,
                    })
                  }
                >
                  Export PDF
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={FileJson}
                  onClick={() =>
                    exportCampaignStrategyJson({
                      campaignName: campaign.title,
                      campaignGoalType: campaign.campaignGoalType ?? undefined,
                      blueprint,
                      confidence: (strategy as BlueprintStrategyResponse | undefined)?.confidence ?? null,
                      generatedAt: (strategy as BlueprintStrategyResponse | undefined)?.generatedAt ?? null,
                    })
                  }
                >
                  Export JSON
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Sparkles}
                  onClick={() => setBriefModalOpen(true)}
                >
                  Generate brief
                </Button>
                <RegenerateSectionButton campaignId={campaignId} layer="strategy" />
              </div>
            </div>
            <StrategySection strategy={blueprint.strategy} />
          </div>
        ) : (
          <EmptyState
            icon={Target}
            title="Strategy not available yet"
            description="Generate a campaign strategy to see the strategic approach."
          />
        )
      )}

      {/* Add Deliverable modal */}
      <AddDeliverableTypeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        campaignId={campaignId}
        onCreated={(did) => {
          setShowAddModal(false);
          onOpenInCanvas?.(did, campaignId);
        }}
      />

      {/* Bulk Generate modal — creates N deliverables + kicks off SSE generation */}
      <BulkGenerateModal
        isOpen={showBulkGenerateModal}
        onClose={() => setShowBulkGenerateModal(false)}
        campaignId={campaignId}
        deliverables={deliverables ?? []}
        onCreated={(ids) => {
          if (ids.length > 0) bulkGenerate.start(ids);
        }}
      />
      {briefModalOpen && (
        <BriefRenderView
          campaignId={campaignId}
          campaignTitle={campaign?.title ?? ''}
          isOpen={briefModalOpen}
          onClose={() => setBriefModalOpen(false)}
        />
      )}
    </>
  );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-md bg-gray-50">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

export default ContentLibraryCampaignMode;
