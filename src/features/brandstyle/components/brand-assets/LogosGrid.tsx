"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ImageOff } from "lucide-react";
import { Card, Button } from "@/components/shared";
import type { StyleguideLogoData } from "../../types/brandstyle.types";
import { LogoCard } from "./LogoCard";
import { LogoUploadModal } from "./LogoUploadModal";

interface LogosGridProps {
  logos: StyleguideLogoData[];
  canEdit: boolean;
  /** Optional review panel rendered inside the same card. */
  reviewSlot?: React.ReactNode;
}

export function LogosGrid({ logos, canEdit, reviewSlot }: LogosGridProps) {
  const { t } = useTranslation("brandstyle");
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t("logos.gridTitle")}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t("logos.gridSubtitle")}
          </p>
        </div>
        {canEdit && (
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setUploadOpen(true)}>
            {t("logos.uploadLogo")}
          </Button>
        )}
      </div>

      {logos.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-gray-400">
          <ImageOff className="h-8 w-8 mb-2" />
          <p className="text-sm">{t("logos.gridEmpty")}</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-700"
            >
              <Plus className="w-4 h-4" />
              {t("logos.uploadFirst")}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {logos.map((logo) => (
            <LogoCard key={logo.id} logo={logo} canEdit={canEdit} />
          ))}
        </div>
      )}

      {reviewSlot}
      <LogoUploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
    </Card>
  );
}
