"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload } from "lucide-react";
import { Modal, Button } from "@/components/shared";
import { useUploadFont } from "../../hooks/useBrandstyleHooks";
import type { FontRole } from "../../types/brandstyle.types";

interface FontUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetName?: string;
  presetRole?: FontRole;
}

const ROLE_OPTIONS: FontRole[] = ["DISPLAY", "UI", "EYEBROW_META", "BODY"];

const ALLOWED_EXT = ["woff2", "woff", "ttf", "otf"];

/**
 * Wrapper that only renders the form body when open, so local state resets
 * via remount rather than a state-in-effect reset cascade.
 */
export function FontUploadModal(props: FontUploadModalProps) {
  const { t } = useTranslation("brandstyle");
  if (!props.isOpen) {
    return (
      <Modal isOpen={false} onClose={props.onClose} title={t("fonts.uploadModal.title")} size="md">
        <div />
      </Modal>
    );
  }
  return <FontUploadForm {...props} />;
}

function FontUploadForm({ onClose, presetName, presetRole }: FontUploadModalProps) {
  const { t } = useTranslation("brandstyle");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(presetName ?? "");
  const [role, setRole] = useState<FontRole>(presetRole ?? "UI");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);

  const uploadMut = useUploadFont();

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) {
      setError(t("fonts.uploadModal.errUnsupported", { types: ALLOWED_EXT.join(", ") }));
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError(t("fonts.uploadModal.errTooLarge"));
      return;
    }
    setFile(f);
    // Derive a default name from the filename if empty
    if (!name.trim()) {
      const base = f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      setName(base);
    }
  };

  const handleSubmit = () => {
    if (!file || !name.trim()) {
      setError(t("fonts.uploadModal.errNoFile"));
      return;
    }
    uploadMut.mutate(
      { file, name: name.trim(), role, weight: weight.trim() || undefined },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(err instanceof Error ? err.message : t("fonts.uploadModal.errUploadFailed")),
      },
    );
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t("fonts.uploadModal.title")}
      subtitle={t("fonts.uploadModal.subtitle")}
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
            disabled={!file || !name.trim()}
          >
            {t("actions.upload")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Drag-drop zone */}
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
                {t("fonts.uploadModal.clickReplace", { kb: (file.size / 1024).toFixed(1) })}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700">{t("fonts.uploadModal.clickSelect")}</p>
              <p className="text-xs text-gray-500">{t("fonts.uploadModal.extHint", { types: ALLOWED_EXT.join(", ") })}</p>
            </>
          )}
          <input
            type="file"
            accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("fonts.uploadModal.nameLabel")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("fonts.uploadModal.namePlaceholder")}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("fonts.uploadModal.roleLabel")}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as FontRole)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {t(`fonts.uploadModal.roleOptions.${r}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Weight */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t("fonts.uploadModal.weightLabel")} <span className="text-gray-400">{t("common.optional")}</span>
          </label>
          <input
            type="text"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={t("fonts.uploadModal.weightPlaceholder")}
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
