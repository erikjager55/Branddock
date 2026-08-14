"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Card } from "@/components/shared";
import { useUpdateSection } from "../hooks/useBrandstyleHooks";
import { parseBrandImages, type BrandImage } from "@/lib/landing-pages/brand-images";
import type { BrandStyleguide } from "../types/brandstyle.types";

interface BrandImagesPanelProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

/**
 * Merkbeelden-beheer in de styleguide (lp-image-routes W2): toont de
 * `brandImages` die de generator gebruikt om hero-/feature-/artikel-slots
 * te vullen, met uploaden (via de media-library) en verwijderen. Persist
 * via de bestaande PATCH /api/brandstyle/imagery.
 */
export function BrandImagesPanel({ styleguide, canEdit }: BrandImagesPanelProps) {
  const { t } = useTranslation("brandstyle");
  const updateImagery = useUpdateSection("imagery");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const images = parseBrandImages(styleguide.brandImages);

  const persist = (next: BrandImage[], onSettled?: () => void) => {
    updateImagery.mutate({ brandImages: next }, { onSettled });
  };

  const handleRemove = (url: string) => {
    persist(images.filter((img) => img.url !== url));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset zodat dezelfde file opnieuw gekozen kan worden na een fout.
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name.replace(/\.[^.]+$/, "") || file.name);
      formData.append("category", "PHOTOGRAPHY");

      const res = await fetch("/api/media", { method: "POST", body: formData });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Upload failed (${res.status})`);
      }
      const asset = (await res.json()) as { fileUrl?: string };
      if (!asset.fileUrl) throw new Error("Upload response mist fileUrl");

      persist(
        [...images, { url: asset.fileUrl, alt: file.name.replace(/\.[^.]+$/, ""), context: "handmatige upload" }],
        () => setIsUploading(false),
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t("imagery.brandImagesUploadError"));
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">{t("imagery.brandImagesTitle")}</h3>
        {canEdit && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || updateImagery.isPending}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            {isUploading ? t("imagery.brandImagesUploading") : t("imagery.brandImagesAdd")}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">{t("imagery.brandImagesHint")}</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {uploadError && (
        <p className="text-xs text-red-600 mb-3" role="alert">
          {uploadError}
        </p>
      )}

      {images.length === 0 ? (
        <p className="text-sm text-gray-400">{t("imagery.brandImagesEmpty")}</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((img) => (
            <div key={img.url} className="relative group aspect-square rounded-md overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- externe/gescrapte URLs zonder bekende dimensies */}
              <img src={img.url} alt={img.alt ?? ""} loading="lazy" className="w-full h-full object-cover" />
              {canEdit && (
                <button
                  onClick={() => handleRemove(img.url)}
                  disabled={updateImagery.isPending}
                  title={t("imagery.brandImagesRemove")}
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-white/90 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-600 disabled:opacity-30 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
