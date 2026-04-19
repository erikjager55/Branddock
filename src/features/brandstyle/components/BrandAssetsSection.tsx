"use client";

import { CheckCircle, X } from "lucide-react";
import { Card } from "@/components/shared";
import type { BrandStyleguide } from "../types/brandstyle.types";
import { useCustomFonts } from "../hooks/useCustomFonts";
import { useUpdateSection } from "../hooks/useBrandstyleHooks";
import { LogosGrid } from "./brand-assets/LogosGrid";
import { FontsGrid } from "./brand-assets/FontsGrid";
import { EditableStringList } from "./EditableStringList";
import { AiContentBanner } from "./AiContentBanner";
import { ReviewDraftPanel } from "./review/ReviewDraftPanel";

interface BrandAssetsSectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

export function BrandAssetsSection({ styleguide, canEdit }: BrandAssetsSectionProps) {
  // Inject @font-face for uploaded fonts so previews use real brand type.
  useCustomFonts(styleguide.fonts);

  const updateLogo = useUpdateSection("logo");
  const reviews = styleguide.reviews ?? [];

  return (
    <div data-testid="brand-assets-section" className="space-y-6">
      <LogosGrid
        logos={styleguide.logos ?? []}
        canEdit={canEdit}
        reviewSlot={
          <ReviewDraftPanel
            section="brand-assets-logos"
            reviews={reviews}
            canEdit={canEdit}
            label="Review logos"
          />
        }
      />
      <FontsGrid
        fonts={styleguide.fonts ?? []}
        canEdit={canEdit}
        reviewSlot={
          <ReviewDraftPanel
            section="brand-assets-fonts"
            reviews={reviews}
            canEdit={canEdit}
            label="Review fonts"
          />
        }
      />

      <Card>
        <EditableStringList
          title="Logo Usage Guidelines"
          items={styleguide.logoGuidelines}
          canEdit={canEdit}
          isSaving={updateLogo.isPending}
          placeholder="Add a guideline..."
          onSave={(items) => updateLogo.mutate({ logoGuidelines: items })}
        >
          {(items) =>
            items.length > 0 ? (
              <ul className="space-y-2">
                {items.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No usage guidelines yet.</p>
            )
          }
        </EditableStringList>
      </Card>

      <Card>
        <EditableStringList
          title="Logo Don'ts"
          items={styleguide.logoDonts}
          canEdit={canEdit}
          isSaving={updateLogo.isPending}
          placeholder="Add a don't..."
          onSave={(items) => updateLogo.mutate({ logoDonts: items })}
        >
          {(items) =>
            items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-600 p-3 bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    {d}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No don&apos;ts defined yet.</p>
            )
          }
        </EditableStringList>
      </Card>

      <AiContentBanner section="logo" savedForAi={styleguide.logoSavedForAi} />
    </div>
  );
}
