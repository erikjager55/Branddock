"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MonitorSmartphone } from "lucide-react";
import type { BrandStyleguide } from "../types/brandstyle.types";
import type { SemanticTokens } from "@/lib/brandstyle/semantic-role-resolver";
import {
  renderUiKitHtml,
  type SpecimenFixtures,
} from "@/lib/brandstyle/specimens";

interface BrandPreviewSectionProps {
  styleguide: BrandStyleguide;
  brandName?: string;
}

/**
 * W4 — de geëxtraheerde stijl live toegepast op één voorbeeldpagina,
 * gevuld met échte fixtureSamples. Extractiefouten (verkeerde primary,
 * verkeerde radius) zijn hier in één oogopslag zichtbaar; ontbreken de
 * tokens dan toont de generator een eerlijke floor card.
 */
export function BrandPreviewSection({ styleguide, brandName }: BrandPreviewSectionProps) {
  const { t } = useTranslation("brandstyle");

  const html = useMemo(() => {
    const semantic = styleguide.semanticTokens as SemanticTokens | null;
    const tokens = semantic?.resolved
      ? { ...semantic.resolved, ...(semantic.overrides ?? {}) }
      : null;
    return renderUiKitHtml({
      brandName: brandName ?? "Brand",
      tokens,
      primaryFontName: styleguide.primaryFontName,
      fixtures: (styleguide.fixtureSamples as SpecimenFixtures | null) ?? null,
    });
  }, [styleguide.semanticTokens, styleguide.primaryFontName, styleguide.fixtureSamples, brandName]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <MonitorSmartphone className="w-4 h-4 text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900">{t("preview.title")}</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">{t("preview.subtitle")}</p>
      <iframe
        title={t("preview.title")}
        srcDoc={html}
        sandbox=""
        className="w-full border border-gray-200 rounded-xl bg-white"
        style={{ height: "70vh" }}
      />
    </div>
  );
}
