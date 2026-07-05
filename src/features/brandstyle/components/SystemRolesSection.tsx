"use client";

// DEPRECATED (verbeterplan Fase E, 2026-06-05): niet langer gerenderd in
// ColorsSection — toonde hetzelfde palet als "Color System" (user-feedback:
// één overzicht). Bewaard voor de onderliggende semantische-token-data;
// verwijder bij de volgende opruimronde als niets het meer importeert.

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Info, Pencil, Sparkles } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStyleguide } from "../api/brandstyle.api";
import { brandstyleKeys } from "../hooks/useBrandstyleHooks";
import {
  parseSemanticTokens,
  effectiveColors,
  COLOR_ROLE_ORDER,
  COLOR_ROLE_DESCRIPTIONS,
  type SemanticColorRole,
  type SemanticTokens,
} from "../utils/semantic-tokens";
import { SystemRoleRow } from "./SystemRoleRow";
import { SystemRoleOverrideModal } from "./SystemRoleOverrideModal";
import { ReviewDraftPanel } from "./review/ReviewDraftPanel";
import type { BrandStyleguide } from "../types/brandstyle.types";

interface SystemRolesSectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

export function SystemRolesSection({ styleguide, canEdit }: SystemRolesSectionProps) {
  const { t } = useTranslation("brandstyle-review");
  const tokens = useMemo(
    () => parseSemanticTokens(styleguide.semanticTokens),
    [styleguide.semanticTokens],
  );
  const [editingRole, setEditingRole] = useState<SemanticColorRole | null>(null);
  const queryClient = useQueryClient();

  const updateMut = useMutation({
    mutationFn: async (role: SemanticColorRole | null) =>
      role === null
        ? updateStyleguide({
            semanticTokens: {
              overrides: { ...(tokens?.overrides ?? {}), colors: clearColor(tokens, null) },
            },
          } as unknown as Partial<BrandStyleguide>)
        : Promise.resolve({ styleguide: styleguide }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
  });

  if (!tokens) {
    return (
      <Card className="mb-6 border-dashed border-gray-300 bg-gray-50">
        <div className="p-5 flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-900">{t("systemRoles.empty.title")}</p>
            <p>{t("systemRoles.empty.body")}</p>
          </div>
        </div>
      </Card>
    );
  }

  const colors = effectiveColors(tokens);
  const warnings = tokens.diagnostics.wcagWarnings ?? [];
  const unresolved = tokens.diagnostics.unresolvedRoles ?? [];
  const overridesCount = Object.keys(tokens.overrides?.colors ?? {}).length;

  return (
    <>
      <Card className="mb-6">
        <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t("systemRoles.header.title")}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t("systemRoles.header.subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-gray-500 shrink-0">
            {overridesCount > 0 && (
              <span className="inline-flex items-center gap-1 text-teal-700">
                <Pencil className="w-3 h-3" /> {t("systemRoles.override", { count: overridesCount })}
              </span>
            )}
            {warnings.length > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <AlertTriangle className="w-3 h-3" /> {t("systemRoles.wcagWarning", { count: warnings.length })}
              </span>
            )}
            {warnings.length === 0 && unresolved.length === 0 && overridesCount === 0 && (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> {t("systemRoles.allResolved")}
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {COLOR_ROLE_ORDER.map((role) => {
            const hex = colors[role];
            const source = tokens.diagnostics.source[role];
            const isOverride = Boolean(tokens.overrides?.colors?.[role]);
            const warning = warnings.find((w) => w.role === role);
            if (!hex && !warning) return null;
            return (
              <SystemRoleRow
                key={role}
                role={role}
                hex={hex}
                source={source}
                description={COLOR_ROLE_DESCRIPTIONS[role]}
                isOverride={isOverride}
                wcagWarning={warning}
                canEdit={canEdit}
                onEdit={() => setEditingRole(role)}
              />
            );
          })}
        </div>

        {unresolved.length > 0 && (
          <div className="p-4 border-t border-amber-200 bg-amber-50 text-xs text-amber-900">
            <span className="font-medium">{t("systemRoles.unresolvedLabel")}</span> {unresolved.join(', ')}. {t("systemRoles.unresolvedBody")}
          </div>
        )}

        {canEdit && overridesCount > 0 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">
              {t("systemRoles.overridesPersistNote")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateMut.mutate(null)}
              disabled={updateMut.isPending}
            >
              {t("systemRoles.clearAll")}
            </Button>
          </div>
        )}

        <div className="p-4 border-t border-gray-100">
          <ReviewDraftPanel
            section="system-roles"
            reviews={styleguide.reviews ?? []}
            canEdit={canEdit}
            label={t("systemRoles.reviewLabel")}
          />
        </div>
      </Card>

      {editingRole && (
        <SystemRoleOverrideModal
          role={editingRole}
          currentHex={colors[editingRole]}
          resolvedHex={tokens.resolved.colors[editingRole]}
          tokens={tokens}
          onClose={() => setEditingRole(null)}
        />
      )}
    </>
  );
}

function clearColor(
  _tokens: SemanticTokens | null,
  _role: SemanticColorRole | null,
): Record<string, string> {
  // Clear-all: een empty object wipet alle color-overrides. De merge-logica
  // in de PATCH route vervangt `overrides.colors` door deze fresh map.
  return {};
}
