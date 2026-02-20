"use client";

import React from "react";
import {
  FileText,
  Newspaper,
  BookOpen,
  Award,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  BarChart3,
  Image,
  Presentation,
  Palette,
  Mail,
  MailPlus,
  Megaphone,
  Timer,
  Minus,
  Plus,
  Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, Card } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import {
  DELIVERABLE_CATEGORIES,
  getDeliverablesByCategory,
} from "../../lib/deliverable-types";

// ─── Icon Map ─────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Newspaper,
  BookOpen,
  Award,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  BarChart3,
  Image,
  Presentation,
  Palette,
  Mail,
  MailPlus,
  Megaphone,
  Timer,
};

function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || FileText;
}

// ─── Component ────────────────────────────────────────────

export function DeliverablesStep() {
  const selectedDeliverables = useCampaignWizardStore(
    (s) => s.selectedDeliverables,
  );
  const activeDeliverableTab = useCampaignWizardStore(
    (s) => s.activeDeliverableTab,
  );
  const setActiveDeliverableTab = useCampaignWizardStore(
    (s) => s.setActiveDeliverableTab,
  );
  const toggleDeliverable = useCampaignWizardStore(
    (s) => s.toggleDeliverable,
  );
  const setDeliverableQuantity = useCampaignWizardStore(
    (s) => s.setDeliverableQuantity,
  );

  const activeCategory = activeDeliverableTab || DELIVERABLE_CATEGORIES[0];
  const categoryItems = getDeliverablesByCategory(activeCategory);

  const totalSelected = selectedDeliverables.reduce(
    (sum, d) => sum + d.quantity,
    0,
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Category tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {DELIVERABLE_CATEGORIES.map((category) => {
          const isActive = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveDeliverableTab(category)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Deliverable cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categoryItems.map((item) => {
          const isSelected = selectedDeliverables.some(
            (d) => d.type === item.id,
          );
          const currentQty =
            selectedDeliverables.find((d) => d.type === item.id)?.quantity || 1;
          const Icon = getIcon(item.icon);

          return (
            <Card
              key={item.id}
              padding="none"
              className={`transition-all ${
                isSelected
                  ? "ring-2 ring-emerald-500 border-emerald-200"
                  : "hover:shadow-md"
              }`}
            >
              <div className="p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDeliverable(item.id)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mt-1"
                  />
                </div>

                {/* Output formats */}
                <div className="flex flex-wrap gap-1">
                  {item.outputFormats.map((format) => (
                    <Badge key={format} size="sm">
                      {format}
                    </Badge>
                  ))}
                </div>

                {/* Quantity stepper (only when selected) */}
                {isSelected && (
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Quantity:</span>
                    <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setDeliverableQuantity(
                            item.id,
                            Math.max(1, currentQty - 1),
                          )
                        }
                        disabled={currentQty <= 1}
                        className="px-2 py-1 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3 h-3 text-gray-500" />
                      </button>
                      <span className="px-3 py-1 text-sm font-semibold text-gray-900 bg-gray-50 min-w-[32px] text-center">
                        {currentQty}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDeliverableQuantity(
                            item.id,
                            Math.min(10, currentQty + 1),
                          )
                        }
                        disabled={currentQty >= 10}
                        className="px-2 py-1 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <Package className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{totalSelected}</span>{" "}
          {totalSelected === 1 ? "deliverable" : "deliverables"} selected
        </span>
      </div>
    </div>
  );
}

export default DeliverablesStep;
