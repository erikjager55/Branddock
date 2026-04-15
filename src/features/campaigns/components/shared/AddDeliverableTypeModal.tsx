/**
 * AddDeliverableTypeModal — select content type for an existing campaign.
 *
 * Used in CampaignDetailPage where the campaign is already known.
 * Only asks: what type of content? Then creates + opens Canvas.
 */

"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Modal, Button } from "@/components/shared";
import { DELIVERABLE_TYPES, DELIVERABLE_CATEGORIES } from "../../lib/deliverable-types";

interface AddDeliverableTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  onCreated?: (deliverableId: string) => void;
}

export function AddDeliverableTypeModal({
  isOpen,
  onClose,
  campaignId,
  onCreated,
}: AddDeliverableTypeModalProps) {
  const [contentType, setContentType] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredTypes = useMemo(() => {
    if (!categoryFilter) return DELIVERABLE_TYPES;
    return DELIVERABLE_TYPES.filter((dt) => dt.category === categoryFilter);
  }, [categoryFilter]);

  const resetAndClose = useCallback(() => {
    setContentType(null);
    setCategoryFilter(null);
    setError(null);
    setIsSubmitting(false);
    onClose();
  }, [onClose]);

  const handleCreate = useCallback(async () => {
    if (!contentType || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const typeDef = DELIVERABLE_TYPES.find((dt) => dt.id === contentType);
      const title = typeDef?.name ?? contentType;

      const res = await fetch(`/api/campaigns/${campaignId}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, contentType }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create");
      }

      const deliverable = await res.json();
      resetAndClose();
      onCreated?.(deliverable.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }, [contentType, campaignId, isSubmitting, resetAndClose, onCreated]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Add Content"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={resetAndClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <Button onClick={handleCreate} disabled={!contentType || isSubmitting} isLoading={isSubmitting}>
            Create & Open Canvas
          </Button>
        </div>
      }
    >
      <div>
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

        <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2">
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

        {error && (
          <p className="text-sm text-red-600 mt-3" role="alert">{error}</p>
        )}
      </div>
    </Modal>
  );
}
