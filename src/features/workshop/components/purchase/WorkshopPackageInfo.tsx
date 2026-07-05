"use client";

import { useTranslation } from "react-i18next";
import { CheckCircle, Clock, Users, Monitor } from "lucide-react";
import { Card } from "@/components/shared";

const INCLUDED_ITEM_KEYS = [
  "purchase.package.included.workshop",
  "purchase.package.included.summary",
  "purchase.package.included.canvas",
  "purchase.package.included.capture",
  "purchase.package.included.recommendations",
  "purchase.package.included.documentation",
];

const SPECS = [
  { icon: Clock, labelKey: "purchase.package.specs.durationLabel", valueKey: "purchase.package.specs.durationValue" },
  { icon: Users, labelKey: "purchase.package.specs.participantsLabel", valueKey: "purchase.package.specs.participantsValue" },
  { icon: Monitor, labelKey: "purchase.package.specs.formatLabel", valueKey: "purchase.package.specs.formatValue" },
];

export function WorkshopPackageInfo() {
  const { t } = useTranslation("workshop");
  return (
    <Card padding="none">
      <Card.Header>
        <h2 className="text-xl font-semibold text-gray-900">
          {t("purchase.package.title")}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {t("purchase.package.subtitle")}
        </p>
      </Card.Header>
      <Card.Body>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {t("purchase.package.includedTitle")}
            </h3>
            <ul className="space-y-2">
              {INCLUDED_ITEM_KEYS.map((itemKey) => (
                <li key={itemKey} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{t(itemKey)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="grid grid-cols-3 gap-4">
              {SPECS.map((spec) => (
                <div key={spec.labelKey} className="text-center">
                  <spec.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-gray-500">{t(spec.labelKey)}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {t(spec.valueKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
