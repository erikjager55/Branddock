"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageOff, Trash2, Pencil } from "lucide-react";
import type { StyleguideLogoData, LogoVariant } from "../../types/brandstyle.types";
import { useDeleteLogo, useUpdateLogo } from "../../hooks/useBrandstyleHooks";

interface LogoCardProps {
  logo: StyleguideLogoData;
  canEdit: boolean;
}

const VARIANT_OPTIONS: LogoVariant[] = ["PRIMARY", "LIGHT", "DARK", "ICON", "WORDMARK", "LOCKUP"];

export function LogoCard({ logo, canEdit }: LogoCardProps) {
  const { t } = useTranslation("brandstyle");
  const [imgError, setImgError] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [variant, setVariant] = useState<LogoVariant>(logo.variant);
  const [description, setDescription] = useState(logo.description ?? "");

  const deleteMut = useDeleteLogo();
  const updateMut = useUpdateLogo();

  // "LIGHT" = logo designed for light application → show on DARK background.
  // Everything else previews cleanly on the subtle grey.
  const previewBgClass = logo.variant === "LIGHT" ? "bg-gray-900" : "bg-gray-50";

  const handleDelete = () => {
    const confirmed = window.confirm(t("logos.confirmDelete"));
    if (confirmed) deleteMut.mutate(logo.id);
  };

  const handleSaveMeta = () => {
    updateMut.mutate(
      { id: logo.id, body: { variant, description: description.trim() || null } },
      { onSuccess: () => setEditingMeta(false) },
    );
  };

  return (
    <div
      className="relative border border-gray-200 rounded-lg p-4 bg-white"
      data-testid={`logo-card-${logo.id}`}
    >
      <div className={`aspect-[3/2] rounded-md flex items-center justify-center overflow-hidden mb-3 ${previewBgClass}`}>
        {imgError || !logo.fileUrl ? (
          <div className="flex flex-col items-center gap-1 text-gray-300">
            <ImageOff className="h-8 w-8" />
            <span className="text-xs">{logo.fileType}</span>
          </div>
        ) : (
          <img
            src={logo.fileUrl}
            alt={logo.description ?? t(`logos.variants.${logo.variant}`)}
            className="max-w-full max-h-full object-contain"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {editingMeta ? (
        <div className="space-y-2">
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as LogoVariant)}
            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {VARIANT_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {t(`logos.variants.${v}`)}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("logos.optionalDescription")}
            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingMeta(false)}
              disabled={updateMut.isPending}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {t("actions.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSaveMeta}
              disabled={updateMut.isPending}
              style={{ backgroundColor: "#0d9488", color: "#ffffff" }}
              className="text-xs font-medium px-2.5 py-1 rounded-md hover:opacity-90 disabled:opacity-60"
            >
              {t("actions.save")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              {t(`logos.variants.${logo.variant}`)}
            </span>
            <p className="text-sm font-medium text-gray-900 mt-1 truncate">
              {logo.description ?? logo.fileName}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {logo.fileType.toUpperCase()}
              {logo.width && logo.height ? ` · ${logo.width}×${logo.height}` : ""}
            </p>
          </div>
          {canEdit && (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setEditingMeta(true)}
                className="p-1 text-gray-400 hover:text-primary transition-colors"
                aria-label={t("logos.editAria")}
                title={t("logos.editTitle")}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMut.isPending}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                aria-label={t("logos.deleteAria")}
                title={t("logos.deleteTitle")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
