"use client";

import { useTranslation } from "react-i18next";
import { Minus, Plus, UserCheck } from "lucide-react";
import { Card } from "@/components/shared";
import { FACILITATOR_PRICE } from "../../constants/workshop-pricing";

interface WorkshopOptionsProps {
  workshopCount: number;
  hasFacilitator: boolean;
  onCountChange: (count: number) => void;
  onFacilitatorChange: (value: boolean) => void;
}

export function WorkshopOptions({
  workshopCount,
  hasFacilitator,
  onCountChange,
  onFacilitatorChange,
}: WorkshopOptionsProps) {
  const { t } = useTranslation("workshop");
  return (
    <Card padding="none">
      <Card.Body>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              {t("purchase.options.numberOfWorkshops")}
            </label>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => onCountChange(workshopCount - 1)}
                disabled={workshopCount <= 1}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-lg font-semibold text-gray-900 w-8 text-center">
                {workshopCount}
              </span>
              <button
                onClick={() => onCountChange(workshopCount + 1)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasFacilitator}
                onChange={(e) => onFacilitatorChange(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-gray-900">
                    {t("purchase.options.addFacilitator")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t("purchase.options.facilitatorHelp", { price: FACILITATOR_PRICE })}
                </p>
              </div>
            </label>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
