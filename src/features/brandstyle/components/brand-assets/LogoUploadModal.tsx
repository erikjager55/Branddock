"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload } from "lucide-react";
import { Modal, Button } from "@/components/shared";
import { useUploadLogo } from "../../hooks/useBrandstyleHooks";
import type { LogoVariant } from "../../types/brandstyle.types";

interface LogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetVariant?: LogoVariant;
}

const VARIANT_OPTIONS: LogoVariant[] = ["PRIMARY", "LIGHT", "DARK", "ICON", "WORDMARK", "LOCKUP"];

const ALLOWED_EXT = ["svg", "png", "jpg", "jpeg"];

export function LogoUploadModal(props: LogoUploadModalProps) {
  const { t } = useTranslation("brandstyle");
  if (!props.isOpen) {
    return (
      <Modal isOpen={false} onClose={props.onClose} title={t("logos.uploadModal.title")} size="md">
        <div />
      </Modal>
    );
  }
  return <LogoUploadForm {...props} />;
}

function LogoUploadForm({ onClose, presetVariant }: LogoUploadModalProps) {
  const { t } = useTranslation("brandstyle");
  const [file, setFile] = useState<File | null>(null);
  const [variant, setVariant] = useState<LogoVariant>(presetVariant ?? "PRIMARY");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const uploadMut = useUploadLogo();

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) {
      setError(t("logos.uploadModal.errUnsupported", { types: ALLOWED_EXT.join(", ") }));
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(t("logos.uploadModal.errTooLarge"));
      return;
    }
    setFile(f);
  };

  const handleSubmit = () => {
    if (!file) {
      setError(t("logos.uploadModal.errNoFile"));
      return;
    }
    uploadMut.mutate(
      { file, variant, description: description.trim() || undefined },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(err instanceof Error ? err.message : t("logos.uploadModal.errUploadFailed")),
      },
    );
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t("logos.uploadModal.title")}
      subtitle={t("logos.uploadModal.subtitle")}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={uploadMut.isPending}>
            {t("actions.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={uploadMut.isPending}
            disabled={!file}
          >
            {t("actions.upload")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <label
          className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            file ? "border-emerald-300 bg-emerald-50/40" : "border-gray-300 hover:border-primary hover:bg-gray-50"
          }`}
        >
          <Upload className="h-6 w-6 text-gray-400" />
          {file ? (
            <>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {t("logos.uploadModal.clickReplace", { kb: (file.size / 1024).toFixed(1) })}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700">{t("logos.uploadModal.clickSelect")}</p>
              <p className="text-xs text-gray-500">{t("logos.uploadModal.extHint", { types: ALLOWED_EXT.join(", ") })}</p>
            </>
          )}
          <input
            type="file"
            accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("logos.uploadModal.variant")}</label>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as LogoVariant)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {VARIANT_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {t(`logos.uploadModal.variantOptions.${v}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("logos.uploadModal.description")} <span className="text-gray-400">{t("common.optional")}</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("logos.uploadModal.descriptionPlaceholder")}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
