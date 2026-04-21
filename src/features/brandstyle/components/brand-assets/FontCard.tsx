"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, Upload, Type as TypeIcon, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/shared";
import type { StyleguideFontData, FontRole } from "../../types/brandstyle.types";
import { useDeleteFont } from "../../hooks/useBrandstyleHooks";
import { findFontSubstitute, buildSubstituteCssUrl } from "@/lib/brandstyle/font-substitutes";

interface FontCardProps {
  font: StyleguideFontData;
  canEdit: boolean;
  onUploadClick: (presetName: string, presetRole: FontRole) => void;
  /** Workspace-level Adobe Fonts kit. Takes priority over the per-font
   *  scraper-detected kit because that one is the source site's kit
   *  (domain-locked to their origin) while this one is the user's own. */
  workspaceKitId?: string | null;
}

const ROLE_LABEL: Record<FontRole, string> = {
  DISPLAY: "Display type",
  UI: "UI type",
  EYEBROW_META: "Eyebrow & meta",
  BODY: "Body",
};

/** Track which Typekit kit CSS we've injected in <head> so we don't
 *  duplicate <link> tags when multiple FontCards render the same kit. */
const injectedKits = new Set<string>();
const injectedSubstitutes = new Set<string>();

function injectTypekitCss(kitId: string | null | undefined): void {
  if (typeof document === "undefined") return;
  if (!kitId) return;
  if (injectedKits.has(kitId)) return;
  injectedKits.add(kitId);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://use.typekit.net/${kitId}.css`;
  link.dataset.brandstyleTypekit = kitId;
  document.head.appendChild(link);
}

function injectSubstituteCss(family: string): void {
  if (typeof document === "undefined") return;
  if (injectedSubstitutes.has(family)) return;
  injectedSubstitutes.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = buildSubstituteCssUrl(family);
  link.dataset.brandstyleSubstitute = family;
  document.head.appendChild(link);
}

export function FontCard({ font, canEdit, onUploadClick, workspaceKitId }: FontCardProps) {
  const [imgError, setImgError] = useState(false);
  const deleteFontMut = useDeleteFont();

  const isUploaded = font.source === "UPLOADED" && !!font.fileUrl;
  const isGoogleFonts = font.availability === "GOOGLE_FONTS" && !isUploaded;
  const isAdobeFonts = font.availability === "ADOBE_FONTS" && !isUploaded;
  // Prefer the workspace kit — that's the user's own Adobe subscription
  // and actually serves fonts here. Per-font kit is the source site's
  // and is domain-locked away.
  const effectiveKitId = workspaceKitId?.trim() || null;
  const hasWorkspaceKit = isAdobeFonts && !!effectiveKitId;
  const detectedKitId = font.adobeFontsKitId ?? null;

  // Metric-compatible Google Fonts substitute used when the brand font
  // can't be rendered directly (no upload, not on Google Fonts, no
  // workspace Adobe kit). Lets us ALWAYS show a visually-plausible
  // preview instead of a grayed "No preview" placeholder.
  const substitute = !isUploaded && !isGoogleFonts && !hasWorkspaceKit
    ? findFontSubstitute(font.name)
    : null;

  const canPreview =
    isUploaded || isGoogleFonts || hasWorkspaceKit || !!substitute;
  const missing = !canPreview;

  useEffect(() => {
    if (hasWorkspaceKit && effectiveKitId) injectTypekitCss(effectiveKitId);
  }, [hasWorkspaceKit, effectiveKitId]);

  useEffect(() => {
    if (substitute) injectSubstituteCss(substitute.googleFont);
  }, [substitute]);

  const fontFamily = font.fontFamily ?? font.name;
  // Font-family stack: real brand name first (loads from upload or
  // Typekit when available), substitute next, then system fallback.
  const previewStyle = canPreview
    ? ({
        fontFamily: [
          `"${fontFamily}"`,
          substitute ? `"${substitute.googleFont}"` : null,
          "system-ui",
          "-apple-system",
          "sans-serif",
        ]
          .filter(Boolean)
          .join(", "),
      } as const)
    : undefined;

  const handleReplace = () => onUploadClick(font.name, font.role);
  const handleDelete = () => {
    if (!canEdit) return;
    const confirmed = window.confirm(`Delete "${font.name}"? This cannot be undone.`);
    if (confirmed) deleteFontMut.mutate(font.id);
  };

  const borderClass = isAdobeFonts
    ? "border-indigo-200 bg-indigo-50/30"
    : missing
      ? "border-amber-300 bg-amber-50/40"
      : "border-gray-200 bg-white";

  return (
    <div
      className={`relative border rounded-lg p-4 ${borderClass}`}
      data-testid={`font-card-${font.id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">
            {ROLE_LABEL[font.role]}
          </p>
          <p className="text-sm font-semibold text-gray-900 truncate">{font.name}</p>
          {font.weight && (
            <p className="text-xs text-gray-500 mt-0.5">Weight: {font.weight}</p>
          )}
        </div>
        {isUploaded ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            Uploaded
          </span>
        ) : isGoogleFonts ? (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full"
            title="Auto-loaded from the Google Fonts CDN — no upload needed"
          >
            Google Fonts
          </span>
        ) : isAdobeFonts ? (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full"
            title={
              hasWorkspaceKit
                ? `Served via your Adobe Fonts kit (${effectiveKitId}) — preview uses the real file`
                : "Served via Adobe Fonts on the source site — set a workspace kit for live preview"
            }
          >
            <Sparkles className="h-3 w-3" />
            Adobe Fonts
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
            <AlertTriangle className="h-3 w-3" />
            {font.availability === "COMMERCIAL" ? "Commercial — upload" : "Missing file"}
          </span>
        )}
      </div>

      {/* Preview */}
      <div className="h-20 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-md overflow-hidden">
        {missing ? (
          <div className="flex flex-col items-center gap-1 text-amber-500">
            <TypeIcon className="h-5 w-5" />
            <span className="text-xs">No preview available</span>
          </div>
        ) : imgError ? (
          <span className="text-xs text-gray-400">Preview failed</span>
        ) : (
          <span
            className="text-3xl text-gray-900"
            style={previewStyle}
            onAnimationEnd={() => setImgError(false)}
          >
            Aa Bb 123
          </span>
        )}
      </div>

      {/* Substitute callout — shown when the real font can't render
          (no upload, not on Google Fonts, no workspace Adobe kit) and
          we're rendering a metric-compatible Google Font stand-in. */}
      {substitute && !hasWorkspaceKit && (
        <p className="mt-2 text-[11px] text-gray-500 leading-snug">
          Previewing with <span className="font-medium text-gray-700">{substitute.googleFont}</span> —
          a metric substitute. {substitute.note} Upload the .woff2 or set a workspace Adobe Fonts kit for the real font.
        </p>
      )}

      {/* Per-font status: show what's serving (or would serve) this font.
          Kit ID management is workspace-level — see the banner above the
          Fonts section. */}
      {isAdobeFonts && (
        <div className="mt-3 text-[11px] leading-snug">
          {hasWorkspaceKit ? (
            <p className="text-emerald-700">
              <Check className="inline h-3 w-3 mr-0.5" />
              Live preview via your Adobe Fonts kit <code className="font-mono">{effectiveKitId}</code>.
            </p>
          ) : detectedKitId ? (
            <p className="text-indigo-600">
              Source site uses kit <code className="font-mono">{detectedKitId}</code> — domain-locked, so it won&apos;t serve the real font here. Set your own kit in the banner above.
            </p>
          ) : (
            <p className="text-indigo-600">
              Served via Adobe Fonts on the source site. Set a workspace kit with {font.name} for a live preview.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {canEdit && (
        <div className="flex items-center justify-end gap-2 mt-3">
          <Button
            variant="secondary"
            size="sm"
            icon={Upload}
            onClick={handleReplace}
            disabled={deleteFontMut.isPending}
          >
            {missing ? "Upload" : "Replace"}
          </Button>
          {!missing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteFontMut.isPending}
              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
              aria-label="Delete font"
              title="Delete font"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
