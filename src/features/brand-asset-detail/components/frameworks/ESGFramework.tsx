"use client";

import { Leaf, Users, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Card } from "@/components/shared";
import type { ESGFrameworkData, ESGPillar } from "../../types/framework.types";

const PILLAR_CONFIG = {
  environmental: { icon: Leaf, color: "text-emerald-600" },
  social: { icon: Users, color: "text-blue-600" },
  governance: { icon: Shield, color: "text-purple-600" },
} as const;

const IMPACT_VARIANTS: Record<string, "success" | "warning" | "default"> = {
  high: "success",
  medium: "warning",
  low: "default",
};

function PillarCard({
  pillarKey,
  pillar,
}: {
  pillarKey: keyof typeof PILLAR_CONFIG;
  pillar: ESGPillar;
}) {
  const { t } = useTranslation("brand-asset-detail");
  const config = PILLAR_CONFIG[pillarKey];
  const Icon = config.icon;

  return (
    <Card padding="sm">
      <Card.Body>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${config.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">{t(`esg.${pillarKey}`)}</h4>
              <Badge variant={IMPACT_VARIANTS[pillar.impact] ?? "default"} size="sm">
                {t("esg.impact", { level: pillar.impact })}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{pillar.description}</p>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

export function ESGFramework({ data }: { data: ESGFrameworkData }) {
  return (
    <div className="space-y-3">
      {(Object.keys(PILLAR_CONFIG) as Array<keyof typeof PILLAR_CONFIG>).map(
        (key) =>
          data.pillars[key] && (
            <PillarCard key={key} pillarKey={key} pillar={data.pillars[key]} />
          )
      )}
    </div>
  );
}
