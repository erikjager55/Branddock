/**
 * AddContentModal — lightweight modal for creating content items.
 *
 * Only two choices: content type + campaign.
 * Everything else (title, objective, SEO keywords, etc.) is done in the Canvas.
 */

"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Plus, Megaphone, FileText, FolderOpen } from "lucide-react";
import { Modal, Input, Badge, Button } from "@/components/shared";
import { DELIVERABLE_TYPES, DELIVERABLE_CATEGORIES } from "../../lib/deliverable-types";
import { useCampaigns } from "../../hooks";

// ─── Types ─────────────────────────────────────────────────

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId?: string;
  campaignName?: string;
  /** Called when deliverable is created in an existing campaign → navigate to Canvas */
  onCreated?: (campaignId: string, deliverableId: string) => void;
  /** Called when user wants to create new campaign + content → navigate to wizard stepper */
  onStartWizard?: (contentType: string, campaignName: string) => void;
}

// ─── Component ─────────────────────────────────────────────

export function AddContentModal({
  isOpen,
  onClose,
  campaignId: preSelectedCampaignId,
  campaignName: preSelectedCampaignName,
  onCreated,
  onStartWizard,
}: AddContentModalProps) {
  const [contentType, setContentType] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(preSelectedCampaignId ?? null);
  const [isNewCampaign, setIsNewCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: campaigns } = useCampaigns({ type: "STRATEGIC" });

  useEffect(() => {
    if (preSelectedCampaignId) {
      setSelectedCampaignId(preSelectedCampaignId);
      setIsNewCampaign(false);
    }
  }, [preSelectedCampaignId]);

  const filteredTypes = useMemo(() => {
    if (!categoryFilter) return DELIVERABLE_TYPES;
    return DELIVERABLE_TYPES.filter((dt) => dt.category === categoryFilter);
  }, [categoryFilter]);

  const selectedTypeName = contentType
    ? DELIVERABLE_TYPES.find((dt) => dt.id === contentType)?.name ?? null
    : null;

  const resetAndClose = useCallback(() => {
    setContentType(null);
    setCategoryFilter(null);
    setSelectedCampaignId(preSelectedCampaignId ?? null);
    setIsNewCampaign(false);
    setNewCampaignName("");
    setError(null);
    setIsSubmitting(false);
    onClose();
  }, [onClose, preSelectedCampaignId]);

  const handleCreate = useCallback(async () => {
    if (!contentType) return;
    if (!selectedCampaignId && !isNewCampaign) return;
    if (isNewCampaign && !newCampaignName.trim()) return;

    // New format → go through wizard stepper (builds strategy + concept)
    if (isNewCampaign) {
      resetAndClose();
      onStartWizard?.(contentType, newCampaignName.trim());
      return;
    }

    // Existing campaign → create deliverable directly, open Canvas
    setError(null);
    setIsSubmitting(true);

    try {
      if (!selectedCampaignId) throw new Error("No campaign selected");

      const typeDef = DELIVERABLE_TYPES.find((dt) => dt.id === contentType);
      const campName = (campaigns?.campaigns ?? []).find((c) => c.id === selectedCampaignId)?.title
        ?? preSelectedCampaignName ?? "";
      const title = campName
        ? `${typeDef?.name ?? contentType} — ${campName}`
        : typeDef?.name ?? contentType;

      const res = await fetch(`/api/campaigns/${selectedCampaignId}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, contentType }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create content");
      }

      const deliverable = await res.json();
      resetAndClose();
      onCreated?.(selectedCampaignId, deliverable.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }, [contentType, selectedCampaignId, isNewCampaign, newCampaignName, campaigns, preSelectedCampaignName, resetAndClose, onCreated, onStartWizard]);

  const canCreate = !!(
    contentType &&
    (selectedCampaignId || (isNewCampaign && newCampaignName.trim())) &&
    !isSubmitting
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Add Content"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-gray-500">
            {selectedTypeName && (
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
            <Button onClick={handleCreate} disabled={!canCreate} isLoading={isSubmitting}>
              {isNewCampaign ? 'Create Format' : 'Create & Open Canvas'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="max-h-[65vh] overflow-y-auto">
        {/* ── 1. Content Type ── */}
        <div className="pb-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-400" />
            <h4 className="text-sm font-semibold text-gray-800">What do you want to create?</h4>
          </div>

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

        {/* ── 2. Campaign ── */}
        <div className="pt-5">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="w-4 h-4 text-gray-400" />
            <h4 className="text-sm font-semibold text-gray-800">Add to campaign</h4>
          </div>

          {preSelectedCampaignId && preSelectedCampaignName ? (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ backgroundColor: "#f0fdfa", border: "1px solid #99f6e4" }}>
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
                    onClick={() => { setSelectedCampaignId(c.id); setIsNewCampaign(false); }}
                    style={isActive ? { backgroundColor: "#f0fdfa", borderColor: "#0d9488" } : undefined}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                      isActive ? "font-medium text-teal-800" : "border-transparent text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="truncate">{c.title}</span>
                    <Badge variant="default" size="sm">{c.type === "STRATEGIC" ? "Campaign" : "Format"}</Badge>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => { setSelectedCampaignId(null); setIsNewCampaign(true); }}
                style={isNewCampaign ? { backgroundColor: "#f0fdfa", borderColor: "#0d9488" } : undefined}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                  isNewCampaign ? "font-medium text-teal-800" : "border-transparent text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Plus className="w-4 h-4" />
                Create new format
              </button>

              {isNewCampaign && (
                <div className="pl-8 pt-1 pb-1">
                  <Input
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    placeholder="e.g. Weekly LinkedIn Insights, Klant-in-beeld serie..."
                    required
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 mt-4" role="alert">{error}</p>
        )}
      </div>
    </Modal>
  );
}
