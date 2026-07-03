"use client";

import { useTranslation } from "react-i18next";
import type { ConsistentModelDetail, UpdateModelBody } from "../../types/consistent-model.types";
import type { UseMutationResult } from "@tanstack/react-query";

interface StyleGuideDetailsSectionProps {
  model: ConsistentModelDetail;
  updateModel: UseMutationResult<ConsistentModelDetail, Error, UpdateModelBody>;
}

/** Style guide form fields for non-trainable model types (BRAND_STYLE, PHOTOGRAPHY) */
export function StyleGuideDetailsSection({
  model,
  updateModel,
}: StyleGuideDetailsSectionProps) {
  const { t } = useTranslation("consistent-models");
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">{t("styleGuide.heading")}</h3>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("styleGuide.nameLabel")}</label>
        <input
          type="text"
          value={model.modelName ?? ""}
          onChange={(e) => updateModel.mutate({ modelName: e.target.value })}
          placeholder={t("styleGuide.namePlaceholder")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("styleGuide.descriptionLabel")}</label>
        <textarea
          value={model.modelDescription ?? ""}
          onChange={(e) => updateModel.mutate({ modelDescription: e.target.value })}
          placeholder={t("styleGuide.descriptionPlaceholder")}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("styleGuide.stylePromptLabel")}</label>
        <textarea
          value={model.stylePrompt ?? ""}
          onChange={(e) => updateModel.mutate({ stylePrompt: e.target.value })}
          placeholder={t("styleGuide.stylePromptPlaceholder")}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("styleGuide.negativePromptLabel")}</label>
        <textarea
          value={model.negativePrompt ?? ""}
          onChange={(e) => updateModel.mutate({ negativePrompt: e.target.value })}
          placeholder={t("styleGuide.negativePromptPlaceholder")}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
    </div>
  );
}
