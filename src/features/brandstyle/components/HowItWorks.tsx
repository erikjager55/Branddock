"use client";

import { Globe, Cpu, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/shared";

const STEPS = [
  { icon: Globe, step: "1", key: "one" },
  { icon: Cpu, step: "2", key: "two" },
  { icon: Pencil, step: "3", key: "three" },
] as const;

export function HowItWorks() {
  const { t } = useTranslation("brandstyle");
  return (
    <Card data-testid="how-it-works">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        {t("howItWorks.title")}
      </h3>
      <div className="space-y-4">
        {STEPS.map((s) => (
          <div key={s.step} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-gray-600">{s.step}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{t(`howItWorks.steps.${s.key}.title`)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t(`howItWorks.steps.${s.key}.description`)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
