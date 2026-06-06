"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Palette,
  Pencil,
  Save,
  X,
  Download,
  RefreshCw,
  FileText,
  Sparkles,
  Loader2,
  ChevronDown,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/shared";
import { LockShield, LockStatusPill } from "@/components/lock";
import type { BrandStyleguide } from "../types/brandstyle.types";
import { getApplicableReviewSections } from "@/lib/brandstyle/review-sections";
import { computeDataQuality } from "../utils/data-quality";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { exportBrandstylePdf } from "../utils/exportBrandstylePdf";
import { exportBrandKitPdf, type BrandKitPdfProgress } from "../utils/brand-kit/exportBrandKitPdf";
import { EXPORT_FORMATS, type ExportFormat } from "../utils/export-formats";
import { Code2 } from "lucide-react";

interface StyleguideHeaderProps {
  styleguide: BrandStyleguide;
  isEditing: boolean;
  isLocked: boolean;
  isTogglingLock: boolean;
  lockedBy: { id: string; name: string } | null;
  lockedAt: string | null;
  onEditToggle: (editing: boolean) => void;
  onLockToggle: () => void;
  onNewAnalysis: () => void;
  /** Opens the BrandOnboardingWizard modal for guided first-time review. */
  onOpenOnboardingWizard: () => void;
}

export function StyleguideHeader({
  styleguide,
  isEditing,
  isLocked,
  isTogglingLock,
  lockedBy,
  lockedAt,
  onEditToggle,
  onLockToggle,
  onNewAnalysis,
  onOpenOnboardingWizard,
}: StyleguideHeaderProps) {
  // Brand-kit export progress
  const [kitProgress, setKitProgress] = useState<BrandKitPdfProgress | null>(null);
  const [kitError, setKitError] = useState<string | null>(null);
  const isExportingKit = kitProgress !== null && kitProgress.stage !== "complete";

  const handleExportPdf = useCallback(() => {
    exportBrandstylePdf(styleguide);
  }, [styleguide]);

  const handleExportBrandKit = useCallback(async () => {
    setKitError(null);
    setKitProgress({ stage: "fetching", message: "Starting export…" });
    try {
      await exportBrandKitPdf((progress) => setKitProgress(progress));
      setTimeout(() => setKitProgress(null), 2000);
    } catch (error) {
      setKitError(error instanceof Error ? error.message : "Export failed");
      setKitProgress(null);
    }
  }, []);

  // Review progress summary for the metadata bar.
  // Gebruik getApplicableReviewSections (zelfde bron als ReviewSummaryHeader)
  // zodat header-counter "X/Y sections" en review-bar "X of Y sections
  // approved" dezelfde Y rapporteren. ACTIVE_REVIEW_SECTIONS is de raw
  // master-lijst (19) maar voor counter-display willen we de styleguide-
  // specifieke applicable-subset (15 bij LINFI — niet-relevante secties
  // zoals 'imagery-when-no-images' filteren we eruit).
  const progressSummary = useMemo(() => {
    const reviews = styleguide.reviews ?? [];
    const approved = new Set(
      reviews.filter((r) => r.status === "APPROVED").map((r) => r.section),
    );
    const applicable = getApplicableReviewSections(styleguide);
    const approvedCount = applicable.filter((s) => approved.has(s)).length;
    return { approved: approvedCount, total: applicable.length };
  }, [styleguide]);

  // V3 — data-quality: hoeveel curatabele kleuren/fonts onzeker (fallback/
  // preset/low-confidence) zijn. Maakt GIGO zichtbaar vóór de gebruiker erop
  // bouwt (napking-WordPress-placeholder → veel fallback).
  const dataQuality = useMemo(() => computeDataQuality(styleguide), [styleguide]);

  const updatedAt = new Date(styleguide.updatedAt);
  const lastAnalyzedLabel = isNaN(updatedAt.getTime())
    ? null
    : `Last analyzed ${relativeTime(updatedAt)}`;

  return (
    <div>
      {/* Canonical card-style header — matches AssetDetailHeader / PersonaDetailHeader pattern */}
      <div
        data-testid="styleguide-header"
        className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-start gap-6">
          {/* Icon — 96×96 (canonical) */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
              <Palette className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Title + status pills */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">Brand Styleguide</h1>
              <LockStatusPill
                isLocked={isLocked}
                lockedBy={lockedBy}
                lockedAt={lockedAt}
              />
              <PublishStatusPill published={styleguide.published ?? false} />
            </div>

            {/* Description (canonical: base + text-gray-500) */}
            <p className="text-base text-gray-500 mt-0.5">
              Your visual identity guidelines
            </p>

            {/* Metadata bar — styleguide-specific facts + review progress */}
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-gray-200 bg-gray-50">
                <span className="font-medium text-gray-700">
                  {progressSummary.approved}/{progressSummary.total}
                </span>
                <span className="text-gray-500">sections approved</span>
              </span>
              <DataQualityBadge
                uncertain={dataQuality.needsAttention.length}
                total={dataQuality.items.length}
              />
              {lastAnalyzedLabel && <span>{lastAnalyzedLabel}</span>}
              {styleguide.createdBy.name && (
                <span>Created by {styleguide.createdBy.name}</span>
              )}
              {styleguide.sourceUrl && (
                <a
                  href={styleguide.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate max-w-[240px]"
                >
                  {stripProtocol(styleguide.sourceUrl)}
                </a>
              )}
            </div>
          </div>

          {/* Actions — Edit + Export dropdown + overflow + LockShield (canonical) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={() => onEditToggle(false)}
                  style={{ backgroundColor: "#0d9488", color: "#ffffff" }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
                <button
                  onClick={() => onEditToggle(false)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                icon={Pencil}
                onClick={() => onEditToggle(true)}
                disabled={isLocked}
              >
                Edit
              </Button>
            )}

            {/* Wizard is read-only review + jump-to-tab — blijft beschikbaar
                wanneer styleguide locked is (geen mutations onder de motorkap). */}
            <Button
              variant="secondary"
              size="sm"
              icon={Sparkles}
              onClick={onOpenOnboardingWizard}
            >
              Onboarding
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={onNewAnalysis}
              disabled={isLocked}
            >
              New analysis
            </Button>

            <ExportMenu
              onExportPdf={handleExportPdf}
              onExportBrandKit={handleExportBrandKit}
              isExportingKit={isExportingKit}
              kitMessage={kitProgress?.message}
            />

            <LockShield
              isLocked={isLocked}
              isToggling={isTogglingLock}
              onClick={onLockToggle}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Brand-kit export feedback (below card, inline) */}
      {kitError && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          Brand kit export failed: {kitError}
        </p>
      )}
      {kitProgress?.stage === "complete" && (
        <p className="mt-2 text-xs text-emerald-700">
          Brand book PDF exported — check your Downloads folder.
        </p>
      )}
    </div>
  );
}

// ─── Data-quality badge (V3 governed-token-layer) ──────────

/**
 * Toont hoeveel curatabele kleuren/fonts onzeker zijn (scrape vond niets of
 * lage confidence). Groen schild = alles met vertrouwen gescraped; amber =
 * N waarden vragen om bevestiging in de wizard / tabs.
 */
function DataQualityBadge({ uncertain, total }: { uncertain: number; total: number }) {
  if (uncertain === 0) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700"
        title={`Alle ${total} kern-tokens zijn met vertrouwen uit de bron-site afgeleid.`}
      >
        <ShieldCheck className="h-3 w-3" />
        <span className="font-medium">Data-kwaliteit OK</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700"
      title={`${uncertain} van ${total} kern-tokens konden we niet zeker bepalen — bevestig ze in de Onboarding-wizard of de Kleuren/Typografie-tabs.`}
    >
      <ShieldAlert className="h-3 w-3" />
      <span className="font-medium">{uncertain}</span>
      <span>onzeker</span>
    </span>
  );
}

// ─── Published status pill ─────────────────────────────────

function PublishStatusPill({ published }: { published: boolean }) {
  if (published) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Published
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200">
      <Circle className="h-3 w-3" />
      Draft
    </span>
  );
}

// ─── Export dropdown ───────────────────────────────────────

interface ExportMenuProps {
  onExportPdf: () => void;
  onExportBrandKit: () => void;
  isExportingKit: boolean;
  kitMessage?: string;
}

function ExportMenu({ onExportPdf, onExportBrandKit, isExportingKit, kitMessage }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {isExportingKit ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {isExportingKit ? (kitMessage ?? "Exporting…") : "Export"}
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 w-80 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
          role="menu"
        >
          <button
            type="button"
            onClick={() => {
              onExportPdf();
              setOpen(false);
            }}
            className="w-full flex items-start gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            role="menuitem"
          >
            <FileText className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
            <div className="text-left min-w-0 flex-1">
              <div className="font-medium whitespace-nowrap">Styleguide PDF</div>
              <div className="text-[11px] text-gray-500">All sections in one document</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              onExportBrandKit();
              setOpen(false);
            }}
            disabled={isExportingKit}
            className="w-full flex items-start gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait"
            role="menuitem"
          >
            <Sparkles className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
            <div className="text-left min-w-0 flex-1">
              <div className="font-medium whitespace-nowrap">Brand kit for Claude Design</div>
              <div className="text-[11px] text-gray-500">
                ZIP with assets + tokens, ready to upload
              </div>
            </div>
          </button>

          {/* ── Design System exports (DESIGN.md / DTCG / Tailwind / ...) ── */}
          <div className="my-1 border-t border-gray-100" />
          <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-semibold text-gray-400">
            Design system
          </div>
          {EXPORT_FORMATS.map((format) => (
            <DesignSystemExportLink
              key={format.id}
              format={format}
              onSelect={() => setOpen(false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DesignSystemExportLink({
  format,
  onSelect,
}: {
  format: ExportFormat;
  onSelect: () => void;
}) {
  const disabled = format.status === 'soon';
  return (
    <a
      href={disabled ? undefined : format.endpoint}
      rel="noopener"
      onClick={disabled ? (e) => e.preventDefault() : onSelect}
      aria-disabled={disabled}
      className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-sm ${
        disabled
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
      role="menuitem"
    >
      <Code2 className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
      <div className="text-left min-w-0 flex-1">
        <div className="font-medium whitespace-nowrap flex items-center gap-1.5">
          {format.label}
          {disabled && (
            <span className="text-[9px] font-medium text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
              Soon
            </span>
          )}
        </div>
        <div className="text-[11px] text-gray-500 truncate">{format.description}</div>
      </div>
    </a>
  );
}

// ─── Helpers ───────────────────────────────────────────────

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "");
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "today";
  if (diff < 2 * day) return "yesterday";
  const days = Math.floor(diff / day);
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
