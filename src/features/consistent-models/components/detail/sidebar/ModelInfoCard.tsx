"use client";

import { useTranslation } from "react-i18next";
import { useFormat } from "@/lib/ui-i18n/format";
import { Calendar, Cpu, Hash, Sparkles } from "lucide-react";
import { Card } from "@/components/shared";
import { ModelTypeBadge } from "../../shared/ModelTypeBadge";
import { ModelStatusBadge } from "../../shared/ModelStatusBadge";
import { TriggerWordDisplay } from "../../shared/TriggerWordDisplay";
import { TRAINABLE_TYPES } from "../../../constants/model-constants";
import type { ConsistentModelDetail } from "../../../types/consistent-model.types";

interface ModelInfoCardProps {
  model: ConsistentModelDetail;
}

/** Sidebar card with model metadata */
export function ModelInfoCard({ model }: ModelInfoCardProps) {
  const { t } = useTranslation("consistent-models");
  const { formatDate } = useFormat();
  const createdDate = formatDate(new Date(model.createdAt), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const isTrainable = TRAINABLE_TYPES.has(model.type);

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{t("modelInfo.heading")}</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{t("modelInfo.status")}</span>
          <ModelStatusBadge status={model.status} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{t("modelInfo.type")}</span>
          <ModelTypeBadge type={model.type} size="sm" />
        </div>
        {isTrainable && model.triggerWord && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t("modelInfo.trigger")}</span>
            <TriggerWordDisplay triggerWord={model.triggerWord} />
          </div>
        )}
        {isTrainable && model.baseModel && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t("modelInfo.baseModel")}</span>
            <span className="text-sm text-gray-700">{model.baseModel}</span>
          </div>
        )}
        {!isTrainable && model.modelName && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t("modelInfo.modelName")}</span>
            <span className="text-sm text-gray-700 line-clamp-1">{model.modelName}</span>
          </div>
        )}
        {!isTrainable && model.modelDescription && (
          <div className="space-y-1">
            <span className="text-sm text-gray-500">{t("modelInfo.description")}</span>
            <p className="text-sm text-gray-700 line-clamp-3">{model.modelDescription}</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{t("modelInfo.created")}</span>
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <Calendar className="h-3.5 w-3.5" />
            {createdDate}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{t("modelInfo.images")}</span>
          <span className="text-sm text-gray-700">
            {model.referenceImages.length}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{t("modelInfo.generations")}</span>
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <Sparkles className="h-3.5 w-3.5" />
            {model.usageCount}
          </span>
        </div>
      </div>
    </Card>
  );
}
