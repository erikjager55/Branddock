"use client";

import { CheckCircle, X } from "lucide-react";
import { Card } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { EditableStringList } from "./EditableStringList";
import { useUpdateSection } from "../hooks/useBrandstyleHooks";
import type { BrandStyleguide, LogoVariation } from "../types/brandstyle.types";

interface LogoSectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

export function LogoSection({ styleguide, canEdit }: LogoSectionProps) {
  const variations = (styleguide.logoVariations ?? []) as LogoVariation[];
  const updateLogo = useUpdateSection("logo");

  return (
    <div data-testid="logo-section" className="space-y-6">
      {/* Logo Variations */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Logo Variations</h3>
        <div className="grid grid-cols-3 gap-4">
          {variations.map((v, i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-lg p-6 flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-xs text-gray-400 uppercase">{v.type}</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{v.name}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Usage Guidelines */}
      <Card>
        <EditableStringList
          title="Usage Guidelines"
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

      {/* Don'ts */}
      <Card>
        <EditableStringList
          title="Don'ts"
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
