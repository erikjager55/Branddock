// =============================================================
// BRAND.md Emitter — spec v0.3.0-conformant
//
// Produceert een bestand conform de open BRAND.md-standaard
// (upstream spec/brand-md.md, github.com/caiopizzol/brand.md):
// frontmatter name/tagline/specVersion/version/language en de lagen
// Strategy / Voice / Visual met de verplichte 0.3-subsecties. Plus
// het Branddock "full profile": additieve frontmatter-blokken
// (locales, validation, provenance), persona-subentries onder
// Strategy > Audience en Do/Don't-lijsten onder Strategy > Guardrails
// (onze upstream-PR-conventies), en de secties Products & Services /
// Channel Tones. Parsers die alleen de kern kennen slaan de extra's
// over — compatibiliteit is de wet (launch-plan v2 §3.1).
//
// Eerlijkheidsregel: verplichte subsecties waarvoor geen echte data
// bestaat krijgen een expliciete "_Not yet defined._"-regel — nooit
// verzonnen inhoud (spec-Governance: "Omit rather than invent";
// migratie-audit 2026-08-14).
//
// Publiek/privaat: het publieke profiel bevat NOOIT concurrenten,
// OKR's of trends. Alleen profile === 'extended' (MCP achter auth)
// voegt Market Context toe.
//
// Output is deterministisch — zelfde model → bit-voor-bit zelfde
// bestand (meta.generatedAt is de enige tijdsbron).
// =============================================================

import type {
  DesignSystemModel,
  BrandMdExtension,
  BrandMdSectionKey,
  SemanticColorRole,
  TypeRole,
  VoiceExtension,
} from '../canonical';

export const BRAND_MD_SPEC_VERSION = '0.3.0';

/** Volgorde voor deterministische output. */
const COLOR_ORDER: SemanticColorRole[] = [
  'primary', 'on-primary', 'secondary', 'on-secondary',
  'tertiary', 'on-tertiary', 'surface', 'on-surface',
  'outline', 'error', 'success', 'warning', 'info',
];

const TYPE_ORDER: TypeRole[] = ['headline-display', 'headline-lg', 'headline-md', 'body-lg', 'body-md'];

const VALIDATION_ORDER: BrandMdSectionKey[] = ['strategy', 'voice', 'visual', 'audience', 'products'];

/** Verplichte-maar-lege subsectie: expliciet, nooit verzonnen. */
const NOT_DEFINED = '_Not yet defined._';

// Mapping van onze canonical-asset-slugs (workspace + draft) naar de
// verplichte 0.3-Strategy-subsecties. Slugs die nergens passen worden als
// extra H3's ná Guardrails geëmit (additief — parsers slaan ze over).
const OVERVIEW_SLUGS = new Set(['purpose', 'purpose-statement', 'golden-circle', 'mission-vision', 'brand-story']);
const POSITIONING_SLUGS = new Set(['positioning', 'brand-essence']);
const PERSONALITY_SLUGS = new Set(['personality', 'brand-personality', 'brand-archetype']);
const PROMISE_SLUGS = new Set(['brand-promise', 'promise']);

export interface BrandMdOptions {
  /** 'public' (deelbaar bestand) of 'extended' (privé, achter MCP-auth) */
  profile: 'public' | 'extended';
  /** Overschrijft provenance uit het model — generator-drafts zetten hier de claim-URL */
  provenanceOverride?: Partial<BrandMdExtension['provenance']> & { generatedAt?: string };
  /** URL van de use-hub voor de pointer-regel onder de titel */
  useHubUrl?: string;
}

export function emitBrandMd(model: DesignSystemModel, options: BrandMdOptions): string {
  const md = model.extensions.brandMd;
  const voice = model.extensions.voice;
  const tagline = resolveTagline(md, voice);
  const parts: string[] = [];
  parts.push(renderFrontmatter(model, md, tagline, options));
  parts.push('');
  parts.push(`# ${model.meta.name}`);
  parts.push('');
  parts.push(renderPointerLine(md, options));
  parts.push(renderStrategy(model, md));
  parts.push(renderVoice(md, voice, tagline));
  parts.push(renderVisual(model));
  parts.push(renderProducts(md));
  parts.push(renderChannelTones(md));
  if (options.profile === 'extended') {
    parts.push(renderMarketContext(model));
  }
  // Dubbele lege regels (bv. na een persona-subentry zonder bullets)
  // samenvouwen — cosmetisch, deterministisch.
  return parts.filter((s) => s.length > 0).join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

/** Telling voor UI-copy ("14 of 19 fields verified") en de pointer-regel. */
export function countValidation(md: BrandMdExtension | undefined): {
  validated: number;
  total: number;
} {
  if (!md) return { validated: 0, total: 0 };
  const entries = VALIDATION_ORDER.map((k) => md.validation[k]).filter(
    (v): v is NonNullable<typeof v> => !!v,
  );
  return {
    validated: entries.filter((v) => v.status === 'validated').length,
    total: entries.length,
  };
}

/**
 * `tagline` is een verplicht frontmatter-veld (0.3). Fallback-keten:
 * gescande/opgeslagen tagline → eerste "phrase that sounds like us"
 * (in de praktijk vaak letterlijk de tagline) → expliciete placeholder.
 */
function resolveTagline(
  md: BrandMdExtension | undefined,
  voice: VoiceExtension | undefined,
): string {
  return md?.tagline ?? voice?.doSayPhrases[0] ?? '(tagline not yet defined)';
}

// ─── Frontmatter ──────────────────────────────────────

function renderFrontmatter(
  model: DesignSystemModel,
  md: BrandMdExtension | undefined,
  tagline: string,
  options: BrandMdOptions,
): string {
  const lines: string[] = ['---'];
  lines.push(`name: ${yamlString(model.meta.name)}`);
  lines.push(`tagline: ${yamlString(tagline)}`);
  lines.push(`specVersion: "${BRAND_MD_SPEC_VERSION}"`);
  // Upstream-semantiek: integer-merkrevisie (start 1), géén specversie.
  // Elke (re)generatie is revisie 1 van dát bestand; een echte
  // revisieteller per workspace is een latere uitbreiding.
  lines.push('version: 1');
  lines.push(`language: ${yamlString(md?.language ?? 'en')}`);

  if (md && md.locales.length > 1) {
    lines.push(`locales: [${md.locales.map(yamlString).join(', ')}]`);
  }

  if (md) {
    lines.push('validation:');
    for (const key of VALIDATION_ORDER) {
      const v = md.validation[key];
      if (!v) continue;
      const fields: string[] = [`status: ${v.status}`];
      if (typeof v.score === 'number') fields.push(`score: ${v.score}`);
      if (v.date) fields.push(`date: ${yamlString(v.date)}`);
      lines.push(`  ${key}: { ${fields.join(', ')} }`);
    }
  }

  const prov = { ...md?.provenance, ...options.provenanceOverride };
  lines.push('provenance:');
  lines.push(`  generated_by: ${yamlString(prov.generatedBy ?? 'Branddock')}`);
  lines.push(`  generated_at: ${yamlString(options.provenanceOverride?.generatedAt ?? model.meta.generatedAt.slice(0, 10))}`);
  if (prov.canonicalUrl) lines.push(`  canonical: ${yamlString(prov.canonicalUrl)}`);
  if (prov.sourceUrl) lines.push(`  source: ${yamlString(prov.sourceUrl)}`);

  lines.push('---');
  return lines.join('\n');
}

function renderPointerLine(md: BrandMdExtension | undefined, options: BrandMdOptions): string {
  // De "drie functionele regels" uit de touchpoint-strategie (1.3),
  // samengevouwen tot één zichtbare blockquote — geen marketing.
  const segments: string[] = [];
  const counts = countValidation(md);
  if (counts.total > 0) {
    segments.push(`${counts.validated} of ${counts.total} sections verified`);
    if (counts.validated < counts.total) {
      const canonical = options.provenanceOverride?.canonicalUrl ?? md?.provenance.canonicalUrl;
      if (canonical) segments.push(`complete at ${canonical}`);
    }
  }
  if (options.useHubUrl) segments.push(`how to use this file: ${options.useHubUrl}`);
  if (segments.length === 0) return '';
  return `> ${segments.join(' · ')}\n`;
}

// ─── Layer 1: Strategy (0.3: 7 verplichte subsecties) ──

function renderStrategy(model: DesignSystemModel, md: BrandMdExtension | undefined): string {
  // Alleen assets met échte inhoud — een workspace heeft altijd 12 canonical
  // assets, maar lege horen niet als sectie-inhoud in het bestand.
  const assets = (model.extensions.brandFoundation?.assets ?? []).filter((a) => a.summary);
  const bySlug = (slugs: Set<string>) => assets.filter((a) => slugs.has(a.slug));
  const mapped = new Set([...OVERVIEW_SLUGS, ...POSITIONING_SLUGS, ...PERSONALITY_SLUGS, ...PROMISE_SLUGS]);
  const extras = assets.filter((a) => !mapped.has(a.slug));

  const lines: string[] = ['## Strategy', ''];

  pushSubsection(lines, 'Overview', bySlug(OVERVIEW_SLUGS).map((a) => a.summary));
  lines.push(...renderStrategyAudience(model));
  pushSubsection(lines, 'Positioning', bySlug(POSITIONING_SLUGS).map((a) => a.summary));
  pushSubsection(lines, 'Personality', bySlug(PERSONALITY_SLUGS).map((a) => a.summary));
  // Geen databron in Branddock (nog) — expliciet leeg i.p.v. verzonnen.
  pushSubsection(lines, 'References & Anti-References', []);
  pushSubsection(lines, 'Promise', bySlug(PROMISE_SLUGS).map((a) => a.summary));
  lines.push(...renderStrategyGuardrails(model, md));

  // Niet-gemapte assets (Core Values, Social Relevancy, …) als additieve H3's.
  for (const asset of extras) {
    lines.push(`### ${asset.name}`, '', asset.summary, '');
  }

  return lines.join('\n');
}

/**
 * Strategy > Audience (0.3-verplicht) — proza-kern plus gestructureerde
 * persona-subentries (#### per persona; onze upstream-PR-conventie).
 */
function renderStrategyAudience(model: DesignSystemModel): string[] {
  const personas = model.extensions.brandFoundation?.personas ?? [];
  const lines: string[] = ['### Audience', ''];
  if (personas.length === 0) {
    lines.push(NOT_DEFINED, '');
    return lines;
  }
  const names = personas.map((p) => p.name).join(', ');
  lines.push(`Primary audiences: ${names}.`, '');
  for (const p of personas) {
    lines.push(`#### ${p.name}`, '');
    if (p.tagline) lines.push(p.tagline, '');
    if (p.primaryGoal) lines.push(`- Primary goal: ${p.primaryGoal}`);
    if (p.keyTraits.length) lines.push(`- Key traits: ${p.keyTraits.join(', ')}`);
    if (p.quote) lines.push(`- In their words: "${p.quote}"`);
    lines.push('');
  }
  return lines;
}

/**
 * Strategy > Guardrails (0.3-verplicht) — machine-checkbare Do/Don't-lijsten
 * (#### Do / #### Don't; onze upstream-PR-conventie).
 */
function renderStrategyGuardrails(
  model: DesignSystemModel,
  md: BrandMdExtension | undefined,
): string[] {
  // Prose-dosDonts ("Do: x" / "Don't: y") meenemen in de gestructureerde
  // lijsten — anders kan de sectie-guard slagen terwijl beide lijsten leeg
  // zijn en er een kale kop wordt geëmit.
  const proseDo: string[] = [];
  const proseDont: string[] = [];
  for (const entry of model.prose.dosDonts ?? []) {
    if (entry.startsWith('Do: ')) proseDo.push(entry.slice(4));
    else if (entry.startsWith("Don't: ")) proseDont.push(entry.slice(7));
  }
  const doRules = [...new Set([...(md?.guardrails.do ?? []), ...proseDo])];
  const dontRules = [...new Set([...(md?.guardrails.dont ?? []), ...proseDont])];

  const lines: string[] = ['### Guardrails', ''];
  if (!doRules.length && !dontRules.length) {
    lines.push(NOT_DEFINED, '');
    return lines;
  }
  if (doRules.length) {
    lines.push('#### Do', '');
    for (const r of doRules) lines.push(`- ${r}`);
    lines.push('');
  }
  if (dontRules.length) {
    lines.push("#### Don't", '');
    for (const r of dontRules) lines.push(`- ${r}`);
    lines.push('');
  }
  return lines;
}

// ─── Layer 2: Voice ───────────────────────────────────

function renderVoice(
  md: BrandMdExtension | undefined,
  voice: VoiceExtension | undefined,
  tagline: string,
): string {
  const lines: string[] = ['## Voice', ''];
  const phrases = voice?.doSayPhrases ?? [];

  // Identity (verplicht)
  pushSubsection(lines, 'Identity', md?.voiceDescription ? [md.voiceDescription] : []);

  // Tagline & Slogans (verplicht)
  lines.push('### Tagline & Slogans', '');
  if (tagline.startsWith('(tagline')) {
    lines.push(NOT_DEFINED, '');
  } else {
    lines.push(`- Primary: "${tagline}"`);
    for (const p of phrases.filter((s) => s !== tagline).slice(0, 4)) {
      lines.push(`- "${p}"`);
    }
    lines.push('');
  }

  // Message Pillars (verplicht) — scan-afgeleid of (later) workspace-data.
  lines.push('### Message Pillars', '');
  if (md?.messagePillars?.length) {
    for (const p of md.messagePillars) {
      lines.push(`- **${p.pillar}**${p.statements.length ? ` — ${p.statements.join('; ')}` : ''}`);
    }
    lines.push('');
  } else {
    lines.push(NOT_DEFINED, '');
  }

  // Phrases (verplicht)
  lines.push('### Phrases', '');
  if (phrases.length) {
    for (const p of phrases) lines.push(`- "${p}"`);
    lines.push('');
  } else {
    lines.push(NOT_DEFINED, '');
  }

  // Vocabulary (optioneel — alleen bij echte data)
  if (md?.wordsWeUse.length || md?.wordsWeAvoid.length) {
    lines.push('### Vocabulary', '');
    if (md.wordsWeUse.length) lines.push(`- Preferred: ${md.wordsWeUse.join(' · ')}`);
    if (md.wordsWeAvoid.length) lines.push(`- Avoid: ${md.wordsWeAvoid.join(' · ')}`);
    lines.push('');
  }

  // Tonal Rules (verplicht)
  lines.push('### Tonal Rules', '');
  const rules = [...(voice?.principles ?? []), ...(voice?.writingGuidelines ?? [])];
  const neverSay = voice?.dontSayPhrases ?? [];
  if (!rules.length && !phrases.length && !neverSay.length) {
    lines.push(NOT_DEFINED, '');
  } else {
    for (const r of rules) lines.push(`- ${r}`);
    if (rules.length) lines.push('');
    if (phrases.length && neverSay.length) {
      lines.push('| We Say | We Never Say |', '|---|---|');
      const rows = Math.min(phrases.length, neverSay.length);
      for (let i = 0; i < rows; i++) {
        lines.push(`| "${phrases[i]}" | "${neverSay[i]}" |`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── Layer 3: Visual ──────────────────────────────────

function renderVisual(model: DesignSystemModel): string {
  const lines: string[] = ['## Visual', ''];

  // Core Colors (verplicht; 0.2-alias: Colors)
  lines.push('### Core Colors', '');
  const colorEntries = COLOR_ORDER.filter((role) => model.colors[role]);
  if (colorEntries.length) {
    for (const role of colorEntries) {
      lines.push(`- **${displayRole(role)}** \`${model.colors[role]!.value}\``);
    }
    lines.push('');
  } else {
    lines.push(NOT_DEFINED, '');
  }

  // Typefaces (verplicht; 0.2-alias: Typography) — alleen families + rollen,
  // géén maten/gewichten (die horen per 0.3 in een DESIGN.md). Licentiestatus
  // is onbekend voor gescande/geëxtraheerde fonts — dat zegt het bestand dan
  // ook expliciet (spec: "An unverified family should say so").
  lines.push('### Typefaces', '');
  const families = collectTypeFamilies(model);
  if (families.size) {
    for (const [family, roles] of families) {
      lines.push(`- **${family}** — used for ${roles.join(', ')}. Licensing: not verified.`);
    }
    lines.push('');
  } else {
    lines.push(NOT_DEFINED, '');
  }

  // Photography & Illustration (optioneel; 0.2-alias: Photography)
  const imagery = model.extensions.imagery;
  if (imagery?.photographyStyle || imagery?.photographyGuidelines.length) {
    lines.push('### Photography & Illustration', '');
    if (imagery.photographyStyle) lines.push(imagery.photographyStyle, '');
    for (const g of imagery.photographyGuidelines) lines.push(`- ${g}`);
    if (imagery.photographyGuidelines.length) lines.push('');
  }

  // Art Direction (verplicht in 0.3; 0.2-alias: Style) — scan-afgeleide
  // keywords + statement; levende versie valt terug op de styleguide-overview.
  const art = model.extensions.brandMd?.artDirection;
  lines.push('### Art Direction', '');
  if (art?.keywords.length || art?.statement) {
    if (art.keywords.length) lines.push(`Design keywords: ${art.keywords.join(' · ')}.`, '');
    if (art.statement) lines.push(art.statement, '');
  } else if (model.prose.overview) {
    lines.push(model.prose.overview, '');
  } else {
    lines.push(NOT_DEFINED, '');
  }

  return lines.join('\n');
}

function displayRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function collectTypeFamilies(model: DesignSystemModel): Map<string, string[]> {
  const families = new Map<string, string[]>();
  for (const role of TYPE_ORDER) {
    const t = model.typography[role];
    if (!t) continue;
    const list = families.get(t.fontFamily) ?? [];
    list.push(role);
    families.set(t.fontFamily, list);
  }
  return families;
}

// ─── Full-profile-secties (Branddock-superset, additief) ──

function renderProducts(md: BrandMdExtension | undefined): string {
  const products = md?.products ?? [];
  if (products.length === 0) return '';
  const lines: string[] = ['## Products & Services', ''];
  for (const p of products) {
    lines.push(`### ${p.name}`, '');
    if (p.description) lines.push(p.description, '');
    if (p.benefits.length) lines.push(`- Key benefits: ${p.benefits.join('; ')}`);
    if (p.useCases.length) lines.push(`- Use cases: ${p.useCases.join('; ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

function renderChannelTones(md: BrandMdExtension | undefined): string {
  const tones = md?.channelTones ?? [];
  if (tones.length === 0) return '';
  const lines: string[] = ['## Channel Tones', ''];
  const sorted = [...tones].sort((a, b) => a.channel.localeCompare(b.channel));
  for (const t of sorted) {
    lines.push(`- ${t.channel}: ${t.tone}`);
  }
  lines.push('');
  return lines.join('\n');
}

// ─── Extended-only (privé profiel, MCP achter auth) ───

function renderMarketContext(model: DesignSystemModel): string {
  const competitors = model.extensions.brandFoundation?.competitors ?? [];
  if (competitors.length === 0) return '';
  const lines: string[] = [
    '## Market Context',
    '',
    '> Private section — never include this in a shared brand.md.',
    '',
  ];
  for (const c of competitors) {
    lines.push(`### ${c.name} (${c.tier})`, '');
    if (c.positioning) lines.push(c.positioning, '');
    if (c.differentiators.length) {
      lines.push(`- Our differentiators: ${c.differentiators.join('; ')}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

// ─── Helpers ──────────────────────────────────────────

/** H3-subsectie met paragrafen, of de expliciete lege-staat. */
function pushSubsection(lines: string[], title: string, paragraphs: string[]): void {
  lines.push(`### ${title}`, '');
  const filled = paragraphs.filter((p) => p && p.trim().length > 0);
  if (filled.length === 0) {
    lines.push(NOT_DEFINED, '');
    return;
  }
  for (const p of filled) lines.push(p, '');
}

function yamlString(value: string): string {
  // Newlines/control-chars kunnen uit meta-descriptions of AI-output komen —
  // die zouden de frontmatter over meerdere fysieke regels breken en elke
  // regel-gebaseerde parser (incl. onze eigen validator) misleiden.
  const sanitized = value.replace(/[\r\n]+/g, ' ').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  // Quote alles behalve simpele tokens — voorkomt YAML-edge-cases bij
  // merknamen met dubbele punten, quotes of leading specials. Numeriek
  // ogende waarden altijd quoten zodat ze strings blijven.
  if (
    /^[A-Za-z0-9][A-Za-z0-9 _.\-]*$/.test(sanitized) &&
    !/^(true|false|null|~|yes|no)$/i.test(sanitized) &&
    !/^[\d.]+$/.test(sanitized)
  ) {
    return sanitized;
  }
  return `"${sanitized.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
