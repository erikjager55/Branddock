"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input } from "@/components/shared";
import { Select } from "@/components/shared";
import { useCreateProduct } from "../../hooks";
import { CATEGORY_OPTIONS, CATEGORY_GROUPS } from "../../constants/product-constants";

// ─── Component ────────────────────────────────────────────

interface ManualEntryTabProps {
  onBack: () => void;
  onNavigateToDetail: (id: string) => void;
}

export function ManualEntryTab({
  onBack,
  onNavigateToDetail,
}: ManualEntryTabProps) {
  const { t } = useTranslation("products");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [pricingModel, setPricingModel] = useState("");
  const [features, setFeatures] = useState("");
  const [benefits, setBenefits] = useState("");
  const [useCases, setUseCases] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createProduct = useCreateProduct();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t("analyzer.manual.errorNameRequired");
    if (!description.trim()) newErrors.description = t("analyzer.manual.errorDescriptionRequired");
    if (description.length > 2000)
      newErrors.description = t("analyzer.manual.errorDescriptionTooLong");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseLines = (text: string): string[] =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const handleSave = () => {
    if (!validate()) return;

    createProduct.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        category: category ?? undefined,
        pricingModel: pricingModel.trim() || undefined,
        features: parseLines(features),
        benefits: parseLines(benefits),
        useCases: parseLines(useCases),
      },
      {
        onSuccess: (data) => {
          const productId =
            (data as { product?: { id?: string } })?.product?.id ??
            (data as { id?: string })?.id;
          if (productId) {
            onNavigateToDetail(productId);
          }
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Product Name */}
      <Input
        label={t("analyzer.manual.nameLabel")}
        required
        placeholder={t("analyzer.manual.namePlaceholder")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <span className="text-red-500 mr-0.5">*</span>
          {t("fields.description")}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("analyzer.manual.descriptionPlaceholder")}
          maxLength={2000}
          rows={4}
          className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow resize-none ${
            errors.description
              ? "border-red-300 focus:ring-red-500"
              : "border-gray-200 focus:ring-primary-500"
          }`}
        />
        <div className="flex items-center justify-between mt-1.5">
          {errors.description ? (
            <p className="text-xs text-red-500">{errors.description}</p>
          ) : (
            <span />
          )}
          <p className="text-xs text-gray-400">{description.length}/2000</p>
        </div>
      </div>

      {/* Category */}
      <Select
        label={t("fields.category")}
        value={category}
        onChange={setCategory}
        options={CATEGORY_OPTIONS}
        groups={CATEGORY_GROUPS}
        placeholder={t("fields.selectCategoryLong")}
      />

      {/* Pricing Model */}
      <Input
        label={t("fields.pricingModel")}
        placeholder={t("analyzer.manual.pricingPlaceholder")}
        value={pricingModel}
        onChange={(e) => setPricingModel(e.target.value)}
      />

      {/* Key Features */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {t("analyzer.manual.featuresLabel")}
        </label>
        <textarea
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          placeholder={t("analyzer.manual.featuresPlaceholder")}
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow resize-none font-mono"
        />
      </div>

      {/* Key Benefits */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {t("analyzer.manual.benefitsLabel")}
        </label>
        <textarea
          value={benefits}
          onChange={(e) => setBenefits(e.target.value)}
          placeholder={t("analyzer.manual.benefitsPlaceholder")}
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow resize-none font-mono"
        />
      </div>

      {/* Use Cases */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {t("analyzer.manual.useCasesLabel")}
        </label>
        <textarea
          value={useCases}
          onChange={(e) => setUseCases(e.target.value)}
          placeholder={t("analyzer.manual.useCasesPlaceholder")}
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow resize-none font-mono"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <Button variant="ghost" onClick={onBack}>
          {t("actions.cancel")}
        </Button>
        <Button
          variant="cta"
          onClick={handleSave}
          isLoading={createProduct.isPending}
        >
          {t("analyzer.manual.saveProduct")}
        </Button>
      </div>
    </div>
  );
}
