"use client";

import { useState } from "react";
import { X, Pencil, Plus } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { ReviewDraftPanel } from "./review/ReviewDraftPanel";
import { EditableStringList } from "./EditableStringList";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";
import { useUpdateSection, useAddColor, useDeleteColor } from "../hooks/useBrandstyleHooks";
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

/** Parse a contrast string like "4.7:1" or "4.7" into a numeric ratio. */
function parseContrast(str: string | null): number | null {
  if (!str) return null;
  const m = str.match(/([\d.]+)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** WCAG result for a given contrast ratio. */
function wcagLabel(ratio: number | null): { label: string; pass: boolean } {
  if (ratio == null) return { label: "—", pass: false };
  if (ratio >= 7) return { label: "AAA", pass: true };
  if (ratio >= 4.5) return { label: "AA", pass: true };
  if (ratio >= 3) return { label: "AA Large", pass: true };
  return { label: "Fail", pass: false };
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

/** Hero block for one PRIMARY color — big swatch + technical info + WCAG. */
function HeroColorBlock({ color }: { color: StyleguideColor }) {
  const cw = parseContrast(color.contrastWhite);
  const cb = parseContrast(color.contrastBlack);
  const wWhite = wcagLabel(cw);
  const wBlack = wcagLabel(cb);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden flex flex-col">
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

      {/* Technical strip */}
      <div className="p-5 space-y-4 bg-white">
        <div className="flex items-center gap-2 flex-wrap">
          <DetectorBadge source={color.detectorSource} />
          <ConfidenceBadge confidence={color.confidence} />
        </div>

        <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-gray-400 uppercase tracking-wider">Hex</dt>
          <dd className="font-mono text-gray-700">{color.hex}</dd>
          {color.rgb && (
            <>
              <dt className="text-gray-400 uppercase tracking-wider">RGB</dt>
              <dd className="font-mono text-gray-700">{color.rgb}</dd>
            </>
          )}
          {color.hsl && (
            <>
              <dt className="text-gray-400 uppercase tracking-wider">HSL</dt>
              <dd className="font-mono text-gray-700">{color.hsl}</dd>
            </>
          )}
          {color.cmyk && (
            <>
              <dt className="text-gray-400 uppercase tracking-wider">CMYK</dt>
              <dd className="font-mono text-gray-700">{color.cmyk}</dd>
            </>
          )}
        </dl>

        {/* WCAG contrast */}
        <div className="border-t border-gray-100 pt-3">
          <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase mb-2">
            WCAG Contrast
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border border-gray-200 bg-white flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-gray-700">{cw?.toFixed(1) ?? "—"}</div>
                <div className={`text-[10px] font-semibold ${wWhite.pass ? "text-emerald-600" : "text-red-500"}`}>
                  {wWhite.label}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border border-gray-200 flex-shrink-0" style={{ backgroundColor: "#000000" }} />
              <div className="min-w-0">
                <div className="font-mono text-gray-700">{cb?.toFixed(1) ?? "—"}</div>
                <div className={`text-[10px] font-semibold ${wBlack.pass ? "text-emerald-600" : "text-red-500"}`}>
                  {wBlack.label}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  const darkNeutral =
    neutrals.find((n) => {
      const c = parseContrast(n.contrastWhite);
      return c != null && c >= 4.5;
    }) ?? neutrals[0];
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
  const facts = [
    {
      label: `Body text on white`,
      ratio: parseContrast(darkNeutral?.contrastWhite ?? null),
    },
    {
      label: `${primary.name} on white`,
      ratio: parseContrast(primary.contrastWhite),
    },
    {
      label: `${primaryFg === "#FFFFFF" ? "White" : "Black"} on ${primary.name}`,
      ratio: primaryFg === "#FFFFFF" ? parseContrast(primary.contrastWhite) : parseContrast(primary.contrastBlack),
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
      {/* ── Block 1: Hero Palette ───────────────────────── */}
      {primaries.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">Hero Palette</h3>
            <p className="text-xs text-gray-400">The colors that define the brand</p>
          </div>
          <div className={`grid ${heroGridCols} gap-6`}>
            {primaries.map((c) => (
              <HeroColorBlock key={c.id} color={c} />
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

      {/* ── Block 3: In Context ─────────────────────────── */}
      {primaries.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">In Context</h3>
            <p className="text-xs text-gray-400">How {brandName}&apos;s colors combine on a real page</p>
          </div>
          <InContextPreview
            brandName={brandName}
            primaries={primaries}
            secondaries={secondaries}
            neutrals={neutrals}
          />
        </Card>
      )}

      {/* ── Block 4: Don'ts ─────────────────────────────── */}
      <Card>
        <EditableStringList
          title="Don'ts"
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
      </Card>

      <Card>
        <ReviewDraftPanel
          section="colors"
          reviews={styleguide.reviews ?? []}
          canEdit={canEdit}
          label="Review colors"
        />
      </Card>

      <AiContentBanner section="colors" savedForAi={styleguide.colorsSavedForAi} />
    </div>
  );
}
