"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { useUpdateSection } from "../hooks/useBrandstyleHooks";
import type { BrandStyleguide, TypeScaleLevel } from "../types/brandstyle.types";

const LEVEL_PRESETS = ["H1", "H2", "H3", "H4", "H5", "H6", "Body", "Small", "Caption", "Overline"];

interface TypographySectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

/** Creates a blank type scale entry */
function createBlankLevel(): TypeScaleLevel {
  return { level: "", name: "", size: "", lineHeight: "", weight: "", color: "", usage: "" };
}

/**
 * Normalise a font name to PascalCase as expected by Google Fonts.
 * Google Fonts URLs are case-sensitive: `roboto` → 400, `Roboto` → 200.
 *   - "roboto"        → "Roboto"
 *   - "open sans"     → "Open Sans"
 *   - "PT Sans"       → "PT Sans"
 */
function normaliseFontName(font: string): string {
  return font
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      // Already all-uppercase short codes (PT, JF) — keep as-is
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Pick the right font family for a type-scale level.
 * Headings (H1-H6) are typically set in the brand's display/heading font,
 * which lives in `additionalFonts` (the secondary font in priority order).
 * Body/Small/Caption use the primary (body) font.
 *
 * Falls back to primary when no additional/heading font is detected.
 */
function getFontForLevel(
  level: string,
  primaryFont: string | null,
  additionalFonts: string[],
): string | undefined {
  const isHeading = /^h[1-6]$/i.test(level.trim());
  const headingFont = additionalFonts[0];
  const chosen = isHeading && headingFont ? headingFont : primaryFont;
  return chosen ? normaliseFontName(chosen) : undefined;
}

/**
 * Cap a CSS font-size value for type-scale previews so large/responsive
 * declarations (e.g. `clamp(2.5rem, 3.824vw + 1.276rem, 6.5rem)`) don't blow
 * up the row height. Resolves the incoming value to a concrete px number and
 * caps at PREVIEW_MAX_PX, instead of deferring to the browser's CSS engine
 * (wrapping in `min(clamp(...), 48px)` proved unreliable in practice).
 *
 * Handles simple values (`36px`, `2rem`), `clamp(min, preferred, max)` by
 * taking the min value, and `calc()` by grabbing the first numeric token.
 * Falls back to a safe default when the value is unresolvable.
 *
 * The Size column of the table still shows the original unmodified value —
 * this cap only affects the rendered preview span.
 */
const PREVIEW_MAX_PX = 48;
const PREVIEW_FALLBACK_PX = 24;

function capPreviewSize(rawSize: string): string {
  if (!rawSize) return `${PREVIEW_FALLBACK_PX}px`;

  // clamp(min, preferred, max) → use the min (first) arg for stable previews
  const clampMatch = rawSize.match(/clamp\(\s*([^,]+),/i);
  if (clampMatch) {
    const px = resolveToPx(clampMatch[1].trim());
    return `${Math.min(px ?? PREVIEW_FALLBACK_PX, PREVIEW_MAX_PX)}px`;
  }

  // calc() → first numeric+unit token
  const calcMatch = rawSize.match(/calc\(([^)]+)\)/i);
  if (calcMatch) {
    const firstToken = calcMatch[1].match(/[\d.]+(?:px|rem|em|pt|%)/i)?.[0];
    const px = firstToken ? resolveToPx(firstToken) : null;
    return `${Math.min(px ?? PREVIEW_FALLBACK_PX, PREVIEW_MAX_PX)}px`;
  }

  // Simple / var() / anything else → try to resolve, fallback if unparseable
  const px = resolveToPx(rawSize);
  if (px === null) return `${PREVIEW_FALLBACK_PX}px`;
  return `${Math.min(px, PREVIEW_MAX_PX)}px`;
}

/** Convert a simple CSS length (`36px`, `2rem`, `1.5em`, `16pt`) to px. */
function resolveToPx(value: string): number | null {
  const m = value.trim().match(/^([\d.]+)(px|rem|em|pt|%)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] || 'px').toLowerCase();
  switch (unit) {
    case 'px': return n;
    case 'rem':
    case 'em': return n * 16;
    case 'pt': return n * (96 / 72);
    case '%': return (n / 100) * 16;
    default: return null;
  }
}

/**
 * Build a "View font" link URL for a font name. Returns null for falsy input.
 * We can't verify the font is on Google Fonts without a HEAD request, so the
 * link may 404 for truly unknown fonts — that's acceptable (links are non-
 * critical; users can search themselves). For brand-name fonts (like "Sohne"
 * or "Anthropic Serif") the DB already has `primaryFontUrl` set by the AI.
 */
function googleFontsViewUrl(name: string | null | undefined): string | null {
  if (!name) return null;
  const normalised = normaliseFontName(name).replace(/\s+/g, '+');
  return `https://fonts.google.com/specimen/${normalised}`;
}

/**
 * Type Scale rendered as font-grouped sections.
 *
 * Headings (H1-H6) and body styles each carry their own brand font. Grouping
 * the rows under a font header avoids repeating the font name on every row
 * while making the heading-font / body-font split visible at a glance.
 *
 * Each row is a single line: level tag + sample text (in the actual font, size
 * capped) + monospace specs aligned right.
 */
function TypeScaleList({
  typeScale,
  primaryFont,
  additionalFonts,
}: {
  typeScale: TypeScaleLevel[];
  primaryFont: string | null;
  additionalFonts: string[];
}) {
  // Group rows by the font they render in (heading-font vs body-font).
  // Preserves original ordering inside each group.
  const groups = new Map<string, { font: string | null; rows: TypeScaleLevel[] }>();
  for (const row of typeScale) {
    const font = getFontForLevel(row.level, primaryFont, additionalFonts) ?? 'Default';
    if (!groups.has(font)) {
      groups.set(font, { font: font === 'Default' ? null : font, rows: [] });
    }
    groups.get(font)!.rows.push(row);
  }

  return (
    <div className="space-y-10">
      {Array.from(groups.entries()).map(([fontKey, group], gi) => {
        // Determine if this group is heading or body styles for the label
        const allHeadings = group.rows.every((r) => /^h[1-6]$/i.test(r.level.trim()));
        const groupLabel = allHeadings ? 'Heading styles' : 'Body styles';
        const classification = group.font ? classifyFont(group.font) : '';
        return (
          <div key={fontKey + gi}>
            <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase mb-5">
              {groupLabel}
              {group.font && (
                <span className="ml-2 normal-case tracking-normal text-gray-400 font-normal">
                  — {group.font}
                  {classification && <span className="text-gray-300"> ({classification.toLowerCase()})</span>}
                </span>
              )}
            </p>
            <div className="divide-y divide-gray-100">
              {group.rows.map((row, ri) => (
                <TypeScaleRow key={`${row.level}-${ri}`} row={row} font={group.font} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * One row inside a Type Scale group. Single horizontal line:
 *   [LEVEL]  Sample text in actual font (capped) ········· 16px · 400 · 1.6 · #000
 */
function TypeScaleRow({
  row,
  font,
}: {
  row: TypeScaleLevel;
  font: string | null;
}) {
  return (
    <div className="flex items-baseline gap-4 py-4 first:pt-0 last:pb-0">
      <span className="w-12 flex-shrink-0 font-mono text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
        {row.level}
      </span>

      <span
        className="flex-1 min-w-0 text-gray-900 leading-tight truncate"
        style={{
          fontSize: capPreviewSize(row.size),
          fontWeight: row.weight || 'inherit',
          lineHeight: row.lineHeight || 'inherit',
          fontFamily: font ?? undefined,
        }}
      >
        {row.name || 'Sample text'}
      </span>

      <div className="flex-shrink-0 flex items-center gap-2 text-[11px] text-gray-500 font-mono whitespace-nowrap">
        <span>{row.size || '—'}</span>
        <span className="text-gray-300">·</span>
        <span>{row.weight || '—'}</span>
        <span className="text-gray-300">·</span>
        <span>{row.lineHeight || '—'}</span>
        {row.color && (
          <>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-sm border border-gray-200"
                style={{ backgroundColor: row.color }}
              />
              {row.color}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * In-context preview — composes the type scale into a faux page so users
 * see how the heading + body fonts read TOGETHER.
 *
 * IMPORTANT: this mock uses FIXED, harmonic sizes (36/22/18/15/13px) instead
 * of the raw scraped sizes. Many sites rebase the root font-size (ACSS sets
 * html { font-size: 62.5% }, so their `1.8rem` body = 18px) — copying their
 * raw rem values into our preview produces oversized text that misrepresents
 * how it actually reads on the brand's site. Only font-family / weight / color
 * are pulled from the type scale; sizes are normalised to a sensible mock scale.
 *
 * Picks the first available level for each role; falls back to neutral
 * defaults when a role is missing from the type scale.
 */
function InContextPreview({
  typeScale,
  primaryFont,
  additionalFonts,
}: {
  typeScale: TypeScaleLevel[];
  primaryFont: string | null;
  additionalFonts: string[];
}) {
  const findByLevel = (predicate: (lvl: string) => boolean): TypeScaleLevel | undefined =>
    typeScale.find((l) => predicate(l.level.trim().toLowerCase()));

  const h1 = findByLevel((l) => l === 'h1');
  const h2 = findByLevel((l) => l === 'h2');
  const h3 = findByLevel((l) => l === 'h3');
  const body = findByLevel((l) => l === 'body' || l === 'p');
  const small = findByLevel((l) => l === 'small' || l === 'caption');

  // Build a style for one role: take font-family + weight + color from the
  // matching scale level (if any), but always use the supplied mock size.
  const mockStyle = (level: TypeScaleLevel | undefined, sizePx: number): React.CSSProperties => ({
    fontSize: `${sizePx}px`,
    fontWeight: level?.weight || undefined,
    color: level?.color || undefined,
    fontFamily: level
      ? getFontForLevel(level.level, primaryFont, additionalFonts)
      : (primaryFont ? normaliseFontName(primaryFont) : undefined),
  });

  // Heading fonts use the heading-font even when the scale doesn't define
  // that exact level (e.g. brand has H1 + H2 but no H3) — falls back to
  // additionalFonts[0] consistently with getFontForLevel.
  const headingFontFamily =
    additionalFonts[0] ? normaliseFontName(additionalFonts[0]) : (primaryFont ? normaliseFontName(primaryFont) : undefined);
  const bodyFontFamily = primaryFont ? normaliseFontName(primaryFont) : undefined;

  return (
    <div className="rounded-md border border-gray-200 bg-white p-8">
      <h1
        className="leading-tight"
        style={{
          fontSize: '36px',
          fontWeight: h1?.weight || 700,
          color: h1?.color || undefined,
          fontFamily: h1 ? getFontForLevel(h1.level, primaryFont, additionalFonts) : headingFontFamily,
        }}
      >
        {h1?.name || 'Hero Heading Example'}
      </h1>

      <p
        className="mt-3 max-w-2xl text-gray-500 leading-relaxed"
        style={{ fontFamily: bodyFontFamily, fontSize: '15px' }}
      >
        A concise lede sentence that introduces the page and sets the tone for the body copy that follows.
      </p>

      <h2
        className="mt-8 leading-snug"
        style={{
          fontSize: '24px',
          fontWeight: h2?.weight || 600,
          color: h2?.color || undefined,
          fontFamily: h2 ? getFontForLevel(h2.level, primaryFont, additionalFonts) : headingFontFamily,
        }}
      >
        {h2?.name || 'A Section Heading Below'}
      </h2>

      <p
        className="mt-3 max-w-2xl text-gray-700 leading-relaxed"
        style={mockStyle(body, 15)}
      >
        This paragraph demonstrates the rhythm between the heading font and the body font in a realistic
        composition. Together they create the visual hierarchy a reader uses to scan the page — headings
        anchor attention, body text carries the substance.
      </p>

      <ul
        className="mt-4 max-w-2xl list-disc pl-6 space-y-1.5 text-gray-700"
        style={mockStyle(body, 15)}
      >
        <li>A bulleted item demonstrating list rhythm in body style.</li>
        <li>Another item showing how the line-height and weight read in flow.</li>
      </ul>

      <h3
        className="mt-8 leading-snug"
        style={{
          fontSize: '18px',
          fontWeight: h3?.weight || 600,
          color: h3?.color || undefined,
          fontFamily: h3 ? getFontForLevel(h3.level, primaryFont, additionalFonts) : headingFontFamily,
        }}
      >
        {h3?.name || 'A Subsection Below'}
      </h3>

      <p
        className="mt-3 max-w-2xl text-gray-700 leading-relaxed"
        style={mockStyle(body, 15)}
      >
        A second paragraph follows the subsection. The body font carries the weight of the content
        while the headings provide structural punctuation throughout the page.
      </p>

      <p
        className="mt-6 text-gray-500 italic"
        style={mockStyle(small, 13)}
      >
        {small?.name || 'A small caption sits at the bottom of the page.'}
      </p>
    </div>
  );
}

/**
 * Heuristic classification for common typefaces. Returns a short descriptor
 * shown under the font name (e.g. "Sans-serif", "Display serif"). Conservative
 * — falls back to a neutral label when the font is unknown.
 */
function classifyFont(name: string): string {
  const lower = name.toLowerCase().trim();
  const SERIF = ['oranienbaum','playfair','playfair display','merriweather','lora','garamond','georgia','times','source serif','noto serif','crimson','libre baskerville','dm serif','prata','cormorant'];
  const DISPLAY = ['oranienbaum','playfair','prata','cormorant','dm serif','abril fatface'];
  const MONO = ['fira code','jetbrains mono','source code pro','courier','consolas','menlo','sf mono','ibm plex mono','monaco'];
  if (MONO.some((f) => lower.includes(f))) return 'Monospace';
  if (DISPLAY.some((f) => lower.includes(f))) return 'Display serif';
  if (SERIF.some((f) => lower.includes(f))) return 'Serif';
  return 'Sans-serif';
}

/**
 * Specimen card for a brand font. Big "Aa" letter on the left, font name +
 * classification on the right, pangram below, link out at the bottom.
 *
 * The "Aa" specimen size is fixed (84px) regardless of the font's typical
 * usage size — purpose is to show character shapes at a glance.
 */
function FontDisplayCard({
  role,
  usage,
  name,
  url,
}: {
  role: string;
  usage: string;
  name: string | null | undefined;
  url: string | null | undefined;
}) {
  const normalised = name ? normaliseFontName(name) : null;
  const hasFont = Boolean(name);

  if (!hasFont) {
    return (
      <div className="rounded-lg border border-gray-200 p-5">
        <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase mb-3">
          {role} · {usage}
        </p>
        <div className="text-sm text-gray-400 italic">Not detected</div>
      </div>
    );
  }

  const classification = classifyFont(name as string);

  return (
    <div className="rounded-lg border border-gray-200 p-5 flex flex-col gap-4">
      {/* Role tag */}
      <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
        {role} · {usage}
      </p>

      {/* Big Aa specimen + name */}
      <div className="flex items-center gap-6">
        <div
          className="leading-none text-gray-900 select-none"
          style={{ fontFamily: normalised ?? undefined, fontSize: '5.25rem', fontWeight: 600 }}
        >
          Aa
        </div>
        <div className="min-w-0">
          <div
            className="text-2xl font-semibold text-gray-900 break-words leading-tight"
            style={{ fontFamily: normalised ?? undefined }}
          >
            {name}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {classification} · Google Fonts
          </div>
        </div>
      </div>

      {/* Pangram in the actual font */}
      <p
        className="text-base text-gray-700 leading-relaxed"
        style={{ fontFamily: normalised ?? undefined }}
      >
        The quick brown fox jumps over the lazy dog.
      </p>

      {/* Link out */}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:text-primary-700 self-start"
        >
          View on Google Fonts →
        </a>
      )}
    </div>
  );
}

/**
 * Build per-font Google Fonts CSS URLs.
 *
 * Per-font (rather than multi-family) requests because:
 *   - One unknown font name in a multi-family request can return 400,
 *     blocking the entire stylesheet (and all valid fonts inside it).
 *   - Per-font URLs let the browser load what it can and gracefully drop
 *     what it can't.
 *
 * Conservative weight set (`wght@400;700`) instead of all 9 weights:
 *   - Many fonts only ship a subset of weights (Oranienbaum has only 400).
 *     Requesting unsupported weights inflates the URL without changing the
 *     rendered output, and risks Google rejecting some combinations.
 */
function buildGoogleFontsUrls(fonts: string[]): string[] {
  return fonts
    .filter((f) => f && f.trim().length > 0)
    .map(normaliseFontName)
    .map((f) => {
      const family = f.replace(/\s+/g, '+');
      return `https://fonts.googleapis.com/css2?family=${family}:wght@400;700&display=swap`;
    });
}

export function TypographySection({ styleguide, canEdit }: TypographySectionProps) {
  const typeScale = (styleguide.typeScale ?? []) as TypeScaleLevel[];
  const updateTypography = useUpdateSection("typography");

  // Stabilize the additional fonts array reference to avoid unnecessary useEffect re-runs
  const additionalFontsKey = useMemo(
    () => (styleguide.additionalFonts ?? []).join(','),
    [styleguide.additionalFonts],
  );

  // Load fonts into the browser so previews render correctly.
  // Injects one <link> per font to Google Fonts. Per-font links survive when
  // an individual family is unknown (one missing font can't block the others).
  useEffect(() => {
    const allFonts = [
      styleguide.primaryFontName,
      ...(styleguide.additionalFonts ?? []),
    ].filter((f): f is string => !!f);

    const urls = buildGoogleFontsUrls(allFonts);
    if (urls.length === 0) return;

    // Remove any previously-injected font links before adding new ones
    document.querySelectorAll('link[data-brandstyle-fonts]').forEach((el) => el.remove());

    const links = urls.map((url) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.setAttribute('data-brandstyle-fonts', 'true');
      document.head.appendChild(link);
      return link;
    });

    return () => {
      links.forEach((l) => l.remove());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleguide.primaryFontName, additionalFontsKey]);

  // Font editing state
  const [isEditingFont, setIsEditingFont] = useState(false);
  const [editFontName, setEditFontName] = useState("");
  const [editFontUrl, setEditFontUrl] = useState("");

  // Type scale editing state
  const [isEditingScale, setIsEditingScale] = useState(false);
  const [editScale, setEditScale] = useState<TypeScaleLevel[]>([]);

  const startEditFont = () => {
    setEditFontName(styleguide.primaryFontName ?? "");
    setEditFontUrl(styleguide.primaryFontUrl ?? "");
    setIsEditingFont(true);
  };

  const cancelEditFont = () => {
    setIsEditingFont(false);
  };

  const saveFont = () => {
    updateTypography.mutate(
      {
        primaryFontName: editFontName.trim() || null,
        primaryFontUrl: editFontUrl.trim() || null,
      },
      { onSuccess: () => setIsEditingFont(false) },
    );
  };

  const startEditScale = useCallback(() => {
    setEditScale(typeScale.map((l) => ({ ...l })));
    setIsEditingScale(true);
  }, [typeScale]);

  const cancelEditScale = () => {
    setIsEditingScale(false);
  };

  const saveScale = () => {
    const cleaned = editScale.filter((l) => l.level.trim() || l.size.trim());
    updateTypography.mutate({ typeScale: cleaned.length > 0 ? cleaned : null }, {
      onSuccess: () => setIsEditingScale(false),
    });
  };

  const updateScaleRow = (index: number, field: keyof TypeScaleLevel, value: string) => {
    setEditScale((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const removeScaleRow = (index: number) => {
    setEditScale((prev) => prev.filter((_, i) => i !== index));
  };

  const addScaleRow = () => {
    setEditScale((prev) => [...prev, createBlankLevel()]);
  };

  return (
    <div data-testid="typography-section" className="space-y-8">
      {/* Font Preview */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-5">
          <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">Brand Fonts</h3>
          {canEdit && !isEditingFont && (
            <button
              onClick={startEditFont}
              className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingFont ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Font Name</label>
              <input
                value={editFontName}
                onChange={(e) => setEditFontName(e.target.value)}
                placeholder="e.g. Inter"
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Font URL</label>
              <input
                value={editFontUrl}
                onChange={(e) => setEditFontUrl(e.target.value)}
                placeholder="https://fonts.google.com/..."
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" size="sm" onClick={saveFont} isLoading={updateTypography.isPending}>
                Save
              </Button>
              <Button variant="secondary" size="sm" onClick={cancelEditFont}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Two-column layout: Primary (body) + Secondary (heading) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FontDisplayCard
                role="Primary"
                usage="Body, UI, running copy"
                name={styleguide.primaryFontName}
                url={styleguide.primaryFontUrl}
              />
              <FontDisplayCard
                role="Secondary"
                usage="Headings, display, emphasis"
                name={styleguide.additionalFonts?.[0] ?? null}
                url={googleFontsViewUrl(styleguide.additionalFonts?.[0])}
              />
            </div>

            {/* Also-detected fonts — subtle list of weaker signals (Roboto/etc.) */}
            {(styleguide.additionalFonts?.length ?? 0) > 1 && (
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Also detected on site</p>
                <div className="flex flex-wrap gap-1.5">
                  {styleguide.additionalFonts.slice(1).map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600"
                      style={{ fontFamily: normaliseFontName(f) }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Type Scale */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-5">
          <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">Type Scale</h3>
          {canEdit && !isEditingScale && (
            <button
              onClick={startEditScale}
              className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
              title="Edit type scale"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingScale ? (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-2 text-xs font-medium text-gray-500 uppercase">Level</th>
                    <th className="text-left py-2 pr-2 text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="text-left py-2 pr-2 text-xs font-medium text-gray-500 uppercase">Weight</th>
                    <th className="text-left py-2 pr-2 text-xs font-medium text-gray-500 uppercase">Line Height</th>
                    <th className="text-left py-2 pr-2 text-xs font-medium text-gray-500 uppercase">Color</th>
                    <th className="text-left py-2 pr-2 text-xs font-medium text-gray-500 uppercase">Usage</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {editScale.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 pr-2">
                        <select
                          value={LEVEL_PRESETS.includes(row.level) ? row.level : "__custom__"}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateScaleRow(i, "level", val === "__custom__" ? "" : val);
                            if (val !== "__custom__") updateScaleRow(i, "name", val);
                          }}
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          {LEVEL_PRESETS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                          <option value="__custom__">Custom...</option>
                        </select>
                        {!LEVEL_PRESETS.includes(row.level) && (
                          <input
                            value={row.level}
                            onChange={(e) => {
                              updateScaleRow(i, "level", e.target.value);
                              updateScaleRow(i, "name", e.target.value);
                            }}
                            placeholder="Custom"
                            className="w-full text-xs px-2 py-1 mt-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={row.size}
                          onChange={(e) => updateScaleRow(i, "size", e.target.value)}
                          placeholder="36px"
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={row.weight}
                          onChange={(e) => updateScaleRow(i, "weight", e.target.value)}
                          placeholder="bold"
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={row.lineHeight}
                          onChange={(e) => updateScaleRow(i, "lineHeight", e.target.value)}
                          placeholder="1.2"
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={row.color ?? ""}
                          onChange={(e) => updateScaleRow(i, "color", e.target.value)}
                          placeholder="#111827"
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={row.usage ?? ""}
                          onChange={(e) => updateScaleRow(i, "usage", e.target.value)}
                          placeholder="Page titles"
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => removeScaleRow(i)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove level"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={addScaleRow}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add level
            </button>

            <div className="flex gap-2 pt-2">
              <Button variant="primary" size="sm" onClick={saveScale} isLoading={updateTypography.isPending}>
                Save
              </Button>
              <Button variant="secondary" size="sm" onClick={cancelEditScale}>
                Cancel
              </Button>
            </div>
          </div>
        ) : typeScale.length > 0 ? (
          <TypeScaleList
            typeScale={typeScale}
            primaryFont={styleguide.primaryFontName}
            additionalFonts={styleguide.additionalFonts ?? []}
          />
        ) : (
          <div className="py-6 text-center text-sm text-gray-400">
            <p>No type scale defined yet.</p>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditScale([createBlankLevel()]);
                  setIsEditingScale(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-primary hover:text-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add type scale
              </button>
            )}
          </div>
        )}
      </Card>

      {/* In Context — realistic mock showing how the typography hierarchy works together */}
      {typeScale.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">In Context</h3>
            <p className="text-xs text-gray-400">How the styles combine on a real page</p>
          </div>
          <InContextPreview
            typeScale={typeScale}
            primaryFont={styleguide.primaryFontName}
            additionalFonts={styleguide.additionalFonts ?? []}
          />
        </Card>
      )}

      <AiContentBanner section="typography" savedForAi={styleguide.typographySavedForAi} />
    </div>
  );
}
