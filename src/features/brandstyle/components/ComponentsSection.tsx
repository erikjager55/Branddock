"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/shared";
import type { BrandStyleguide, ComponentTypeKey, StyleguideComponentData } from "../types/brandstyle.types";
import { ReviewDraftPanel } from "./review/ReviewDraftPanel";
import { ComponentCard } from "./components-section/ComponentCard";
import { ScrapedButtonProfilePreview } from "./components-section/ScrapedButtonProfilePreview";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";
import { parseSemanticTokens } from "../utils/semantic-tokens";

const VARIANT_ORDER = ['button-primary', 'button-secondary', 'button-tertiary', 'button-ghost', 'button-other'];

const VARIANT_KEYS: Record<string, string> = {
  'button-primary': 'primary',
  'button-secondary': 'secondary',
  'button-tertiary': 'tertiary',
  'button-ghost': 'ghost',
  'button-other': 'other',
};

interface ComponentsSectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

const TYPE_TABS: {
  id: ComponentTypeKey;
  reviewSection:
    | "components-buttons"
    | "components-form-inputs"
    | "components-status-chips"
    | "components-product-cards"
    | "components-feature-icons"
    | "components-top-navigation"
    | "components-quote-blocks";
}[] = [
  { id: "BUTTON", reviewSection: "components-buttons" },
  { id: "FORM_INPUT", reviewSection: "components-form-inputs" },
  { id: "STATUS_CHIP", reviewSection: "components-status-chips" },
  { id: "PRODUCT_CARD", reviewSection: "components-product-cards" },
  { id: "FEATURE_ICON", reviewSection: "components-feature-icons" },
  { id: "TOP_NAVIGATION", reviewSection: "components-top-navigation" },
  { id: "QUOTE_BLOCK", reviewSection: "components-quote-blocks" },
];

export function ComponentsSection({ styleguide, canEdit }: ComponentsSectionProps) {
  const { t } = useTranslation("brandstyle");
  const activeType = useBrandstyleStore((s) => s.activeComponentType);
  const setActiveType = useBrandstyleStore((s) => s.setActiveComponentType);
  const all = styleguide.components ?? [];
  const reviews = styleguide.reviews ?? [];

  const variantMap = useMemo(() => {
    const tokens = parseSemanticTokens(styleguide.semanticTokens);
    return tokens?.resolved.componentVariants ?? {};
  }, [styleguide.semanticTokens]);

  const countByType = TYPE_TABS.map((t) => ({
    ...t,
    count: all.filter((c) => c.type === t.id).length,
  }));

  const visible = all.filter((c) => c.type === activeType);
  const currentTab = TYPE_TABS.find((t) => t.id === activeType)!;

  // Voor buttons groeperen we per variant. Andere types renderen flat tot
  // we daarvoor ook classificatie hebben.
  const buttonGroups = useMemo(() => {
    if (activeType !== 'BUTTON') return null;
    const byVariant: Record<string, StyleguideComponentData[]> = {};
    for (const c of visible) {
      const variant = variantMap[c.id] ?? 'button-other';
      (byVariant[variant] ??= []).push(c);
    }
    return byVariant;
  }, [activeType, visible, variantMap]);

  return (
    <div data-testid="components-section" className="space-y-6">
      <Card>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">{t("components.title")}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t("components.subtitle")}
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="border-b border-gray-200 mb-5">
          <nav className="flex gap-1 overflow-x-auto">
            {countByType.map((tab) => {
              const active = activeType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveType(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    active
                      ? "border-primary-500 text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t(`components.types.${tab.id}`)}
                  <span
                    className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 text-[10px] font-semibold rounded-full ${
                      active ? "bg-primary-100 text-primary" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Voor BUTTON-tab: v4 scraped buttonProfile-preview boven de
            per-StyleguideComponent variant-groups. Toont wat de LP-renderer
            consumeert (pill-shape / radius / hover-state). */}
        {activeType === 'BUTTON' ? (
          <ScrapedButtonProfilePreview
            buttonProfile={(styleguide as unknown as { buttonProfile?: unknown }).buttonProfile}
          />
        ) : null}

        {visible.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400 space-y-1">
            <div className="font-medium text-gray-500">
              {t("components.emptyTitle", { type: t(`components.types.${currentTab.id}`).toLowerCase() })}
            </div>
            <div className="text-xs">
              {t("components.emptyBody")}
            </div>
          </div>
        ) : buttonGroups ? (
          <div className="space-y-8">
            {VARIANT_ORDER.filter((v) => buttonGroups[v]?.length).map((variant) => {
              const items = buttonGroups[variant]!;
              return (
                <div key={variant}>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      {VARIANT_KEYS[variant] ? t(`components.variants.${VARIANT_KEYS[variant]}`) : variant}
                    </h4>
                    <code className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                      {variant}
                    </code>
                    <span className="text-xs text-gray-400">{t("components.sampleCount", { count: items.length })}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((component) => (
                      <ComponentCard
                        key={component.id}
                        component={component}
                        canEdit={canEdit}
                        variant={variant}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((component) => (
              <ComponentCard
                key={component.id}
                component={component}
                canEdit={canEdit}
                variant={variantMap[component.id]}
              />
            ))}
          </div>
        )}

        <ReviewDraftPanel
          section={currentTab.reviewSection}
          reviews={reviews}
          canEdit={canEdit}
          label={t("components.reviewLabel", { type: t(`components.types.${currentTab.id}`).toLowerCase() })}
        />
      </Card>
    </div>
  );
}
