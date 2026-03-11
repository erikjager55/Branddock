"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Edit3, Save, X, Building2, Trash2 } from "lucide-react";
import { Button, Badge, SkeletonCard, Modal, Select } from "@/components/shared";
import { PageShell } from "@/components/ui/layout";
import { LockStatusPill, LockBanner, LockOverlay, LockConfirmDialog } from "@/components/lock";
import { useLockState } from "@/hooks/useLockState";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCompetitorDetail,
  useUpdateCompetitor,
  useDeleteCompetitor,
  competitorKeys,
} from "../../hooks";
import { TIER_BADGES, STATUS_BADGES, TIER_OPTIONS } from "../../constants/competitor-constants";
import { CompanyOverviewSection } from "./CompanyOverviewSection";
import { PositioningSection } from "./PositioningSection";
import { OfferingsSection } from "./OfferingsSection";
import { StrengthsWeaknessesSection } from "./StrengthsWeaknessesSection";
import { BrandSignalsSection } from "./BrandSignalsSection";
import { CompetitiveScoreCard } from "./CompetitiveScoreCard";
import { QuickActionsCard } from "./QuickActionsCard";
import { SourceInfoCard } from "./SourceInfoCard";
import { LinkedProductsCard } from "./LinkedProductsCard";

interface CompetitorDetailPageProps {
  competitorId: string;
  onBack: () => void;
  onNavigate?: (section: string) => void;
}

/** Competitor detail page with 2-column layout (8/4 split) */
export function CompetitorDetailPage({
  competitorId,
  onBack,
  onNavigate,
}: CompetitorDetailPageProps) {
  const { data: competitor, isLoading } = useCompetitorDetail(competitorId);
  const updateCompetitor = useUpdateCompetitor(competitorId);
  const deleteCompetitor = useDeleteCompetitor(competitorId);
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Lock state — coerce lockedBy.name from string|null to string
  const lock = useLockState({
    entityType: "competitors",
    entityId: competitorId,
    entityName: competitor?.name ?? "Competitor",
    initialState: {
      isLocked: competitor?.isLocked ?? false,
      lockedAt: competitor?.lockedAt ?? null,
      lockedBy: competitor?.lockedBy
        ? { id: competitor.lockedBy.id, name: competitor.lockedBy.name ?? "Unknown" }
        : null,
    },
    onLockChange: () => {
      qc.invalidateQueries({ queryKey: competitorKeys.detail(competitorId) });
      qc.invalidateQueries({ queryKey: competitorKeys.list() });
    },
  });

  // Edit state
  const [editName, setEditName] = useState("");
  const [editTagline, setEditTagline] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTier, setEditTier] = useState<string>("DIRECT");
  const [editFoundingYear, setEditFoundingYear] = useState("");
  const [editHeadquarters, setEditHeadquarters] = useState("");
  const [editEmployeeRange, setEditEmployeeRange] = useState("");
  const [editValueProposition, setEditValueProposition] = useState("");
  const [editTargetAudience, setEditTargetAudience] = useState("");
  const [editDifferentiators, setEditDifferentiators] = useState<string[]>([]);
  const [editMainOfferings, setEditMainOfferings] = useState<string[]>([]);
  const [editPricingModel, setEditPricingModel] = useState("");
  const [editPricingDetails, setEditPricingDetails] = useState("");
  const [editToneOfVoice, setEditToneOfVoice] = useState("");
  const [editMessagingThemes, setEditMessagingThemes] = useState<string[]>([]);
  const [editVisualStyleNotes, setEditVisualStyleNotes] = useState("");
  const [editStrengths, setEditStrengths] = useState<string[]>([]);
  const [editWeaknesses, setEditWeaknesses] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const wasEditingRef = useRef(false);

  useEffect(() => {
    if (competitor && isEditing && !wasEditingRef.current) {
      setEditName(competitor.name);
      setEditTagline(competitor.tagline ?? "");
      setEditDescription(competitor.description ?? "");
      setEditTier(competitor.tier);
      setEditFoundingYear(competitor.foundingYear?.toString() ?? "");
      setEditHeadquarters(competitor.headquarters ?? "");
      setEditEmployeeRange(competitor.employeeRange ?? "");
      setEditValueProposition(competitor.valueProposition ?? "");
      setEditTargetAudience(competitor.targetAudience ?? "");
      setEditDifferentiators([...competitor.differentiators]);
      setEditMainOfferings([...competitor.mainOfferings]);
      setEditPricingModel(competitor.pricingModel ?? "");
      setEditPricingDetails(competitor.pricingDetails ?? "");
      setEditToneOfVoice(competitor.toneOfVoice ?? "");
      setEditMessagingThemes([...competitor.messagingThemes]);
      setEditVisualStyleNotes(competitor.visualStyleNotes ?? "");
      setEditStrengths([...competitor.strengths]);
      setEditWeaknesses([...competitor.weaknesses]);
      setSaveError(null);
    }
    wasEditingRef.current = isEditing;
  }, [competitor, isEditing]);

  const handleSave = () => {
    setSaveError(null);
    const year = editFoundingYear ? parseInt(editFoundingYear, 10) : undefined;
    updateCompetitor
      .mutateAsync({
        name: editName,
        tagline: editTagline || undefined,
        description: editDescription || undefined,
        tier: editTier as "DIRECT" | "INDIRECT" | "ASPIRATIONAL",
        foundingYear: year && !isNaN(year) ? year : undefined,
        headquarters: editHeadquarters || undefined,
        employeeRange: editEmployeeRange || undefined,
        valueProposition: editValueProposition || undefined,
        targetAudience: editTargetAudience || undefined,
        differentiators: editDifferentiators,
        mainOfferings: editMainOfferings,
        pricingModel: editPricingModel || undefined,
        pricingDetails: editPricingDetails || undefined,
        toneOfVoice: editToneOfVoice || undefined,
        messagingThemes: editMessagingThemes,
        visualStyleNotes: editVisualStyleNotes || undefined,
        strengths: editStrengths,
        weaknesses: editWeaknesses,
      })
      .then(() => setIsEditing(false))
      .catch((err: unknown) => {
        setSaveError(err instanceof Error ? err.message : "Failed to save changes");
      });
  };

  const handleDelete = () => {
    deleteCompetitor.mutateAsync().then(() => {
      qc.removeQueries({ queryKey: competitorKeys.detail(competitorId) });
      onBack();
    }).catch((err: unknown) => {
      setSaveError(err instanceof Error ? err.message : "Failed to delete competitor");
    });
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageShell>
    );
  }

  if (!competitor) {
    return (
      <PageShell>
        <div className="text-center py-12">
          <p className="text-gray-500">Competitor not found</p>
          <Button variant="ghost" onClick={onBack} className="mt-4">
            Back to Competitors
          </Button>
        </div>
      </PageShell>
    );
  }

  const tierConfig = TIER_BADGES[competitor.tier];
  const statusConfig = STATUS_BADGES[competitor.status];

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Competitors
        </button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {competitor.logoUrl ? (
              <img
                src={competitor.logoUrl}
                alt={competitor.name}
                className="h-14 w-14 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-red-100">
                <Building2 className="h-7 w-7 text-red-600" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditing ? editName : competitor.name}
                </h1>
                {tierConfig && <Badge variant={tierConfig.variant}>{tierConfig.label}</Badge>}
                {statusConfig && <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>}
              </div>
              {competitor.tagline && !isEditing && (
                <p className="text-sm text-gray-500 mt-0.5">{competitor.tagline}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LockStatusPill
              isLocked={lock.isLocked}
              lockedBy={lock.lockedBy}
              lockedAt={lock.lockedAt}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={lock.requestToggle}
              isLoading={lock.isToggling}
            >
              {lock.isLocked ? "Unlock" : "Lock"}
            </Button>
            {!lock.isLocked && (
              <>
                {isEditing ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setSaveError(null); }}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} isLoading={updateCompetitor.isPending}>
                      <Save className="h-4 w-4 mr-1" /> Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit3 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setIsDeleteConfirmOpen(true)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <LockBanner
          isLocked={lock.isLocked}
          onUnlock={lock.requestToggle}
          lockedBy={lock.lockedBy}
        />

        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        {/* 2-column layout */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Left column — content sections */}
          <div className="md:col-span-8 space-y-6">
            <LockOverlay isLocked={lock.isLocked}>
              {/* Tier selector in edit mode */}
              {isEditing && (
                <div className="mb-6 max-w-xs">
                  <Select
                    label="Competitor tier"
                    value={editTier}
                    onChange={(v) => setEditTier(v ?? "DIRECT")}
                    options={TIER_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
                  />
                </div>
              )}

              <CompanyOverviewSection
                competitor={competitor}
                isEditing={isEditing}
                editName={editName}
                setEditName={setEditName}
                editTagline={editTagline}
                setEditTagline={setEditTagline}
                editDescription={editDescription}
                setEditDescription={setEditDescription}
                editFoundingYear={editFoundingYear}
                setEditFoundingYear={setEditFoundingYear}
                editHeadquarters={editHeadquarters}
                setEditHeadquarters={setEditHeadquarters}
                editEmployeeRange={editEmployeeRange}
                setEditEmployeeRange={setEditEmployeeRange}
              />

              <PositioningSection
                competitor={competitor}
                isEditing={isEditing}
                editValueProposition={editValueProposition}
                setEditValueProposition={setEditValueProposition}
                editTargetAudience={editTargetAudience}
                setEditTargetAudience={setEditTargetAudience}
                editDifferentiators={editDifferentiators}
                setEditDifferentiators={setEditDifferentiators}
              />

              <OfferingsSection
                competitor={competitor}
                isEditing={isEditing}
                editMainOfferings={editMainOfferings}
                setEditMainOfferings={setEditMainOfferings}
                editPricingModel={editPricingModel}
                setEditPricingModel={setEditPricingModel}
                editPricingDetails={editPricingDetails}
                setEditPricingDetails={setEditPricingDetails}
              />

              <StrengthsWeaknessesSection
                competitor={competitor}
                isEditing={isEditing}
                editStrengths={editStrengths}
                setEditStrengths={setEditStrengths}
                editWeaknesses={editWeaknesses}
                setEditWeaknesses={setEditWeaknesses}
              />

              <BrandSignalsSection
                competitor={competitor}
                isEditing={isEditing}
                editToneOfVoice={editToneOfVoice}
                setEditToneOfVoice={setEditToneOfVoice}
                editMessagingThemes={editMessagingThemes}
                setEditMessagingThemes={setEditMessagingThemes}
                editVisualStyleNotes={editVisualStyleNotes}
                setEditVisualStyleNotes={setEditVisualStyleNotes}
              />
            </LockOverlay>
          </div>

          {/* Right column — sidebar cards */}
          <div className="md:col-span-4 space-y-4">
            <CompetitiveScoreCard score={competitor.competitiveScore} />
            <QuickActionsCard competitorId={competitorId} />
            <SourceInfoCard competitor={competitor} />
            <LinkedProductsCard
              competitorId={competitorId}
              isLocked={lock.isLocked}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </div>

      {/* Lock confirm dialog */}
      <LockConfirmDialog
        isOpen={lock.showConfirm}
        isLocking={!lock.isLocked}
        entityName={competitor.name}
        entityType="competitor"
        onConfirm={lock.confirmToggle}
        onCancel={lock.cancelToggle}
      />

      {/* Delete confirm dialog */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Competitor"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteCompetitor.isPending}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete &ldquo;{competitor.name}&rdquo;? This action cannot be undone.
        </p>
      </Modal>
    </PageShell>
  );
}
