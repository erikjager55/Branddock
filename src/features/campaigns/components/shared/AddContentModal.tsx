/**
 * AddContentModal — unified modal for creating content items.
 *
 * Used from:
 * - Content Library "Create Content" button (no campaign pre-selected)
 * - Campaign Detail "Add Deliverable" button (campaign pre-selected)
 * - Top bar "Quick Content" button (no campaign pre-selected)
 * - Timeline "Add Deliverable" button (campaign pre-selected)
 *
 * Three sections:
 * 1. Content Type — category pills + selectable grid
 * 2. Campaign — select existing or create new
 * 3. Content Brief — auto-filled from campaign blueprint, editable
 */

"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Plus, Megaphone, Sparkles, FileText, FolderOpen, PenLine } from "lucide-react";
import { Modal, Input, Badge, Button, Select } from "@/components/shared";
import { DELIVERABLE_TYPES, DELIVERABLE_CATEGORIES } from "../../lib/deliverable-types";
import { ContentTypeInputFields } from "./ContentTypeInputFields";
import { deriveBriefFromBlueprint } from "../../lib/derive-brief";
import { getCreationEssentialInputs } from "../../lib/content-type-inputs";
import { useCampaigns, useStrategy } from "../../hooks";
import type { ContentTypeInputValue } from "../../lib/content-type-inputs";
import type { CampaignBlueprint } from "@/lib/campaigns/strategy-blueprint.types";

// ─── Types ─────────────────────────────────────────────────

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId?: string;
  campaignName?: string;
  onCreated?: (campaignId: string, deliverableId: string) => void;
}

// ─── Section Header ────────────────────────────────────────

function SectionHeader({ icon: Icon, number, title, subtitle }: {
  icon: React.ComponentType<{ className?: string }>;
  number: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div
        className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
        style={{ backgroundColor: '#ccfbf1', color: '#0d9488' }}
      >
        {number}
      </div>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-500" />
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      </div>
      {subtitle && <span className="text-xs text-gray-400 ml-auto">{subtitle}</span>}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────

export function AddContentModal({
  isOpen,
  onClose,
  campaignId: preSelectedCampaignId,
  campaignName: preSelectedCampaignName,
  onCreated,
}: AddContentModalProps) {
  // ── State ──────────────────────────────────────────────
  const [contentType, setContentType] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(preSelectedCampaignId ?? null);
  const [isNewCampaign, setIsNewCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [phase, setPhase] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [targetPersonas, setTargetPersonas] = useState<string[]>([]);
  const [priority, setPriority] = useState<string | null>(null);
  const [contentTypeInputs, setContentTypeInputs] = useState<Record<string, ContentTypeInputValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Data ───────────────────────────────────────────────
  const { data: campaigns } = useCampaigns({ type: "STRATEGIC" });
  const effectiveCampaignId = isNewCampaign ? null : selectedCampaignId;
  const { data: strategy } = useStrategy(effectiveCampaignId ?? "");

  useEffect(() => {
    if (preSelectedCampaignId) {
      setSelectedCampaignId(preSelectedCampaignId);
      setIsNewCampaign(false);
    }
  }, [preSelectedCampaignId]);

  const blueprint = useMemo<CampaignBlueprint | null>(() => {
    if (!strategy) return null;
    if ("blueprint" in strategy && strategy.blueprint) {
      return strategy.blueprint as CampaignBlueprint;
    }
    return null;
  }, [strategy]);

  // ── Auto-fill from blueprint ───────────────────────────
  useEffect(() => {
    if (!blueprint || !contentType) return;
    const derived = deriveBriefFromBlueprint(blueprint, contentType, phase, channel);
    if (derived.keyMessage && !objective) setObjective(derived.keyMessage);
    if (!phase && blueprint.architecture?.journeyPhases?.length > 0) {
      setPhase(blueprint.architecture.journeyPhases[0].name ?? null);
    }
    if (targetPersonas.length === 0 && blueprint.architecture?.journeyPhases) {
      const names = new Set<string>();
      for (const jp of blueprint.architecture.journeyPhases) {
        if (jp.personaPhaseData) {
          for (const ppd of jp.personaPhaseData) {
            if (ppd.personaName) names.add(ppd.personaName);
          }
        }
      }
      if (names.size > 0) setTargetPersonas(Array.from(names));
    }
  }, [blueprint, contentType]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTypes = useMemo(() => {
    if (!categoryFilter) return DELIVERABLE_TYPES;
    return DELIVERABLE_TYPES.filter((dt) => dt.category === categoryFilter);
  }, [categoryFilter]);

  const phaseOptions = useMemo(() => {
    if (!blueprint?.architecture?.journeyPhases) return [];
    return blueprint.architecture.journeyPhases
      .filter((jp) => jp.name)
      .map((jp) => ({ value: jp.name, label: jp.name }));
  }, [blueprint]);

  const channelOptions = useMemo(() => {
    if (!blueprint?.channelPlan?.channels) return [];
    return blueprint.channelPlan.channels
      .filter((c) => c.name)
      .map((c) => ({ value: c.name, label: c.name }));
  }, [blueprint]);

  const personaOptions = useMemo(() => {
    if (!blueprint?.architecture?.journeyPhases) return [];
    const names = new Set<string>();
    for (const jp of blueprint.architecture.journeyPhases) {
      if (jp.personaPhaseData) {
        for (const ppd of jp.personaPhaseData) {
          if (ppd.personaName) names.add(ppd.personaName);
        }
      }
    }
    return Array.from(names);
  }, [blueprint]);

  // ── Auto-generate title ────────────────────────────────
  useEffect(() => {
    if (!contentType) return;
    const typeDef = DELIVERABLE_TYPES.find((dt) => dt.id === contentType);
    if (!typeDef) return;
    const campName = isNewCampaign
      ? newCampaignName
      : (campaigns?.campaigns ?? []).find((c) => c.id === selectedCampaignId)?.title ?? preSelectedCampaignName ?? "";
    setTitle(campName ? `${typeDef.name} — ${campName}` : typeDef.name);
  }, [contentType, selectedCampaignId, isNewCampaign, newCampaignName, campaigns, preSelectedCampaignName]);

  // ── Handlers ───────────────────────────────────────────
  const handleContentTypeInputChange = useCallback((key: string, val: ContentTypeInputValue) => {
    setContentTypeInputs((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleSelectCampaign = useCallback((id: string | null) => {
    setSelectedCampaignId(id);
    setIsNewCampaign(false);
    setPhase(null);
    setChannel(null);
    setTargetPersonas([]);
    setObjective("");
    setContentTypeInputs({});
  }, []);

  const handleSelectNewCampaign = useCallback(() => {
    setSelectedCampaignId(null);
    setIsNewCampaign(true);
    setPhase(null);
    setChannel(null);
    setTargetPersonas([]);
    setObjective("");
    setContentTypeInputs({});
  }, []);

  const resetAndClose = useCallback(() => {
    setContentType(null);
    setCategoryFilter(null);
    setSelectedCampaignId(preSelectedCampaignId ?? null);
    setIsNewCampaign(false);
    setNewCampaignName("");
    setTitle("");
    setObjective("");
    setPhase(null);
    setChannel(null);
    setTargetPersonas([]);
    setPriority(null);
    setContentTypeInputs({});
    setError(null);
    setIsSubmitting(false);
    onClose();
  }, [onClose, preSelectedCampaignId]);

  const handleCreate = useCallback(async () => {
    if (!contentType || !title.trim()) return;
    if (!selectedCampaignId && !isNewCampaign) return;
    if (isNewCampaign && !newCampaignName.trim()) return;

    setError(null);
    setIsSubmitting(true);

    try {
      let campaignId = selectedCampaignId;

      if (isNewCampaign) {
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newCampaignName.trim(), type: "STRATEGIC", status: "ACTIVE" }),
        });
        if (!res.ok) throw new Error("Failed to create campaign");
        const data = await res.json();
        campaignId = data.id;
      }

      if (!campaignId) throw new Error("No campaign selected");

      const settings: Record<string, unknown> = {};
      if (phase) settings.phase = phase;
      if (channel) settings.channel = channel;
      if (targetPersonas.length > 0) settings.targetPersonas = targetPersonas;
      if (priority) settings.productionPriority = priority;

      const briefFields: Record<string, unknown> = {};
      if (objective.trim()) briefFields.objective = objective.trim();
      if (blueprint && contentType) {
        const derived = deriveBriefFromBlueprint(blueprint, contentType, phase, channel);
        if (derived.keyMessage && !briefFields.keyMessage) briefFields.keyMessage = derived.keyMessage;
        if (derived.toneDirection) briefFields.toneDirection = derived.toneDirection;
        if (derived.callToAction) briefFields.callToAction = derived.callToAction;
        if (derived.contentOutline.length > 0) briefFields.contentOutline = derived.contentOutline;
      }
      if (Object.keys(briefFields).length > 0) settings.brief = briefFields;
      if (Object.keys(contentTypeInputs).length > 0) settings.contentTypeInputs = contentTypeInputs;

      const res = await fetch(`/api/campaigns/${campaignId}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          contentType,
          settings: Object.keys(settings).length > 0 ? settings : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create deliverable");
      }

      const deliverable = await res.json();
      resetAndClose();
      onCreated?.(campaignId, deliverable.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    contentType, title, selectedCampaignId, isNewCampaign, newCampaignName,
    phase, channel, targetPersonas, priority, objective, contentTypeInputs,
    blueprint, resetAndClose, onCreated,
  ]);

  const canCreate = !!(
    contentType && title.trim() &&
    (selectedCampaignId || (isNewCampaign && newCampaignName.trim())) &&
    !isSubmitting
  );

  const selectedTypeName = contentType
    ? DELIVERABLE_TYPES.find((dt) => dt.id === contentType)?.name ?? contentType
    : null;

  // ── Render ─────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Add Content"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-gray-500">
            {contentType && selectedTypeName && (
              <span className="inline-flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {selectedTypeName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <Button
              onClick={handleCreate}
              disabled={!canCreate}
              isLoading={isSubmitting}
            >
              Create Content
            </Button>
          </div>
        </div>
      }
    >
      <div className="max-h-[70vh] overflow-y-auto">
        {/* ── Section 1: Content Type ── */}
        <div className="px-1 pb-5">
          <SectionHeader icon={FileText} number={1} title="Content Type" subtitle={selectedTypeName ?? undefined} />

          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              style={!categoryFilter ? { backgroundColor: "#ccfbf1", color: "#0d9488" } : undefined}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                !categoryFilter ? "ring-1 ring-teal-300" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {DELIVERABLE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                style={categoryFilter === cat ? { backgroundColor: "#ccfbf1", color: "#0d9488" } : undefined}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                  categoryFilter === cat ? "ring-1 ring-teal-300" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto rounded-lg border border-gray-200 p-2">
            {filteredTypes.map((dt) => (
              <button
                key={dt.id}
                type="button"
                onClick={() => setContentType(dt.id)}
                style={contentType === dt.id ? { backgroundColor: "#f0fdfa", borderColor: "#0d9488" } : undefined}
                className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                  contentType === dt.id
                    ? "font-semibold text-teal-800"
                    : "border-transparent text-gray-700 hover:bg-gray-50"
                }`}
              >
                {dt.name}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* ── Section 2: Campaign ── */}
        <div className="px-1 py-5">
          <SectionHeader icon={FolderOpen} number={2} title="Campaign" />

          {preSelectedCampaignId && preSelectedCampaignName ? (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ backgroundColor: "#f0fdfa", borderColor: "#99f6e4", border: "1px solid #99f6e4" }}>
              <Megaphone className="w-4 h-4 flex-shrink-0" style={{ color: "#0d9488" }} />
              <span className="text-sm font-medium" style={{ color: "#115e59" }}>{preSelectedCampaignName}</span>
            </div>
          ) : (
            <div className="space-y-1 max-h-36 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {(campaigns?.campaigns ?? []).map((c) => {
                const isActive = selectedCampaignId === c.id && !isNewCampaign;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCampaign(c.id)}
                    style={isActive ? { backgroundColor: "#f0fdfa", borderColor: "#0d9488" } : undefined}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                      isActive ? "font-medium text-teal-800" : "border-transparent text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="truncate">{c.title}</span>
                    <Badge variant="default" size="sm">{c.type === "STRATEGIC" ? "Strategic" : c.type}</Badge>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleSelectNewCampaign}
                style={isNewCampaign ? { backgroundColor: "#f0fdfa", borderColor: "#0d9488" } : undefined}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                  isNewCampaign ? "font-medium text-teal-800" : "border-transparent text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Plus className="w-4 h-4" />
                Create new campaign
              </button>

              {isNewCampaign && (
                <div className="pl-8 pt-1 pb-1">
                  <Input
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    placeholder="Campaign name..."
                    required
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Section 3: Content Brief ── */}
        {contentType && (selectedCampaignId || isNewCampaign) && (
          <>
            <div className="border-t border-gray-100" />

            <div className="px-1 pt-5 pb-2">
              <SectionHeader
                icon={PenLine}
                number={3}
                title="Content Brief"
                subtitle={blueprint ? "Auto-filled from strategy" : undefined}
              />

              {blueprint && (
                <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: "#f5f3ff" }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "#7c3aed" }} />
                  <span className="text-xs font-medium" style={{ color: "#6d28d9" }}>
                    Fields are pre-filled from your campaign strategy. Edit as needed.
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <Input
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Instagram Carousel — Brand Launch"
                  required
                />

                {(phaseOptions.length > 0 || channelOptions.length > 0) && (
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="Phase"
                      value={phase}
                      onChange={setPhase}
                      options={phaseOptions}
                      placeholder="Select phase..."
                      allowClear
                    />
                    <Select
                      label="Channel"
                      value={channel}
                      onChange={setChannel}
                      options={channelOptions}
                      placeholder="Select channel..."
                      allowClear
                    />
                  </div>
                )}

                {personaOptions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Personas</label>
                    <div className="flex flex-wrap gap-1.5">
                      {personaOptions.map((name) => {
                        const isSelected = targetPersonas.includes(name);
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() =>
                              setTargetPersonas((prev) =>
                                isSelected ? prev.filter((n) => n !== name) : [...prev, name]
                              )
                            }
                            style={isSelected ? { backgroundColor: "#ccfbf1", color: "#0d9488", borderColor: "#99f6e4" } : undefined}
                            className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                              isSelected ? "" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="add-content-objective" className="block text-sm font-medium text-gray-700 mb-1">
                    Objective
                  </label>
                  <textarea
                    id="add-content-objective"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-y"
                    rows={2}
                    maxLength={2000}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Brief description of the content objective..."
                  />
                </div>

                {/* Only essential fields (max 1-2) — full set in Canvas */}
                {contentType && getCreationEssentialInputs(contentType).length > 0 && (
                  <ContentTypeInputFields
                    typeId={contentType}
                    values={contentTypeInputs}
                    onChange={handleContentTypeInputChange}
                    compact
                    filterKeys={getCreationEssentialInputs(contentType).map(f => f.key)}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="px-1 pb-2">
            <p className="text-sm text-red-600" role="alert">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
