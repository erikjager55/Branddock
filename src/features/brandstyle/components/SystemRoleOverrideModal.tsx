"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, Button } from "@/components/shared";
import { updateStyleguide } from "../api/brandstyle.api";
import { brandstyleKeys } from "../hooks/useBrandstyleHooks";
import { contrastRatio } from "../utils/color-utils";
import {
  COLOR_ROLE_DESCRIPTIONS,
  type SemanticColorRole,
  type SemanticTokens,
} from "../utils/semantic-tokens";
import type { BrandStyleguide } from "../types/brandstyle.types";

interface Props {
  role: SemanticColorRole;
  currentHex: string | undefined;
  resolvedHex: string | undefined;
  tokens: SemanticTokens;
  onClose: () => void;
}

export function SystemRoleOverrideModal({
  role,
  currentHex,
  resolvedHex,
  tokens,
  onClose,
}: Props) {
  const { t } = useTranslation("brandstyle-review");
  const [value, setValue] = useState(currentHex ?? resolvedHex ?? '#000000');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mut = useMutation({
    mutationFn: async (nextOverrides: Record<string, string>) =>
      updateStyleguide({
        semanticTokens: {
          overrides: {
            ...(tokens.overrides ?? {}),
            colors: nextOverrides,
          },
        },
      } as unknown as Partial<BrandStyleguide>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : t("systemRoles.modal.errorSaveFailed")),
  });

  const handleSave = () => {
    const hex = normalizeHex(value);
    if (!hex) {
      setError(t("systemRoles.modal.errorInvalidHex"));
      return;
    }
    const nextColors: Record<string, string> = {
      ...(tokens.overrides?.colors ?? {}),
      [role]: hex,
    };
    mut.mutate(nextColors);
  };

  const handleRevert = () => {
    const nextColors: Record<string, string> = { ...(tokens.overrides?.colors ?? {}) };
    delete nextColors[role];
    mut.mutate(nextColors);
  };

  const isOverride = Boolean(tokens.overrides?.colors?.[role]);

  const previewHex = normalizeHex(value) ?? value;
  const surface = tokens.resolved.colors.surface ?? '#FFFFFF';
  const onSurface = tokens.resolved.colors['on-surface'] ?? '#000000';

  return (
    <Modal isOpen={true} onClose={onClose} title={t("systemRoles.modal.title", { role })} size="md">
      <div className="space-y-5">
        <p className="text-sm text-gray-600">{COLOR_ROLE_DESCRIPTIONS[role]}</p>

        <div className="grid grid-cols-[auto_1fr] gap-3 items-center">
          <div
            className="w-16 h-16 rounded-md border border-gray-200"
            style={{ backgroundColor: previewHex }}
          />
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">{t("systemRoles.modal.hexLabel")}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={previewHex}
                onChange={(e) => setValue(e.target.value)}
                className="h-10 w-14 rounded border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="#0D9488"
                className="flex-1 rounded border border-gray-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded border border-gray-100 p-3 space-y-2">
          <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">{t("systemRoles.modal.contrastPreview")}</p>
          <div
            className="rounded px-3 py-2 text-sm"
            style={{ backgroundColor: previewHex, color: pickForeground(previewHex) }}
          >
            {t("systemRoles.modal.sampleOn", { role })}
          </div>
          <div
            className="rounded px-3 py-2 text-sm border"
            style={{ backgroundColor: surface, color: previewHex, borderColor: previewHex }}
          >
            {t("systemRoles.modal.sampleUsing", { role })}
          </div>
          {isContrastPair(role) && (
            <ContrastBadge
              bg={resolveContrastBg(role, tokens)}
              fg={previewHex}
            />
          )}
          {role === 'on-surface' && (
            <ContrastBadge bg={surface} fg={previewHex} />
          )}
          {role === 'surface' && (
            <ContrastBadge bg={previewHex} fg={onSurface} />
          )}
        </div>

        {resolvedHex && resolvedHex !== currentHex && (
          <div className="text-xs text-gray-500">
            {t("systemRoles.modal.resolverSuggested")} <span className="font-mono">{resolvedHex}</span>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-between gap-3 pt-2">
          {isOverride ? (
            <Button variant="ghost" onClick={handleRevert} disabled={mut.isPending}>
              {t("systemRoles.modal.revert")}
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={mut.isPending}>
              {t("systemRoles.modal.cancel")}
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={mut.isPending}>
              {mut.isPending ? t("systemRoles.modal.saving") : t("systemRoles.modal.save")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Helpers ──────────────────────────────────────────

function normalizeHex(raw: string): string | null {
  const v = raw.trim().toUpperCase();
  if (/^#[0-9A-F]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  if (/^#[0-9A-F]{6}$/.test(v)) return v;
  return null;
}

function pickForeground(bgHex: string): string {
  return contrastRatio(bgHex, '#FFFFFF') >= contrastRatio(bgHex, '#000000')
    ? '#FFFFFF'
    : '#000000';
}

function isContrastPair(role: SemanticColorRole): boolean {
  return ['on-primary', 'on-secondary', 'on-tertiary', 'on-error'].includes(role);
}

function resolveContrastBg(
  role: SemanticColorRole,
  tokens: SemanticTokens,
): string {
  const map: Partial<Record<SemanticColorRole, SemanticColorRole>> = {
    'on-primary': 'primary',
    'on-secondary': 'secondary',
    'on-tertiary': 'tertiary',
    'on-error': 'error',
  };
  const bgRole = map[role];
  return bgRole ? tokens.resolved.colors[bgRole] ?? '#FFFFFF' : '#FFFFFF';
}

function ContrastBadge({ bg, fg }: { bg: string; fg: string }) {
  const { t } = useTranslation("brandstyle-review");
  const ratio = contrastRatio(bg, fg);
  const pass = ratio >= 4.5;
  return (
    <p className={`text-xs font-medium ${pass ? 'text-emerald-700' : 'text-amber-700'}`}>
      {t("systemRoles.modal.contrastBadge", {
        ratio: ratio.toFixed(2),
        verdict: pass ? t("systemRoles.modal.contrastPass") : t("systemRoles.modal.contrastFail"),
      })}
    </p>
  );
}
