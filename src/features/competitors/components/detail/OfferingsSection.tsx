"use client";

import { useState } from "react";
import { ShoppingBag, Plus, X } from "lucide-react";
import { Input } from "@/components/shared";
import type { CompetitorDetail } from "../../types/competitor.types";

interface OfferingsSectionProps {
  competitor: CompetitorDetail;
  isEditing: boolean;
  editMainOfferings: string[];
  setEditMainOfferings: (v: string[]) => void;
  editPricingModel: string;
  setEditPricingModel: (v: string) => void;
  editPricingDetails: string;
  setEditPricingDetails: (v: string) => void;
}

/** Offerings section with main products/services, pricing model, pricing details */
export function OfferingsSection({
  competitor,
  isEditing,
  editMainOfferings,
  setEditMainOfferings,
  editPricingModel,
  setEditPricingModel,
  editPricingDetails,
  setEditPricingDetails,
}: OfferingsSectionProps) {
  const [newOffering, setNewOffering] = useState("");

  const addOffering = () => {
    const trimmed = newOffering.trim();
    if (trimmed && !editMainOfferings.includes(trimmed)) {
      setEditMainOfferings([...editMainOfferings, trimmed]);
      setNewOffering("");
    }
  };

  const removeOffering = (idx: number) => {
    setEditMainOfferings(editMainOfferings.filter((_, i) => i !== idx));
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-gray-500" />
          Offerings & Pricing
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Main Offerings</label>
            <div className="space-y-2 mb-2">
              {editMainOfferings.map((o, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <span className="flex-1">{o}</span>
                  <button type="button" onClick={() => removeOffering(idx)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add offering..."
                value={newOffering}
                onChange={(e) => setNewOffering(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOffering(); } }}
              />
              <button type="button" onClick={addOffering} className="flex-shrink-0 rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Input label="Pricing Model" value={editPricingModel} onChange={(e) => setEditPricingModel(e.target.value)} placeholder="e.g. SaaS, Freemium" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pricing Details</label>
            <textarea
              value={editPricingDetails}
              onChange={(e) => setEditPricingDetails(e.target.value)}
              rows={2}
              placeholder="Additional pricing information..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    );
  }

  const hasContent = competitor.mainOfferings.length > 0 || competitor.pricingModel || competitor.pricingDetails;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-gray-500" />
        Offerings & Pricing
      </h3>

      {!hasContent ? (
        <p className="text-sm text-gray-400 italic">No offerings data available yet.</p>
      ) : (
        <div className="space-y-4">
          {competitor.mainOfferings.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Main Offerings</p>
              <ul className="space-y-1.5">
                {competitor.mainOfferings.map((o, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(competitor.pricingModel || competitor.pricingDetails) && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Pricing</p>
              {competitor.pricingModel && (
                <p className="text-sm font-medium text-gray-700">{competitor.pricingModel}</p>
              )}
              {competitor.pricingDetails && (
                <p className="text-sm text-gray-600 mt-0.5">{competitor.pricingDetails}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
