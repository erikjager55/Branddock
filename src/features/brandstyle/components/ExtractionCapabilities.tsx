"use client";

import { Palette, Type, Layers, Ruler } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/shared";

const CAPABILITIES = [
  { icon: Palette, key: "colors" },
  { icon: Type, key: "typography" },
  { icon: Layers, key: "components" },
  { icon: Ruler, key: "spacing" },
] as const;

export function ExtractionCapabilities() {
  const { t } = useTranslation("brandstyle");
  return (
    <Card data-testid="extraction-capabilities">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        {t("capabilities.title")}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {CAPABILITIES.map((cap) => (
          <div key={cap.key} data-testid="capability-item" className="flex gap-3">
            <div className="w-8 h-8 rounded-md bg-primary-50 flex items-center justify-center flex-shrink-0">
              <cap.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{t(`capabilities.items.${cap.key}.title`)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t(`capabilities.items.${cap.key}.description`)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
