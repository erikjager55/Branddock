"use client";

import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

interface WhatWeExtractGridProps {
  items?: string[];
}

export function WhatWeExtractGrid({ items }: WhatWeExtractGridProps) {
  const { t } = useTranslation("products");
  const resolvedItems = items ?? [
    t("analyzer.whatWeExtract.items.features"),
    t("analyzer.whatWeExtract.items.pricing"),
    t("analyzer.whatWeExtract.items.useCases"),
    t("analyzer.whatWeExtract.items.audience"),
    t("analyzer.whatWeExtract.items.images"),
  ];
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        {t("analyzer.whatWeExtract.title")}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {resolvedItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-lg bg-green-50 p-3"
          >
            <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
            <span className="text-sm text-gray-700">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
