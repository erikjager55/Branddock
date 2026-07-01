"use client";

import { useTranslation } from "react-i18next";
import { DollarSign } from "lucide-react";

interface PricingModelCardProps {
  pricingModel: string | null;
  pricingDetails: string | null;
}

export function PricingModelCard({
  pricingModel,
  pricingDetails,
}: PricingModelCardProps) {
  const { t } = useTranslation("products");
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="h-4 w-4 text-green-600" />
        <h3 className="text-sm font-semibold text-gray-900">{t("pricingCard.title")}</h3>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
            {t("pricingCard.model")}
          </p>
          <p className="text-sm font-medium text-gray-900">
            {pricingModel || t("pricingCard.notSet")}
          </p>
        </div>

        {pricingDetails && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
              {t("pricingCard.details")}
            </p>
            <p className="text-sm text-gray-600">{pricingDetails}</p>
          </div>
        )}
      </div>
    </div>
  );
}
