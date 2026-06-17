"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Pencil, Plus, Trash2, Sparkles } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { ReviewDraftPanel } from "./review/ReviewDraftPanel";
import { useUpdateSection } from "../hooks/useBrandstyleHooks";
import { useCustomFonts } from "../hooks/useCustomFonts";
import { parseSemanticTokens, buildTypeRoleMap } from "../utils/semantic-tokens";
import { FontsGrid } from "./brand-assets/FontsGrid";
import type { BrandStyleguide, TypeScaleLevel } from "../types/brandstyle.types";
import {
  normaliseFontName,
  getFontForLevel,
  capPreviewSize,
  buildFontFamilyStack,
  weightForLevel,
} from "@/lib/brandstyle/typography-display";
import {
  resolveFontRender,
  injectTypekitCss,
  injectSubstituteCss,
  injectGoogleFontCss,
} from "../utils/font-loading";

/** Resolver-type: levert per font-naam een metric-substitute Google Font (of
 *  null wanneer de echte font direct rendert). */
type SubstituteResolver = (name: string) => string | null;

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
  roleMap,
  substituteFor,
}: {
  typeScale: TypeScaleLevel[];
  primaryFont: string | null;
  additionalFonts: string[];
  roleMap: Map<string, string>;
  substituteFor: SubstituteResolver;
}) {
  // Group rows by the font they render in (heading-font vs body-font).
  // Preserves original ordering inside each group. `displayName` = de schone
  // family-naam (NIET de volledige css-stack) zodat het groepslabel
  // "— Effra" toont i.p.v. de rauwe stack met (sans-serif)-ruis.
  const groups = new Map<string, { font: string | null; displayName: string | null; rows: TypeScaleLevel[] }>();
  for (const row of typeScale) {
    const isHeading = /^h[1-6]$/i.test(row.level.trim());
    const chosenRaw = isHeading && additionalFonts[0] ? additionalFonts[0] : primaryFont;
    const font = getFontForLevel(row.level, primaryFont, additionalFonts, substituteFor) ?? 'Default';
    if (!groups.has(font)) {
      groups.set(font, {
        font: font === 'Default' ? null : font,
        displayName: chosenRaw ? normaliseFontName(chosenRaw) : null,
        rows: [],
      });
    }
    groups.get(font)!.rows.push(row);
  }

  return (
    <div className="space-y-10">
      {Array.from(groups.entries()).map(([fontKey, group], gi) => {
        // Determine if this group is heading or body styles for the label
        const allHeadings = group.rows.every((r) => /^h[1-6]$/i.test(r.level.trim()));
        const groupLabel = allHeadings ? 'Heading styles' : 'Body styles';
        return (
          <div key={fontKey + gi}>
            <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase mb-5">
              {groupLabel}
              {group.displayName && (
                <span className="ml-2 normal-case tracking-normal text-gray-400 font-normal">
                  — {group.displayName}
                </span>
              )}
            </p>
            <div className="divide-y divide-gray-100">
              {group.rows.map((row, ri) => (
                <TypeScaleRow
                  key={`${row.level}-${ri}`}
                  row={row}
                  font={group.font}
                  designMdRole={roleMap.get(row.level)}
                />
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
  designMdRole,
}: {
  row: TypeScaleLevel;
  font: string | null;
  designMdRole?: string;
}) {
  return (
    <div className="flex items-baseline gap-4 py-4 first:pt-0 last:pb-0">
      <div className="w-36 flex-shrink-0 flex flex-col gap-0.5">
        <span className="font-mono text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
          {row.level}
        </span>
        {designMdRole && (
          <span
            className="inline-flex items-center self-start text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded"
            title={`DESIGN.md typography role`}
          >
            {designMdRole}
          </span>
        )}
      </div>

      <span
        className="flex-1 min-w-0 text-gray-900 leading-tight truncate"
        style={{
          fontSize: capPreviewSize(row.size),
          // Gedeelde default-weight: headings krijgen bold ook zonder gescrapt
          // weight, consistent met de In-Context-preview (geen 400-vs-700 split).
          fontWeight: weightForLevel(row.level, row.weight) ?? 'inherit',
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
  substituteFor,
}: {
  typeScale: TypeScaleLevel[];
  primaryFont: string | null;
  additionalFonts: string[];
  substituteFor: SubstituteResolver;
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
  // The stack includes the metric-substitute so commercial fonts render in the
  // substitute instead of dropping to the browser's default serif.
  const withFallback = (raw: string | null | undefined): string | undefined => {
    if (!raw) return undefined;
    return buildFontFamilyStack(raw, substituteFor(raw));
  };

  const mockStyle = (level: TypeScaleLevel | undefined, sizePx: number): React.CSSProperties => ({
    fontSize: `${sizePx}px`,
    fontWeight: weightForLevel(level?.level ?? '', level?.weight),
    color: level?.color || undefined,
    fontFamily: level
      ? getFontForLevel(level.level, primaryFont, additionalFonts, substituteFor)
      : withFallback(primaryFont),
  });

  // Heading fonts use the heading-font even when the scale doesn't define
  // that exact level (e.g. brand has H1 + H2 but no H3) — falls back to
  // additionalFonts[0] consistently with getFontForLevel.
  const headingFontFamily = withFallback(additionalFonts[0] ?? primaryFont);
  const bodyFontFamily = withFallback(primaryFont);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-8">
      <h1
        className="leading-tight"
        style={{
          fontSize: '36px',
          fontWeight: weightForLevel('h1', h1?.weight),
          color: h1?.color || undefined,
          fontFamily: h1 ? getFontForLevel(h1.level, primaryFont, additionalFonts, substituteFor) : headingFontFamily,
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
          fontWeight: weightForLevel('h2', h2?.weight),
          color: h2?.color || undefined,
          fontFamily: h2 ? getFontForLevel(h2.level, primaryFont, additionalFonts, substituteFor) : headingFontFamily,
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
          fontWeight: weightForLevel('h3', h3?.weight),
          color: h3?.color || undefined,
          fontFamily: h3 ? getFontForLevel(h3.level, primaryFont, additionalFonts, substituteFor) : headingFontFamily,
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
  availability,
  inferred = false,
  substituteFont = null,
  hasWorkspaceKit = false,
}: {
  role: string;
  usage: string;
  name: string | null | undefined;
  url: string | null | undefined;
  /** Availability of this font in the detected set — drives the source
   *  label (Google Fonts / Adobe Fonts / Uploaded / Commercial) and
   *  whether the "View on Google Fonts" link renders. */
  availability?: "UPLOADED" | "GOOGLE_FONTS" | "ADOBE_FONTS" | "COMMERCIAL" | "UNKNOWN" | null;
  /** True when `name` is an AI suggestion that was NOT found among the
   *  fonts actually detected on the site (Fase 4). We then show an honest
   *  "not detected" state with the suggestion as a muted hint, instead of a
   *  confident specimen that overstates our certainty. */
  inferred?: boolean;
  /** Metric-substitute Google Font wanneer de echte (commerciële) font niet
   *  direct rendert — staat in de stack zodat de preview niet naar system-ui
   *  valt, en drijft de substitute-badge. */
  substituteFont?: string | null;
  /** True wanneer een workspace Adobe-kit de echte font wél serveert. */
  hasWorkspaceKit?: boolean;
}) {
  const hasFont = Boolean(name);
  // De stack bevat de substitute zodat een commerciële font in de substitute
  // rendert i.p.v. de browser-default serif.
  const fontStack = buildFontFamilyStack(name, substituteFont);

  if (!hasFont || inferred) {
    return (
      <div className="rounded-lg border border-gray-200 p-5">
        <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase mb-3">
          {role} · {usage}
        </p>
        <div className="text-sm text-gray-400 italic">Not detected on the site</div>
        {hasFont && (
          <p className="mt-1.5 text-xs text-gray-400">
            AI suggestion: <span className="text-gray-500">{name}</span>
          </p>
        )}
      </div>
    );
  }

  const classification = classifyFont(name as string);

  // Source label adapts to availability so we don't mis-claim every
  // font is on Google Fonts. Commercial/unknown fonts simply show the
  // classification without a source suffix.
  const sourceSuffix =
    availability === "GOOGLE_FONTS"
      ? " · Google Fonts"
      : availability === "ADOBE_FONTS"
        ? " · Adobe Fonts"
        : availability === "UPLOADED"
          ? " · Uploaded"
          : "";
  const isGoogleFonts = availability === "GOOGLE_FONTS";

  return (
    <div className="rounded-lg border border-gray-200 p-5 flex flex-col gap-4">
      {/* Role tag */}
      <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
        {role} · {usage}
      </p>

      {/* Big Aa specimen + name */}
      <div className="flex items-center gap-6 min-w-0">
        <div
          className="leading-none text-gray-900 select-none flex-shrink-0"
          style={{ fontFamily: fontStack, fontSize: '5.25rem', fontWeight: 600 }}
        >
          Aa
        </div>
        <div className="min-w-0 flex-1">
          {/* break-all handles long hash-style font names (no spaces) that
              `break-words` won't wrap. Truncate to 2 lines after that so a
              60-char hash doesn't push the card height absurdly. */}
          <div
            className="text-2xl font-semibold text-gray-900 break-all leading-tight line-clamp-2"
            title={name ?? undefined}
            style={{ fontFamily: fontStack }}
          >
            {name}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {classification}
            {sourceSuffix}
          </div>
        </div>
      </div>

      {/* Pangram in the actual font */}
      <p
        className="text-base text-gray-700 leading-relaxed"
        style={{ fontFamily: fontStack }}
      >
        The quick brown fox jumps over the lazy dog.
      </p>

      {/* Substitute-badge — wanneer de echte (commerciële) font niet direct
          rendert en we een metric-substitute tonen. Eén consistente melding,
          gelijk aan FontCard. */}
      {substituteFont && !hasWorkspaceKit && (
        <p className="inline-flex items-start gap-1.5 text-[11px] text-gray-500 leading-snug">
          <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0 text-indigo-400" />
          <span>
            Preview with <span className="font-medium text-gray-700">{substituteFont}</span> —{" "}
            {availability === "COMMERCIAL" ? "upload the .woff2 for the real font" : "real font via your own Adobe Fonts kit"}.
          </span>
        </p>
      )}

      {/* Link out — only for real Google Fonts (the URL is built with the
          Google Fonts viewer assumption). Adobe Fonts users browse via their
          kit; no public browse URL exists for arbitrary kit fonts. */}
      {url && isGoogleFonts && (
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

export function TypographySection({ styleguide, canEdit }: TypographySectionProps) {
  const typeScale = useMemo(
    () => (styleguide.typeScale ?? []) as TypeScaleLevel[],
    [styleguide.typeScale],
  );
  const updateTypography = useUpdateSection("typography");
  const reviews = styleguide.reviews ?? [];

  // @font-face injectie voor uploaded fonts. Verhuisd uit BrandAssetsSection
  // omdat alle font-UI (FontsGrid + Brand Fonts cards + Type Scale + In
  // Context preview) hier woont — previews moeten in de echte brand-type
  // renderen, dus de font-face moet beschikbaar zijn waar de previews staan.
  useCustomFonts(styleguide.fonts);

  // DESIGN.md role-mapping uit semanticTokens (of deterministische fallback)
  const typeRoleMap = useMemo(
    () => buildTypeRoleMap(typeScale, parseSemanticTokens(styleguide.semanticTokens)),
    [typeScale, styleguide.semanticTokens],
  );

  /** Lookup: font-name (lowercase) → availability, so the two
   *  top-level brand-font cards render the correct source label
   *  (Google Fonts / Adobe Fonts / Uploaded / Commercial). */
  const fontAvailabilityMap = useMemo(() => {
    const map = new Map<string, "UPLOADED" | "GOOGLE_FONTS" | "ADOBE_FONTS" | "COMMERCIAL" | "UNKNOWN">();
    for (const f of styleguide.fonts ?? []) {
      map.set(f.name.toLowerCase(), f.availability);
    }
    return map;
  }, [styleguide.fonts]);
  const availabilityFor = (name: string | null | undefined) =>
    name ? fontAvailabilityMap.get(name.toLowerCase()) ?? null : null;
  // A font name counts as "confirmed" when it has a StyleguideFont row —
  // either genuinely scraped from the site or user-uploaded (both are real
  // brand fonts; the rows no longer carry the AI fallback — Fase 4). A
  // primary-font name that's absent is a pure AI inference; the card then
  // shows that honestly instead of a confident specimen.
  const isDetectedFont = (name: string | null | undefined) =>
    !!name && fontAvailabilityMap.has(name.toLowerCase());

  // Workspace Adobe Fonts-kit serveert de echte font (de per-font source-kit is
  // domain-locked). `substituteFor` levert per font-naam de metric-substitute
  // (of null als de font direct rendert) zodat de preview-stacks die opnemen.
  const workspaceKitId = styleguide.workspaceAdobeFontsKitId ?? null;
  const substituteFor = useCallback<SubstituteResolver>(
    (name) => {
      const availability = name ? fontAvailabilityMap.get(name.toLowerCase()) ?? null : null;
      return resolveFontRender(name, availability, { workspaceKitId }).substitute?.googleFont ?? null;
    },
    [fontAvailabilityMap, workspaceKitId],
  );

  // Availability-gedreven font-load (vervangt de blinde Google-Fonts-injectie):
  // injecteer per font de juiste bron — workspace Adobe-kit / echte Google Font
  // / metric-substitute — zodat previews consistent renderen i.p.v. een 404'ende
  // <link> voor commerciële fonts. Rows-less namen (pure AI-inferentie) proberen
  // alsnog de echte Google Font (kan een legitieme Google Font zijn). Injectie
  // is idempotent via module-Sets in font-loading.
  const fontsKey = useMemo(
    () =>
      (styleguide.fonts ?? []).map((f) => `${f.name}:${f.availability}`).join(',') +
      '|' +
      [styleguide.primaryFontName, ...(styleguide.additionalFonts ?? [])].join(',') +
      // workspaceKitId mee zodat de injectie-effect óók re-runt wanneer de
      // workspace-kit wijzigt zonder dat een font-naam verandert.
      '|kit:' + (workspaceKitId ?? ''),
    [styleguide.fonts, styleguide.primaryFontName, styleguide.additionalFonts, workspaceKitId],
  );
  useEffect(() => {
    const injectFor = (
      name: string | null | undefined,
      availability: "UPLOADED" | "GOOGLE_FONTS" | "ADOBE_FONTS" | "COMMERCIAL" | "UNKNOWN" | null,
    ) => {
      if (!name) return;
      const plan = resolveFontRender(name, availability, { workspaceKitId });
      if (plan.source === 'ADOBE_FONTS') injectTypekitCss(workspaceKitId);
      else if (plan.source === 'GOOGLE_FONTS') injectGoogleFontCss(normaliseFontName(name));
      else if (plan.substitute) injectSubstituteCss(plan.substitute.googleFont);
      else if (availability == null) injectGoogleFontCss(normaliseFontName(name));
    };
    for (const f of styleguide.fonts ?? []) injectFor(f.name, f.availability);
    for (const n of [styleguide.primaryFontName, ...(styleguide.additionalFonts ?? [])]) {
      if (n && !fontAvailabilityMap.has(n.toLowerCase())) injectFor(n, null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsKey]);

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
                availability={availabilityFor(styleguide.primaryFontName)}
                inferred={!isDetectedFont(styleguide.primaryFontName)}
                substituteFont={styleguide.primaryFontName ? substituteFor(styleguide.primaryFontName) : null}
                hasWorkspaceKit={availabilityFor(styleguide.primaryFontName) === "ADOBE_FONTS" && !!workspaceKitId}
              />
              <FontDisplayCard
                role="Secondary"
                usage="Headings, display, emphasis"
                name={styleguide.additionalFonts?.[0] ?? null}
                url={googleFontsViewUrl(styleguide.additionalFonts?.[0])}
                availability={availabilityFor(styleguide.additionalFonts?.[0])}
                inferred={!isDetectedFont(styleguide.additionalFonts?.[0])}
                substituteFont={styleguide.additionalFonts?.[0] ? substituteFor(styleguide.additionalFonts[0]) : null}
                hasWorkspaceKit={availabilityFor(styleguide.additionalFonts?.[0]) === "ADOBE_FONTS" && !!workspaceKitId}
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
                      style={{ fontFamily: buildFontFamilyStack(f, substituteFor(f)) }}
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

      {/* Font library — verhuisd uit Brand Assets tab. Bevat file-management
          (upload-flow, missing-file warning, Adobe Fonts kit banner) +
          per-rol groepering (DISPLAY / UI / EYEBROW_META / BODY). Vervangt
          de oude TypographyRolesPanel die dezelfde rol-buckets dupliceerde
          met andere preview-cards. */}
      <FontsGrid
        fonts={styleguide.fonts ?? []}
        canEdit={canEdit}
        workspaceKitId={styleguide.workspaceAdobeFontsKitId ?? null}
        reviewSlot={
          <ReviewDraftPanel
            section="brand-assets-fonts"
            reviews={reviews}
            canEdit={canEdit}
            label="Review fonts"
          />
        }
      />

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
            roleMap={typeRoleMap}
            substituteFor={substituteFor}
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
            substituteFor={substituteFor}
          />
        </Card>
      )}

      <AiContentBanner section="typography" savedForAi={styleguide.typographySavedForAi} />
    </div>
  );
}
