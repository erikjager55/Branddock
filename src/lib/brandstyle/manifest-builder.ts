// =============================================================
// Brand Manifest builder (designbibliotheek-verbeterplan W1)
//
// Deterministische assemblage van het gecureerde, tweeledige
// eindproduct van de brandstyle-sectie: quick facts + harde regels
// + semantische tokens + voice-baseline + substituties/known gaps.
// Eén bron, twee representaties: het BrandManifest-object (digest-UI)
// en de markdown-render (agent-injectie via getBrandContext).
//
// Ontwerpvoorbeeld: docs/specs/spike-stap0-brand-manifest-dts-ede.md.
// Pure functies, geen IO — de caller levert de al-gefetchte rows aan
// (zelfde patroon als calibration-report.ts).
// =============================================================

import type {
  BrandStyleguide,
  BrandVoiceguide,
  StyleguideColor,
  StyleguideFont,
  StyleguideLogo,
  StyleguideRule,
} from '@prisma/client';
import type { SemanticTokens } from './semantic-role-resolver';
import { stripAnalyzerMarkers, stripAnalyzerMarkersFromList } from './analyzer-markers';
import {
  deriveVoiceBaseline1Pager,
  formatVoiceBaseline1Pager,
} from '@/lib/brand-fidelity/voice-baseline-1pager';

// ─── Types ─────────────────────────────────────────────

/** Herkomst van een manifest-onderdeel, in het token-provenance-vocabulaire. */
export type ManifestRuleSource = 'scraped' | 'recommended' | 'user' | 'derived';

export interface ManifestRule {
  text: string;
  /** Bewijs voor de regel ("colorDonts uit merkanalyse") — M5: geen regel zonder grond. */
  evidence?: string;
  source: ManifestRuleSource;
  /** BLOCKING stopt autonome publicatie (W2/Brandclaw-gate); ADVISORY weegt mee in F-VAL. */
  severity: 'BLOCKING' | 'ADVISORY';
}

export interface ManifestSubstitution {
  text: string;
  /** True zolang de gebruiker de substitutie niet expliciet bevestigd heeft (M5). */
  needsConfirmation: boolean;
}

export interface BrandManifest {
  manifestVersion: number;
  generatedAt: string;
  brandName: string;
  quickFacts: Array<{ label: string; value: string }>;
  hardRules: ManifestRule[];
  /** Subset van semanticTokens.resolved — het manifest hernoemt niets. */
  tokens?: SemanticTokens['resolved'];
  /**
   * W3: gebruiksratio's afgeleid uit werkelijk geobserveerde
   * (tekst|achtergrond)-frequenties — richtlijn i.p.v. alleen waarden.
   */
  usageRatios?: string[];
  voiceBaseline?: string;
  imagery?: { style?: string; guidelines: string[]; donts: string[] };
  substitutions: ManifestSubstitution[];
  knownGaps: string[];
  iterationGuide: string[];
}

/** Styleguide-row met de relaties die de builder nodig heeft. */
export type ManifestStyleguideInput = BrandStyleguide & {
  colors: StyleguideColor[];
  fonts: StyleguideFont[];
  logos: StyleguideLogo[];
  /** W2: gestructureerde regels — wanneer aanwezig winnen die van de *Donts-velden. */
  rules?: StyleguideRule[];
};

// ─── Assembly ──────────────────────────────────────────

/**
 * Bouw het Brand Manifest uit al-gefetchte rows. Deterministisch: alle
 * waarden komen 1-op-1 uit de database (exacte-waarden-doctrine, §1.3 M1
 * van het verbeterplan) — er wordt niets geformuleerd of verzonnen.
 * Sectie-inhoud respecteert de per-sectie savedForAi-gates.
 */
export function buildBrandManifest(
  styleguide: ManifestStyleguideInput,
  voiceguide: BrandVoiceguide | null,
  brandName: string,
): BrandManifest {
  const manifest: BrandManifest = {
    manifestVersion: styleguide.manifestVersion + 1,
    generatedAt: new Date().toISOString(),
    brandName,
    quickFacts: buildQuickFacts(styleguide, brandName),
    hardRules: buildHardRules(styleguide),
    substitutions: buildSubstitutions(styleguide),
    knownGaps: buildKnownGaps(styleguide),
    iterationGuide: buildIterationGuide(),
  };

  const semantic = styleguide.semanticTokens as SemanticTokens | null;
  if (semantic?.resolved && styleguide.colorsSavedForAi) {
    manifest.tokens = { ...semantic.resolved, ...(semantic.overrides ?? {}) };
    const ratios = buildUsageRatios(styleguide.observedColorPairs);
    if (ratios.length > 0) manifest.usageRatios = ratios;
  }

  if (voiceguide) {
    const baseline = deriveVoiceBaseline1Pager(voiceguide);
    const formatted = formatVoiceBaseline1Pager(baseline);
    if (formatted.trim().length > 0) manifest.voiceBaseline = formatted;
  }

  if (styleguide.imagerySavedForAi) {
    manifest.imagery = {
      style: extractPhotographyMood(styleguide.photographyStyle),
      guidelines: stripAnalyzerMarkersFromList(styleguide.photographyGuidelines ?? []),
      donts: stripAnalyzerMarkersFromList(styleguide.imageryDonts ?? []),
    };
  }

  return manifest;
}

function buildQuickFacts(
  styleguide: ManifestStyleguideInput,
  brandName: string,
): Array<{ label: string; value: string }> {
  const facts: Array<{ label: string; value: string }> = [{ label: 'Brand', value: brandName }];
  if (styleguide.archetype) {
    const confidence = styleguide.archetypeConfidence
      ? ` (confidence: ${styleguide.archetypeConfidence})`
      : '';
    facts.push({ label: 'Archetype', value: `${styleguide.archetype}${confidence}` });
  }
  facts.push({ label: 'Layout style', value: styleguide.layoutStyle });
  if (styleguide.designPhilosophy) {
    facts.push({ label: 'Design philosophy', value: stripAnalyzerMarkers(styleguide.designPhilosophy) });
  }
  const primaries = styleguide.colors
    .filter((c) => c.category === 'PRIMARY')
    .map((c) => `${c.name} ${c.hex}`);
  if (primaries.length > 0) facts.push({ label: 'Primary colors', value: primaries.join(', ') });
  if (styleguide.primaryFontName) {
    facts.push({ label: 'Primary font', value: styleguide.primaryFontName });
  }
  if (styleguide.sourceUrl) facts.push({ label: 'Source', value: styleguide.sourceUrl });
  return facts;
}

/**
 * Harde regels v1: de altijd-geldende exacte-waarden-regel plus de
 * gestructureerde import van de bestaande *Donts-velden. Elke regel
 * draagt zijn herkomst; RECOMMENDED-gemarkeerde donts worden als
 * `recommended` gestempeld i.p.v. stilzwijgend als feit gepresenteerd.
 */
function buildHardRules(styleguide: ManifestStyleguideInput): ManifestRule[] {
  const rules: ManifestRule[] = [
    {
      text: 'Use only the tokens, colors and fonts in this manifest — never invent new values.',
      evidence: 'exact-values doctrine',
      source: 'derived',
      severity: 'BLOCKING',
    },
  ];

  // W2: gestructureerde StyleguideRule-records winnen van de legacy
  // *Donts-import — die blijft de fallback voor nog niet gemigreerde
  // workspaces.
  if (styleguide.rules && styleguide.rules.length > 0) {
    for (const rule of styleguide.rules) {
      rules.push({
        text: rule.description ? `${rule.title} — ${rule.description}` : rule.title,
        evidence: `${rule.section} (${rule.kind.toLowerCase()})`,
        source: normalizeRuleSource(rule.source),
        severity: rule.severity,
      });
    }
    return rules;
  }

  const dontSections: Array<{ items: string[]; evidence: string; gated: boolean }> = [
    { items: styleguide.colorDonts ?? [], evidence: 'colorDonts', gated: styleguide.colorsSavedForAi },
    { items: styleguide.logoDonts ?? [], evidence: 'logoDonts', gated: styleguide.logoSavedForAi },
    { items: styleguide.imageryDonts ?? [], evidence: 'imageryDonts', gated: styleguide.imagerySavedForAi },
    {
      items: styleguide.iconographyDonts ?? [],
      evidence: 'iconographyDonts',
      gated: styleguide.designLanguageSavedForAi,
    },
    {
      items: styleguide.graphicElementsDonts ?? [],
      evidence: 'graphicElementsDonts',
      gated: styleguide.designLanguageSavedForAi,
    },
  ];

  for (const section of dontSections) {
    if (!section.gated) continue;
    for (const raw of section.items) {
      const text = stripAnalyzerMarkers(raw);
      if (!text) continue;
      rules.push({
        text,
        evidence: section.evidence,
        source: /^\s*recommended:/i.test(raw) ? 'recommended' : 'scraped',
        severity: 'ADVISORY',
      });
    }
  }
  return rules;
}

/** Map het vrije source-veld naar het manifest-vocabulaire (onbekend → scraped). */
function normalizeRuleSource(source: string): ManifestRuleSource {
  if (source === 'recommended' || source === 'user' || source === 'derived') return source;
  if (source === 'override') return 'user';
  return 'scraped';
}

/** Fonts zonder bestand met commerciële/onbekende beschikbaarheid → substitutie-vlag (M5). */
function buildSubstitutions(styleguide: ManifestStyleguideInput): ManifestSubstitution[] {
  const subs: ManifestSubstitution[] = [];
  for (const font of styleguide.fonts) {
    const unavailable =
      !font.fileUrl && (font.availability === 'COMMERCIAL' || font.availability === 'UNKNOWN');
    if (unavailable) {
      subs.push({
        text: `Font "${font.name}" (${font.role.toLowerCase()}) has no file and is ${font.availability.toLowerCase()} — a substitute is in use until the licensed file is uploaded.`,
        needsConfirmation: true,
      });
    }
  }
  return subs;
}

/** Known Gaps (M5): eerlijk benoemen wat niet geëxtraheerd is — nooit verzonnen vullen. */
function buildKnownGaps(styleguide: ManifestStyleguideInput): string[] {
  const gaps: string[] = [];
  if (!styleguide.logos.some((l) => l.variant === 'PRIMARY')) gaps.push('No primary logo captured.');
  if (styleguide.colors.length === 0) gaps.push('No brand colors extracted.');
  const lowConfidence = styleguide.colors.filter((c) => c.confidence?.toLowerCase() === 'low');
  if (lowConfidence.length > 0) {
    gaps.push(`${lowConfidence.length} color(s) have low extraction confidence — review before relying on them.`);
  }
  if (!styleguide.buttonProfile) gaps.push('No interaction states (hover/focus) extracted.');
  if (!styleguide.motionProfile) gaps.push('No motion/transition signature extracted.');
  if (!styleguide.typeScale) gaps.push('No type scale extracted.');
  return gaps;
}

function buildIterationGuide(): string[] {
  return [
    'Work one component or asset at a time; reference tokens by their semantic name.',
    'When expressing state or emphasis, stay inside the palette — weight and spacing before new colors.',
    'When unsure about tone, prefer the plainer option; this manifest wins over generic best practices.',
  ];
}

/**
 * Leid achtergrond-gebruiksratio's af uit de geobserveerde
 * (tekstkleur " | " achtergrond)-frequenties (multi-page scrape).
 * Alleen aandelen ≥5% — dit is een richtlijn ("~60% surface"), geen
 * pixel-statistiek; 'auto'-surfaces (image-achtergronden) tellen niet mee.
 */
function buildUsageRatios(observedColorPairs: unknown): string[] {
  if (!observedColorPairs || typeof observedColorPairs !== 'object') return [];
  const totals = new Map<string, number>();
  let sum = 0;
  for (const [key, count] of Object.entries(observedColorPairs as Record<string, unknown>)) {
    if (typeof count !== 'number' || count <= 0) continue;
    const bg = key.split(' | ')[1]?.trim();
    if (!bg || bg === 'auto') continue;
    totals.set(bg, (totals.get(bg) ?? 0) + count);
    sum += count;
  }
  if (sum === 0) return [];
  return Array.from(totals.entries())
    .map(([bg, count]) => ({ bg, share: count / sum }))
    .filter((entry) => entry.share >= 0.05)
    .sort((a, b) => b.share - a.share)
    .slice(0, 4)
    .map((entry) => `${entry.bg} ≈${Math.round(entry.share * 100)}% of observed backgrounds`);
}

function extractPhotographyMood(photographyStyle: unknown): string | undefined {
  if (!photographyStyle || typeof photographyStyle !== 'object') return undefined;
  const style = photographyStyle as { mood?: unknown };
  return typeof style.mood === 'string' ? stripAnalyzerMarkers(style.mood) : undefined;
}

// ─── Markdown render (agent-representatie) ─────────────

/**
 * Render het manifest naar de markdown die getBrandContext injecteert.
 * Zelfde document als de digest-UI toont: "what you see is what the AI gets".
 */
export function renderBrandManifestMarkdown(manifest: BrandManifest): string {
  const lines: string[] = [`# Brand Manifest — ${manifest.brandName} (v${manifest.manifestVersion})`, ''];

  lines.push('## Quick facts');
  for (const fact of manifest.quickFacts) lines.push(`- **${fact.label}:** ${fact.value}`);
  lines.push('');

  if (manifest.hardRules.length > 0) {
    lines.push('## Rules');
    for (const rule of manifest.hardRules) {
      const origin = rule.source === 'recommended' ? ' _(recommended — not observed)_' : '';
      lines.push(`- [${rule.severity}] ${rule.text}${origin}`);
    }
    lines.push('');
  }

  if (manifest.tokens) {
    lines.push('## Tokens (semantic — use these names, never loose hex values)');
    const colorEntries = Object.entries(manifest.tokens.colors ?? {});
    if (colorEntries.length > 0) {
      lines.push(`- Colors: ${colorEntries.map(([role, hex]) => `${role} ${hex}`).join(' · ')}`);
    }
    const spacingEntries = Object.entries(manifest.tokens.spacing ?? {});
    if (spacingEntries.length > 0) {
      lines.push(`- Spacing: ${spacingEntries.map(([k, v]) => `${k} ${v}px`).join(' · ')}`);
    }
    const roundedEntries = Object.entries(manifest.tokens.rounded ?? {});
    if (roundedEntries.length > 0) {
      lines.push(`- Rounded: ${roundedEntries.map(([k, v]) => `${k} ${v}px`).join(' · ')}`);
    }
    if (manifest.usageRatios && manifest.usageRatios.length > 0) {
      lines.push(`- Usage: ${manifest.usageRatios.join(' · ')}`);
    }
    lines.push('');
  }

  if (manifest.voiceBaseline) {
    lines.push('## Voice baseline');
    lines.push(manifest.voiceBaseline);
    lines.push('');
  }

  if (manifest.imagery && (manifest.imagery.style || manifest.imagery.guidelines.length > 0)) {
    lines.push('## Imagery');
    if (manifest.imagery.style) lines.push(`- Mood: ${manifest.imagery.style}`);
    for (const g of manifest.imagery.guidelines) lines.push(`- ${g}`);
    for (const d of manifest.imagery.donts) lines.push(`- Don't: ${d}`);
    lines.push('');
  }

  if (manifest.substitutions.length > 0) {
    lines.push('## Substitutions (need confirmation)');
    for (const sub of manifest.substitutions) lines.push(`- ${sub.text}`);
    lines.push('');
  }

  if (manifest.knownGaps.length > 0) {
    lines.push('## Known gaps (honest — do not invent what is missing)');
    for (const gap of manifest.knownGaps) lines.push(`- ${gap}`);
    lines.push('');
  }

  lines.push('## Iteration guide');
  for (const item of manifest.iterationGuide) lines.push(`- ${item}`);

  return lines.join('\n');
}
