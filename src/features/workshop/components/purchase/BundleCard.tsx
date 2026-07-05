"use client";

import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { useFormat } from "@/lib/ui-i18n/format";
import { Badge, Card } from "@/components/shared";
import type { WorkshopBundle } from "../../types/workshop.types";

const BADGE_VARIANTS: Record<string, { variant: "info" | "success" | "teal"; }> = {
  "Most Popular": { variant: "info" },
  "Best Value": { variant: "success" },
  Comprehensive: { variant: "teal" },
};

interface BundleCardProps {
  bundle: WorkshopBundle;
  isSelected: boolean;
  onSelect: () => void;
}

export function BundleCard({ bundle, isSelected, onSelect }: BundleCardProps) {
  const { t } = useTranslation("workshop");
  const { formatCurrency } = useFormat();
  const badgeConfig = bundle.badge ? BADGE_VARIANTS[bundle.badge] : null;

  return (
    <Card
      data-testid="bundle-card"
      padding="none"
      className={`cursor-pointer transition-all ${
        isSelected
          ? "ring-2 ring-emerald-500 border-emerald-500"
          : "hover:border-gray-300"
      }`}
      onClick={onSelect}
    >
      <Card.Body>
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{bundle.name}</h3>
              {bundle.badge && badgeConfig && (
                <Badge variant={badgeConfig.variant} size="sm" className="mt-1">
                  {bundle.badge}
                </Badge>
              )}
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                isSelected
                  ? "bg-emerald-500 border-emerald-500"
                  : "border-gray-300"
              }`}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>

          {bundle.description && (
            <p className="text-sm text-gray-500">{bundle.description}</p>
          )}

          <div className="space-y-1">
            {bundle.assetNames.map((name) => (
              <div key={name} className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                {name}
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(bundle.finalPrice, "EUR")}
              </span>
              {bundle.discount > 0 && (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    {formatCurrency(bundle.basePrice, "EUR")}
                  </span>
                  <Badge variant="success" size="sm">
                    {t("purchase.bundle.save", { amount: bundle.discount })}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
