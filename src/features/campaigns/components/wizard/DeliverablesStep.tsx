"use client";

import React, { useEffect, useRef } from "react";
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
  Presentation,
  Mail,
  MailPlus,
  Megaphone,
  Timer,
  Minus,
  Plus,
  Package,
  Sparkles,
  Layers,
  BookMarked,
  Lightbulb,
  Clapperboard,
  GalleryHorizontalEnd,
  Search,
  BadgeDollarSign,
  MonitorSmartphone,
  RotateCcw,
  Play,
  PanelTop,
  MailWarning,
  ShoppingBag,
  HelpCircle,
  GitCompareArrows,
  Globe,
  Video,
  MessageSquareQuote,
  Film,
  Mic,
  FileSpreadsheet,
  ClipboardList,
  Tag,
  Send,
  Building2,
  Briefcase,
  UserPlus,
  Users,
  Leaf,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, Card } from "@/components/shared";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import {
  DELIVERABLE_CATEGORIES,
  DELIVERABLE_TYPE_IDS,
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
  Presentation,
  Mail,
  MailPlus,
  Megaphone,
  Timer,
  Layers,
  BookMarked,
  Lightbulb,
  Clapperboard,
  GalleryHorizontalEnd,
  Search,
  BadgeDollarSign,
  MonitorSmartphone,
  RotateCcw,
  Play,
  PanelTop,
  MailWarning,
  ShoppingBag,
  HelpCircle,
  GitCompareArrows,
  Globe,
  Video,
  MessageSquareQuote,
  Film,
  Mic,
  FileSpreadsheet,
  ClipboardList,
  Tag,
  Send,
  Building2,
  Briefcase,
  UserPlus,
  Users,
  Leaf,
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
  const blueprintResult = useCampaignWizardStore((s) => s.blueprintResult);

  const activeCategory = activeDeliverableTab || DELIVERABLE_CATEGORIES[0];
  const categoryItems = getDeliverablesByCategory(activeCategory);

  const totalSelected = selectedDeliverables.reduce(
    (sum, d) => sum + d.quantity,
    0,
  );

  // Strategy-driven deliverable recommendations
  const recommendedDeliverables = blueprintResult?.assetPlan?.deliverables ?? [];
  const mustHaveCount = recommendedDeliverables.filter((d) => d.productionPriority === "must-have").length;
  const totalRecommended = recommendedDeliverables.length;

  // Collect the set of recommended contentType IDs that match our catalog
  const recommendedTypeIds = new Set(
    recommendedDeliverables
      .map((d) => d.contentType)
      .filter((ct) => DELIVERABLE_TYPE_IDS.includes(ct)),
  );

  // Auto-pre-select AI-recommended deliverables (once, when blueprint arrives)
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (hasAutoSelected.current || recommendedTypeIds.size === 0) return;
    if (selectedDeliverables.length > 0) return; // user already has selections

    hasAutoSelected.current = true;
    for (const typeId of recommendedTypeIds) {
      toggleDeliverable(typeId);
    }
  }, [recommendedTypeIds.size, selectedDeliverables.length, toggleDeliverable]);

  return (
    <div className="space-y-6">
      {/* Strategy recommendations banner */}
      {totalRecommended > 0 && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800">
              Strategy recommends {totalRecommended} deliverable{totalRecommended !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {mustHaveCount} must-have, {totalRecommended - mustHaveCount} optional — auto-selected based on your campaign blueprint
            </p>
          </div>
        </div>
      )}

      {/* Category tabs — scrollable for 8 categories */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {DELIVERABLE_CATEGORIES.map((category) => {
          const isActive = category === activeCategory;
          const categoryCount = selectedDeliverables.filter((d) =>
            getDeliverablesByCategory(category).some((item) => item.id === d.type),
          ).length;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveDeliverableTab(category)}
              className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {category}
              {categoryCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-primary text-white">
                  {categoryCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Deliverable cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categoryItems.map((item) => {
          const isSelected = selectedDeliverables.some(
            (d) => d.type === item.id,
          );
          const currentQty =
            selectedDeliverables.find((d) => d.type === item.id)?.quantity || 1;
          const Icon = getIcon(item.icon);
          const isRecommended = recommendedTypeIds.has(item.id);

          return (
            <Card
              key={item.id}
              padding="none"
              className={`transition-all cursor-pointer ${
                isSelected
                  ? "ring-2 ring-emerald-500 border-emerald-200"
                  : "hover:shadow-md"
              }`}
              onClick={() => toggleDeliverable(item.id)}
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
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {item.name}
                      </h4>
                      {isRecommended && (
                        <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    readOnly
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mt-1 pointer-events-none"
                  />
                </div>

                {/* Output formats + funnel stage */}
                <div className="flex flex-wrap gap-1">
                  {item.outputFormats.map((format) => (
                    <Badge key={format} size="sm">
                      {format}
                    </Badge>
                  ))}
                  <Badge size="sm" variant="info">
                    {item.funnelStage}
                  </Badge>
                </div>

                {/* Quantity stepper (only when selected) */}
                {isSelected && (
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
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
          {recommendedTypeIds.size > 0 && (
            <span className="text-gray-400 ml-1">
              ({recommendedTypeIds.size} from AI strategy)
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export default DeliverablesStep;
