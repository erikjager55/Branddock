"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Check, ExternalLink } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { brandstyleKeys } from "../../hooks/useBrandstyleHooks";

interface WorkspaceAdobeKitBannerProps {
  /** Currently-saved workspace kit id, shown on mount so the input
   *  pre-fills. Passed from the styleguide query so we don't need a
   *  second fetch (the GET response carries it). */
  kitId: string | null;
  canEdit: boolean;
}

async function fetchAdobeKit(): Promise<{ adobeFontsKitId: string | null }> {
  const res = await fetch("/api/brandstyle/adobe-kit");
  if (!res.ok) throw new Error("Failed to load workspace kit");
  return res.json();
}

async function updateAdobeKit(
  kitId: string | null,
): Promise<{ adobeFontsKitId: string | null }> {
  const res = await fetch("/api/brandstyle/adobe-kit", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adobeFontsKitId: kitId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update kit" }));
    throw new Error(
      typeof err.error === "string" ? err.error : "Failed to update kit",
    );
  }
  return res.json();
}

/**
 * Workspace-level Adobe Fonts kit editor. Lives above the Fonts list in
 * the Brand Assets tab. Shown only when at least one detected font is
 * served via Adobe Fonts — rendering it otherwise would be noise.
 */
export function WorkspaceAdobeKitBanner({ kitId, canEdit }: WorkspaceAdobeKitBannerProps) {
  const { t } = useTranslation("brandstyle");
  const qc = useQueryClient();
  // Keep a local query so the banner can auto-refresh from the server
  // even when the parent styleguide query hasn't been refetched yet
  // (useful right after mutation succeeds).
  const { data } = useQuery({
    queryKey: ["brandstyle", "adobeKit"],
    queryFn: fetchAdobeKit,
    initialData: { adobeFontsKitId: kitId },
  });
  const effective = data?.adobeFontsKitId ?? kitId ?? null;
  const [editing, setEditing] = useState(effective == null);
  const [draft, setDraft] = useState(effective ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(effective ?? "");
    if (effective) setEditing(false);
  }, [effective]);

  const mutation = useMutation({
    mutationFn: (nextKit: string | null) => updateAdobeKit(nextKit),
    onSuccess: (result) => {
      setEditing(false);
      setLocalError(null);
      qc.setQueryData(["brandstyle", "adobeKit"], result);
      // Invalidate styleguide so FontCards re-render with the new kit.
      qc.invalidateQueries({ queryKey: brandstyleKeys.styleguide() });
    },
    onError: (err) =>
      setLocalError(err instanceof Error ? err.message : t("adobeKit.saveFailed")),
  });

  const handleSave = () => {
    const trimmed = draft.trim();
    mutation.mutate(trimmed.length > 0 ? trimmed : null);
  };

  const handleClear = () => {
    if (!window.confirm(t("adobeKit.confirmRemove"))) return;
    setDraft("");
    mutation.mutate(null);
  };

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-1.5 rounded-md bg-indigo-100 text-indigo-700">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-indigo-900">
            {t("adobeKit.title")}
          </p>
          <p className="text-xs text-indigo-700 mt-0.5 leading-snug">
            {t("adobeKit.body")}
          </p>

          {editing && canEdit ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("adobeKit.placeholder")}
                maxLength={32}
                className="flex-1 min-w-[160px] border border-indigo-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={mutation.isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                {t("actions.save")}
              </button>
              {effective && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(effective);
                    setEditing(false);
                    setLocalError(null);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {t("actions.cancel")}
                </button>
              )}
              <a
                href="https://fonts.adobe.com/my_fonts#web_projects"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900"
              >
                {t("adobeKit.findKit")}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {effective ? (
                <>
                  <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {t("adobeKit.activeLabel")} <code className="font-mono text-[11px] bg-white/70 border border-emerald-200 rounded px-1 py-0.5">{effective}</code>
                  </span>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="text-xs text-indigo-700 underline hover:text-indigo-900"
                      >
                        {t("adobeKit.replace")}
                      </button>
                      <button
                        type="button"
                        onClick={handleClear}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        {t("adobeKit.remove")}
                      </button>
                    </>
                  )}
                </>
              ) : (
                canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-xs font-medium text-indigo-700 underline hover:text-indigo-900"
                  >
                    {t("adobeKit.setKit")}
                  </button>
                )
              )}
            </div>
          )}

          {localError && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {localError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
