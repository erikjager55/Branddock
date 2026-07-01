"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Button, Input, Select } from "@/components/shared";
import { TYPE_CONFIG, MODEL_TYPE_OPTIONS, TRAINABLE_TYPES, ILLUSTRATION_STYLE_OPTIONS } from "../constants/model-constants";
import { useCreateModel } from "../hooks";
import type { ConsistentModelType, IllustrationStyleParams } from "../types/consistent-model.types";

interface CreateModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: ConsistentModelType | null;
  onCreated?: (id: string) => void;
}

/** Modal for creating a new consistent model */
export function CreateModelModal({
  isOpen,
  onClose,
  initialType,
  onCreated,
}: CreateModelModalProps) {
  const { t } = useTranslation("consistent-models");
  const [name, setName] = useState("");
  const [type, setType] = useState<ConsistentModelType>(initialType ?? "PERSON");
  const [description, setDescription] = useState("");
  const [modelName, setModelName] = useState("");
  const [modelDescription, setModelDescription] = useState("");
  // Illustration-specific state
  const [illustrationStyle, setIllustrationStyle] = useState<string | null>(null);
  const [colorApproach, setColorApproach] = useState<string | null>(null);
  const [lineQuality, setLineQuality] = useState<string | null>(null);
  const [detailLevel, setDetailLevel] = useState<string | null>(null);
  const [mood, setMood] = useState("");
  const createModel = useCreateModel();

  const isTrainable = TRAINABLE_TYPES.has(type);

  const resetIllustrationFields = () => {
    setIllustrationStyle(null);
    setColorApproach(null);
    setLineQuality(null);
    setDetailLevel(null);
    setMood("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let generationParams: IllustrationStyleParams | undefined;
    if (type === "ILLUSTRATION") {
      generationParams = {
        illustrationStyle: illustrationStyle || null,
        colorApproach: colorApproach || null,
        lineQuality: lineQuality || null,
        detailLevel: detailLevel || null,
        mood: mood.trim() || null,
      };
    }

    const result = await createModel.mutateAsync({
      name: name.trim(),
      type,
      description: description.trim() || undefined,
      ...(!isTrainable && {
        modelName: modelName.trim() || undefined,
        modelDescription: modelDescription.trim() || undefined,
        ...(generationParams !== undefined && { generationParams }),
      }),
    });

    setName("");
    setDescription("");
    setModelName("");
    setModelDescription("");
    resetIllustrationFields();
    onClose();
    onCreated?.(result.id);
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setModelName("");
    setModelDescription("");
    resetIllustrationFields();
    setType(initialType ?? "PERSON");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("create.title")} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <Input
          label={t("create.nameLabel")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("create.namePlaceholder")}
          required
        />

        {/* Type selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t("create.typeLabel")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            {MODEL_TYPE_OPTIONS.map((opt) => {
              const config = TYPE_CONFIG[opt.value as ConsistentModelType];
              const isSelected = type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value as ConsistentModelType)}
                  style={isSelected ? {
                    borderColor: config.borderHex,
                    backgroundColor: config.bgHex,
                  } : undefined}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    isSelected ? "" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    style={isSelected ? { color: config.colorHex } : undefined}
                    className={`text-sm font-medium ${isSelected ? "" : "text-gray-900"}`}
                  >
                    {config.label}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">{config.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("create.descriptionLabel")} <span className="font-normal text-gray-400">{t("create.optional")}</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("create.descriptionPlaceholder")}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Non-trainable extra fields */}
        {!isTrainable && (
          <>
            <Input
              label={t("create.styleGuideNameLabel")}
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder={t("create.styleGuideNamePlaceholder")}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("create.styleGuideDescriptionLabel")}
              </label>
              <textarea
                value={modelDescription}
                onChange={(e) => setModelDescription(e.target.value)}
                placeholder={t("create.styleGuideDescriptionPlaceholder")}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            {type === "ILLUSTRATION" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label={t("create.illustrationStyleLabel")}
                    options={[...ILLUSTRATION_STYLE_OPTIONS.illustrationStyle]}
                    value={illustrationStyle}
                    onChange={setIllustrationStyle}
                    placeholder={t("create.illustrationStylePlaceholder")}
                    allowClear
                  />
                  <Select
                    label={t("create.colorApproachLabel")}
                    options={[...ILLUSTRATION_STYLE_OPTIONS.colorApproach]}
                    value={colorApproach}
                    onChange={setColorApproach}
                    placeholder={t("create.colorApproachPlaceholder")}
                    allowClear
                  />
                  <Select
                    label={t("create.lineQualityLabel")}
                    options={[...ILLUSTRATION_STYLE_OPTIONS.lineQuality]}
                    value={lineQuality}
                    onChange={setLineQuality}
                    placeholder={t("create.lineQualityPlaceholder")}
                    allowClear
                  />
                  <Select
                    label={t("create.detailLevelLabel")}
                    options={[...ILLUSTRATION_STYLE_OPTIONS.detailLevel]}
                    value={detailLevel}
                    onChange={setDetailLevel}
                    placeholder={t("create.detailLevelPlaceholder")}
                    allowClear
                  />
                </div>
                <Input
                  label={t("create.moodLabel")}
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder={t("create.moodPlaceholder")}
                />
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} type="button">
            {t("create.cancel")}
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={createModel.isPending}
            disabled={!name.trim()}
          >
            {t("create.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
