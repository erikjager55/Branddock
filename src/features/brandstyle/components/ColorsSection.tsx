"use client";

import { useState } from "react";
import { X, Pencil, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { ReviewDraftPanel } from "./review/ReviewDraftPanel";
import { EditableStringList } from "./EditableStringList";
import { SystemRolesSection } from "./SystemRolesSection";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";
import { useUpdateSection, useAddColor, useDeleteColor } from "../hooks/useBrandstyleHooks";
import { contrastRatio } from "../utils/color-utils";
import type { BrandStyleguide, StyleguideColor } from "../types/brandstyle.types";

const CATEGORY_OPTIONS: StyleguideColor["category"][] = ["PRIMARY", "SECONDARY", "ACCENT", "NEUTRAL", "SEMANTIC"];

const CATEGORY_DESCRIPTIONS: Record<StyleguideColor["category"], string> = {
  PRIMARY: "The dominant brand color — used to signal the brand at a glance",
  SECONDARY: "Supporting brand colors — pair with primary for variety and depth",
  ACCENT: "High-contrast highlights — calls-to-action, badges, attention",
  NEUTRAL: "Text, surfaces, structure — the connective tissue of the system",
  SEMANTIC: "Status feedback — info, success, warning, danger",
};

const CATEGORY_ORDER: StyleguideColor["category"][] = ["PRIMARY", "SECONDARY", "ACCENT", "NEUTRAL", "SEMANTIC"];

interface ColorsSectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

// ─── Helpers ──────────────────────────────────────────

/** Derive a brand name from the styleguide source URL hostname.
 *  e.g. "https://linfi.nl/over-ons" → "Linfi"
 *       "https://www.acme-corp.com" → "Acme Corp" */
function deriveBrandName(sourceUrl: string | null | undefined): string {
  if (!sourceUrl) return "Your Brand";
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
    const root = host.split(".")[0] || host;
    return root
      .split(/[-_]/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
  } catch {
    return "Your Brand";
  }
}

/** Pick a readable foreground (white or black) for a given background hex. */
function readableForeground(hex: string): "#FFFFFF" | "#000000" {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#000000";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  // Relative luminance — use threshold 0.5
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#000000" : "#FFFFFF";
}

/** WCAG result for a given contrast ratio. */
function wcagLabel(ratio: number | null): { label: string; pass: boolean } {
  if (ratio == null) return { label: "—", pass: false };
  if (ratio >= 7) return { label: "AAA", pass: true };
  if (ratio >= 4.5) return { label: "AA", pass: true };
  if (ratio >= 3) return { label: "AA Large", pass: true };
  return { label: "Fail", pass: false };
}

/** Inline collapsible — used to demote non-critical color blocks (In
 *  Context mockup, Don'ts) so the review flow isn't buried in noise. */
function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && <div className="mt-5">{children}</div>}
    </Card>
  );
}

// ─── Sub-components ──────────────────────────────────

/** Confidence pill — color-coded high/medium/low. */
function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return null;
  const config = {
    high: { bg: "#DCFCE7", fg: "#166534", label: "high" },
    medium: { bg: "#FEF3C7", fg: "#92400E", label: "medium" },
    low: { bg: "#F3F4F6", fg: "#6B7280", label: "low" },
  }[confidence] ?? { bg: "#F3F4F6", fg: "#6B7280", label: confidence };
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
      style={{ backgroundColor: config.bg, color: config.fg }}
    >
      {config.label}
    </span>
  );
}

/** Detector source badge — shows which scraper path found the color. */
function DetectorBadge({ source }: { source: string | null }) {
  if (!source) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-500 bg-gray-100">
      {source}
    </span>
  );
}

/** Hero block for one PRIMARY color — slimmed to name + HEX + a single
 *  WCAG summary. Clicking the swatch opens the detail modal where RGB/
 *  HSL/CMYK/full WCAG grid live. */
function HeroColorBlock({ color, onOpen }: { color: StyleguideColor; onOpen: () => void }) {
  // Recompute contrast from the hex itself — the stored `contrastWhite` /
  // `contrastBlack` fields are WCAG labels ("AAA", "Fail") and don't carry
  // the numeric ratio, so parsing them for a toFixed render was yielding
  // "—". Pure client-side math from the hex is deterministic.
  const cwRatio = contrastRatio(color.hex, "#FFFFFF");
  const cbRatio = contrastRatio(color.hex, "#000000");
  const bestBg = cwRatio >= cbRatio ? { on: "white", ratio: cwRatio } : { on: "black", ratio: cbRatio };
  const bestWcag = wcagLabel(bestBg.ratio);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-lg border border-gray-200 overflow-hidden flex flex-col text-left hover:ring-2 hover:ring-primary/40 transition-all"
    >
      {/* Big color block with name reversed on top */}
      <div
        className="px-6 py-10 flex flex-col justify-end min-h-[160px]"
        style={{ backgroundColor: color.hex, color: readableForeground(color.hex) }}
      >
        <p className="text-[10px] font-semibold tracking-wider uppercase opacity-75">
          {color.category}
        </p>
        <p className="mt-1 text-2xl font-semibold">{color.name}</p>
      </div>

      {/* Compact summary — just the essentials. Full tech data lives in the
          detail modal on click. */}
      <div className="p-4 bg-white flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-mono text-xs text-gray-700">{color.hex}</span>
          <DetectorBadge source={color.detectorSource} />
          <ConfidenceBadge confidence={color.confidence} />
        </div>
        <div
          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
            bestWcag.pass
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
          title={`Contrast on ${bestBg.on}: ${bestBg.ratio.toFixed(2)}:1`}
        >
          {bestWcag.label} on {bestBg.on}
        </div>
      </div>
    </button>
  );
}

/** Compact row for the Color System list. */
function SystemColorRow({
  color,
  isEditing,
  onOpen,
  onDelete,
}: {
  color: StyleguideColor;
  isEditing: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-4 py-3 first:pt-0 last:pb-0">
      <button
        type="button"
        onClick={() => !isEditing && onOpen()}
        disabled={isEditing}
        className="flex-shrink-0 w-12 h-12 rounded-md border border-gray-200 hover:ring-2 hover:ring-primary/40 transition-all"
        style={{ backgroundColor: color.hex }}
        aria-label={`View ${color.name}`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 truncate">{color.name}</span>
          <span className="font-mono text-xs text-gray-500">{color.hex}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <DetectorBadge source={color.detectorSource} />
          <ConfidenceBadge confidence={color.confidence} />
        </div>
      </div>

      {isEditing && (
        <button
          type="button"
          onClick={onDelete}
          className="flex-shrink-0 p-1.5 rounded text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
          title="Remove color"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/** UI mock showing how the brand colors work together in a real composition. */
function InContextPreview({
  brandName,
  primaries,
  secondaries,
  neutrals,
}: {
  brandName: string;
  primaries: StyleguideColor[];
  secondaries: StyleguideColor[];
  neutrals: StyleguideColor[];
}) {
  const primary = primaries[0];
  const secondary = secondaries[0] ?? primaries[1] ?? null;
  // Pick the darkest neutral that passes WCAG AA against white. Computed
  // from hex for the same reason as above.
  const darkNeutral =
    neutrals.find((n) => contrastRatio(n.hex, "#FFFFFF") >= 4.5) ?? neutrals[0];
  const lightSurface = "#FFFFFF";

  if (!primary) {
    return (
      <p className="text-sm text-gray-400 italic">
        Define a PRIMARY color to see how the palette combines on a real page.
      </p>
    );
  }

  const primaryFg = readableForeground(primary.hex);
  const darkText = darkNeutral?.hex ?? "#0F172A";

  // Contrast facts for the bottom strip
  // Contrast facts — compute directly from hex so the render always has
  // a real ratio. The stored `contrastWhite`/`contrastBlack` fields are
  // WCAG labels ("AAA", "Fail"), not ratios, so parsing them for x.x:1
  // output previously produced dashes.
  const facts = [
    {
      label: "Body text on white",
      ratio: darkNeutral ? contrastRatio(darkNeutral.hex, "#FFFFFF") : null,
    },
    {
      label: `${primary.name} on white`,
      ratio: contrastRatio(primary.hex, "#FFFFFF"),
    },
    {
      label: `${primaryFg === "#FFFFFF" ? "White" : "Black"} on ${primary.name}`,
      ratio: contrastRatio(primary.hex, primaryFg),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Mock 1: light page with primary CTA */}
      <div
        className="rounded-md border border-gray-200 p-6"
        style={{ backgroundColor: lightSurface, color: darkText }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-2">{brandName}</p>
        <h2 className="text-2xl font-semibold leading-tight">
          A {brandName} headline on a clean surface.
        </h2>
        <p className="mt-3 max-w-xl text-sm opacity-75 leading-relaxed">
          Body copy renders against neutral structure — the brand color enters at moments of action.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium"
            style={{ backgroundColor: primary.hex, color: primaryFg }}
          >
            Primary action
          </span>
          {secondary && (
            <span
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium border"
              style={{
                backgroundColor: secondary.hex,
                color: readableForeground(secondary.hex),
                borderColor: secondary.hex,
              }}
            >
              Secondary
            </span>
          )}
          <span className="text-sm font-medium" style={{ color: primary.hex }}>
            Inline link →
          </span>
        </div>
      </div>

      {/* Mock 2: primary background block */}
      <div
        className="rounded-md p-6"
        style={{ backgroundColor: primary.hex, color: primaryFg }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider opacity-75 mb-2">{brandName}</p>
        <h3 className="text-xl font-semibold leading-tight">
          Reverse composition on the primary color.
        </h3>
        <p className="mt-2 max-w-xl text-sm opacity-90 leading-relaxed">
          Pair {primary.name.toLowerCase()} with high-contrast typography for hero moments and full-bleed sections.
        </p>
        <div className="mt-4">
          <span
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium"
            style={{ backgroundColor: lightSurface, color: darkText }}
          >
            Light CTA
          </span>
        </div>
      </div>

      {/* Contrast facts strip */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase mb-3">
          Contrast checks
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {facts.map((f, i) => {
            const w = wcagLabel(f.ratio);
            return (
              <li key={i} className="flex items-baseline gap-2">
                <span className="font-mono font-semibold text-gray-700 w-12">
                  {f.ratio?.toFixed(1) ?? "—"}
                </span>
                <span className="text-gray-500 flex-1">{f.label}</span>
                <span className={`font-semibold ${w.pass ? "text-emerald-600" : "text-red-500"}`}>
                  {w.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Inline form for adding a new color */
function AddColorForm({
  onAdd,
  onCancel,
  isAdding,
}: {
  onAdd: (data: { name: string; hex: string; category: StyleguideColor["category"] }) => void;
  onCancel: () => void;
  isAdding: boolean;
}) {
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#");
  const [category, setCategory] = useState<StyleguideColor["category"]>("PRIMARY");

  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(hex);

  const handleSubmit = () => {
    if (!name.trim() || !isValidHex) return;
    onAdd({ name: name.trim(), hex, category });
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ocean Blue"
            className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Hex</label>
          <div className="flex items-center gap-2">
            <input
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              placeholder="#2563EB"
              maxLength={7}
              className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <span
              className="w-8 h-8 rounded border border-gray-200 flex-shrink-0"
              style={{ backgroundColor: isValidHex ? hex : "transparent" }}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as StyleguideColor["category"])}
            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isAdding}>
            Add
          </Button>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────

export function ColorsSection({ styleguide, canEdit }: ColorsSectionProps) {
  const { openColorModal } = useBrandstyleStore();
  const updateColors = useUpdateSection("colors");
  const addColorMutation = useAddColor();
  const deleteColorMutation = useDeleteColor();

  const [isEditingColors, setIsEditingColors] = useState(false);
  const [showAddColorForm, setShowAddColorForm] = useState(false);

  const colorsByCategory = styleguide.colors.reduce(
    (acc, c) => {
      const cat = c.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(c);
      return acc;
    },
    {} as Record<StyleguideColor["category"], StyleguideColor[]>,
  );

  const primaries = colorsByCategory.PRIMARY ?? [];
  const secondaries = colorsByCategory.SECONDARY ?? [];
  const neutrals = colorsByCategory.NEUTRAL ?? [];
  const brandName = deriveBrandName(styleguide.sourceUrl);

  const handleAddColor = (data: { name: string; hex: string; category: StyleguideColor["category"] }) => {
    addColorMutation.mutate(data, { onSuccess: () => setShowAddColorForm(false) });
  };

  const handleDeleteColor = (colorId: string) => {
    deleteColorMutation.mutate(colorId);
  };

  const heroGridCols =
    primaries.length === 1
      ? "grid-cols-1"
      : primaries.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div data-testid="colors-section" className="space-y-8">
      {/* ── Block 0: System Roles (DESIGN.md export) ────── */}
      <SystemRolesSection styleguide={styleguide} canEdit={canEdit} />

      {/* ── Block 1: Hero Palette ───────────────────────── */}
      {primaries.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">Hero Palette</h3>
            <p className="text-xs text-gray-400">The colors that define the brand</p>
          </div>
          <div className={`grid ${heroGridCols} gap-6`}>
            {primaries.map((c) => (
              <HeroColorBlock key={c.id} color={c} onOpen={() => openColorModal(c.id)} />
            ))}
          </div>
        </Card>
      )}

      {/* ── Block 2: Color System ───────────────────────── */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-5">
          <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">Color System</h3>
          {canEdit && (
            <button
              onClick={() => setIsEditingColors((v) => !v)}
              className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
              title={isEditingColors ? "Done editing" : "Edit colors"}
            >
              {isEditingColors ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        <div className="space-y-8">
          {CATEGORY_ORDER.map((cat) => {
            const colors = colorsByCategory[cat];
            if (!colors?.length) return null;
            // Which inline review belongs to this color group, if any.
            // PRIMARY/SECONDARY/ACCENT are all "brand" — we anchor that
            // review on the LAST non-empty brand category so the thumbs
            // appear once directly under the colours the user is judging.
            const brandCats: StyleguideColor["category"][] = ["PRIMARY", "SECONDARY", "ACCENT"];
            const lastBrandCat = [...brandCats]
              .reverse()
              .find((c) => (colorsByCategory[c]?.length ?? 0) > 0);
            const showBrandReview = cat === lastBrandCat;
            const showNeutralReview = cat === "NEUTRAL";
            return (
              <div key={cat}>
                <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase mb-1">
                  {cat}
                </p>
                <p className="text-xs text-gray-400 mb-4">{CATEGORY_DESCRIPTIONS[cat]}</p>
                <div className="divide-y divide-gray-100">
                  {colors.map((color) => (
                    <SystemColorRow
                      key={color.id}
                      color={color}
                      isEditing={isEditingColors}
                      onOpen={() => openColorModal(color.id)}
                      onDelete={() => handleDeleteColor(color.id)}
                    />
                  ))}
                </div>
                {/* Inline review thumbs directly under the colours they
                    refer to — previously lived in a pair of mostly-empty
                    Card wrappers at the bottom of the page. */}
                {showBrandReview && (
                  <ReviewDraftPanel
                    section="colors-brand"
                    reviews={styleguide.reviews ?? []}
                    canEdit={canEdit}
                    label="Review brand colors"
                  />
                )}
                {showNeutralReview && (
                  <ReviewDraftPanel
                    section="colors-neutrals"
                    reviews={styleguide.reviews ?? []}
                    canEdit={canEdit}
                    label="Review neutrals"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Edit mode: add color */}
        {isEditingColors && (
          <div className="mt-4">
            {showAddColorForm ? (
              <AddColorForm
                onAdd={handleAddColor}
                onCancel={() => setShowAddColorForm(false)}
                isAdding={addColorMutation.isPending}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowAddColorForm(true)}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add color
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {canEdit && !isEditingColors && styleguide.colors.length === 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setIsEditingColors(true);
                setShowAddColorForm(true);
              }}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add colors manually
            </button>
          </div>
        )}
      </Card>

      {/* ── Block 3: In Context (collapsed) ──────────────── */}
      {primaries.length > 0 && (
        <CollapsibleCard
          title="In Context"
          subtitle={`How ${brandName}'s colors combine on a real page`}
        >
          <InContextPreview
            brandName={brandName}
            primaries={primaries}
            secondaries={secondaries}
            neutrals={neutrals}
          />
        </CollapsibleCard>
      )}

      {/* ── Block 4: Don'ts (collapsed) ──────────────────── */}
      <CollapsibleCard
        title="Don'ts"
        subtitle={
          styleguide.colorDonts.length > 0
            ? `${styleguide.colorDonts.length} rule${styleguide.colorDonts.length === 1 ? "" : "s"}`
            : undefined
        }
      >
        <EditableStringList
          title=""
          items={styleguide.colorDonts}
          canEdit={canEdit}
          isSaving={updateColors.isPending}
          placeholder="Add a color don't..."
          onSave={(items) => updateColors.mutate({ colorDonts: items })}
        >
          {(items) =>
            items.length > 0 ? (
              <div className="space-y-2">
                {items.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    {d}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No color don&apos;ts defined yet.</p>
            )
          }
        </EditableStringList>
      </CollapsibleCard>

      <SemanticTintsPanel styleguide={styleguide} canEdit={canEdit} />

      <AiContentBanner section="colors" savedForAi={styleguide.colorsSavedForAi} />
    </div>
  );
}

// ── Semantic Tints Panel (Fase 3) ──
interface SemanticTint {
  light?: string;
  base?: string;
  dark?: string;
}
interface SemanticColorsData {
  info?: SemanticTint;
  success?: SemanticTint;
  warning?: SemanticTint;
  danger?: SemanticTint;
}

const SEMANTIC_LABELS: Record<keyof SemanticColorsData, { label: string; description: string }> = {
  info: { label: "Info", description: "Informational notices, neutral messaging" },
  success: { label: "Success", description: "Confirmations, positive feedback" },
  warning: { label: "Warning", description: "Caution, attention required" },
  danger: { label: "Danger", description: "Errors, destructive actions" },
};

function SemanticTintsPanel({
  styleguide,
  canEdit,
}: {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}) {
  const semantic: SemanticColorsData =
    (styleguide as unknown as { semanticColors?: SemanticColorsData }).semanticColors ?? {};

  const hasAnyTint = Object.values(semantic).some(
    (t) => t && (t.light || t.base || t.dark),
  );

  // Also fall back to colors with SEMANTIC-like categories for legacy data.
  const legacySemanticColors = styleguide.colors.filter((c) =>
    ["SEMANTIC", "SUCCESS", "WARNING", "ERROR_COLOR"].includes(c.category as string),
  );

  if (!hasAnyTint && legacySemanticColors.length === 0) {
    return (
      <Card>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Semantic Tints</h3>
          <p className="text-xs text-gray-400 mt-1">
            Info / success / warning / danger tints — not yet detected. Analyze a site with
            status UI to populate, or add manually via Color System.
          </p>
        </div>
        <ReviewDraftPanel
          section="colors-semantic"
          reviews={styleguide.reviews ?? []}
          canEdit={canEdit}
          label="Review semantic tints"
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Semantic Tints</h3>
        <p className="text-xs text-gray-400 mt-1">Status colors for info, success, warning, and danger messaging</p>
      </div>

      {hasAnyTint && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(SEMANTIC_LABELS) as (keyof SemanticColorsData)[]).map((key) => {
            const tint = semantic[key];
            if (!tint || (!tint.light && !tint.base && !tint.dark)) return null;
            const meta = SEMANTIC_LABELS[key];
            return (
              <div key={key} className="border border-gray-100 rounded-md p-3">
                <p className="text-xs font-semibold text-gray-700">{meta.label}</p>
                <p className="text-[11px] text-gray-400 mb-2">{meta.description}</p>
                <div className="flex gap-1.5">
                  {(["light", "base", "dark"] as const).map((variant) =>
                    tint[variant] ? (
                      <div key={variant} className="flex-1 text-center">
                        <div
                          className="h-10 rounded border border-gray-200"
                          style={{ backgroundColor: tint[variant] }}
                          title={`${meta.label} ${variant}: ${tint[variant]}`}
                        />
                        <p className="text-[10px] text-gray-500 mt-1 font-mono">
                          {tint[variant]}
                        </p>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ReviewDraftPanel
        section="colors-semantic"
        reviews={styleguide.reviews ?? []}
        canEdit={canEdit}
        label="Review semantic tints"
      />
    </Card>
  );
}
