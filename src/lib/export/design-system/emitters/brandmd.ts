// =============================================================
// brand.md Emitter
//
// Produceert een bestand conform de open brand.md-standaard
// (upstream v0.2-kern: YAML-frontmatter + Strategy / Voice / Visual,
// zie github.com/caiopizzol/brand.md) plus het Branddock
// "full profile": additieve secties (Audience, Products & Services,
// Channel Tones, gestructureerde Guardrails) en frontmatter-blokken
// (locales, validation, provenance). Parsers die alleen de kern
// kennen slaan de extra's over — compatibiliteit is de wet
// (launch-plan v2 §3.1).
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
} from '../canonical';

export const BRAND_MD_SPEC_VERSION = '0.2';

/** Volgorde voor deterministische output. */
const COLOR_ORDER: SemanticColorRole[] = [
  'primary', 'on-primary', 'secondary', 'on-secondary',
  'tertiary', 'on-tertiary', 'surface', 'on-surface',
  'outline', 'error', 'success', 'warning', 'info',
];

const TYPE_ORDER: TypeRole[] = ['headline-display', 'headline-lg', 'headline-md', 'body-lg', 'body-md'];

const VALIDATION_ORDER: BrandMdSectionKey[] = ['strategy', 'voice', 'visual', 'audience', 'products'];

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
  const parts: string[] = [];
  parts.push(renderFrontmatter(model, md, options));
  parts.push('');
  parts.push(`# ${model.meta.name}`);
  parts.push('');
  parts.push(renderPointerLine(md, options));
  parts.push(renderStrategy(model));
  parts.push(renderVoice(model, md));
  parts.push(renderVisual(model));
  parts.push(renderAudience(model));
  parts.push(renderProducts(md));
  parts.push(renderChannelTones(md));
  parts.push(renderGuardrails(model, md));
  if (options.profile === 'extended') {
    parts.push(renderMarketContext(model));
  }
  return parts.filter((s) => s.length > 0).join('\n') + '\n';
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

// ─── Frontmatter ──────────────────────────────────────

function renderFrontmatter(
  model: DesignSystemModel,
  md: BrandMdExtension | undefined,
  options: BrandMdOptions,
): string {
  const lines: string[] = ['---'];
  lines.push(`name: ${yamlString(model.meta.name)}`);
  if (md?.tagline) lines.push(`tagline: ${yamlString(md.tagline)}`);
  lines.push(`version: ${yamlString(BRAND_MD_SPEC_VERSION)}`);
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

// ─── Kern-secties (upstream v0.2) ─────────────────────

function renderStrategy(model: DesignSystemModel): string {
  // Alleen assets met échte inhoud — een workspace heeft altijd 12 canonical
  // assets, maar lege horen niet als sectie-inhoud in het bestand
  // (eerlijkheidsregel full-profile-spec).
  const assets = (model.extensions.brandFoundation?.assets ?? []).filter((a) => a.summary);
  const lines: string[] = ['## Strategy', ''];
  if (assets.length === 0) {
    lines.push('_No strategy assets defined yet._', '');
    return lines.join('\n');
  }
  for (const asset of assets) {
    lines.push(`### ${asset.name}`, '', asset.summary, '');
  }
  return lines.join('\n');
}

function renderVoice(model: DesignSystemModel, md: BrandMdExtension | undefined): string {
  const voice = model.extensions.voice;
  const lines: string[] = ['## Voice', ''];

  if (md?.voiceDescription) lines.push(md.voiceDescription, '');

  if (voice?.principles.length) {
    lines.push('### Tonal rules', '');
    for (const p of voice.principles) lines.push(`- ${p}`);
    lines.push('');
  }
  if (voice?.writingGuidelines.length) {
    lines.push('### Writing guidelines', '');
    for (const g of voice.writingGuidelines) lines.push(`- ${g}`);
    lines.push('');
  }
  if (md?.wordsWeUse.length) {
    lines.push('### Words we use', '', md.wordsWeUse.join(' · '), '');
  }
  if (md?.wordsWeAvoid.length) {
    lines.push('### Words we avoid', '', md.wordsWeAvoid.join(' · '), '');
  }
  if (voice?.doSayPhrases.length) {
    lines.push('### Phrases that sound like us', '');
    for (const p of voice.doSayPhrases) lines.push(`- "${p}"`);
    lines.push('');
  }
  if (lines.length === 2) {
    lines.push('_No voice profile defined yet._', '');
  }
  return lines.join('\n');
}

function renderVisual(model: DesignSystemModel): string {
  const lines: string[] = ['## Visual', ''];
  const colorEntries = COLOR_ORDER.filter((role) => model.colors[role]);
  if (colorEntries.length > 0) {
    lines.push('### Colors', '');
    for (const role of colorEntries) {
      lines.push(`- ${role}: ${model.colors[role]!.value}`);
    }
    lines.push('');
  }
  const typeEntries = TYPE_ORDER.filter((role) => model.typography[role]);
  if (typeEntries.length > 0) {
    lines.push('### Typography', '');
    for (const role of typeEntries) {
      const t = model.typography[role]!;
      lines.push(`- ${role}: ${t.fontFamily} ${t.fontWeight} ${t.fontSize}`);
    }
    lines.push('');
  }
  const imagery = model.extensions.imagery;
  if (imagery?.photographyStyle || imagery?.photographyGuidelines.length) {
    lines.push('### Photography', '');
    if (imagery.photographyStyle) lines.push(imagery.photographyStyle, '');
    for (const g of imagery.photographyGuidelines) lines.push(`- ${g}`);
    if (imagery.photographyGuidelines.length) lines.push('');
  }
  if (lines.length === 2) {
    lines.push('_No visual identity extracted yet._', '');
  }
  return lines.join('\n');
}

// ─── Full-profile-secties (Branddock-superset) ────────

function renderAudience(model: DesignSystemModel): string {
  const personas = model.extensions.brandFoundation?.personas ?? [];
  if (personas.length === 0) return '';
  const lines: string[] = ['## Audience', ''];
  for (const p of personas) {
    lines.push(`### ${p.name}`, '');
    if (p.tagline) lines.push(p.tagline, '');
    if (p.primaryGoal) lines.push(`- Primary goal: ${p.primaryGoal}`);
    if (p.keyTraits.length) lines.push(`- Key traits: ${p.keyTraits.join(', ')}`);
    if (p.quote) lines.push(`- In their words: "${p.quote}"`);
    lines.push('');
  }
  return lines.join('\n');
}

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

function renderGuardrails(model: DesignSystemModel, md: BrandMdExtension | undefined): string {
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
  if (!doRules.length && !dontRules.length) return '';
  const lines: string[] = ['## Guardrails', ''];
  if (doRules.length) {
    lines.push('### Do', '');
    for (const r of doRules) lines.push(`- ${r}`);
    lines.push('');
  }
  if (dontRules.length) {
    lines.push("### Don't", '');
    for (const r of dontRules) lines.push(`- ${r}`);
    lines.push('');
  }
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

// ─── YAML-helpers ─────────────────────────────────────

function yamlString(value: string): string {
  // Newlines/control-chars kunnen uit meta-descriptions of AI-output komen —
  // die zouden de frontmatter over meerdere fysieke regels breken en elke
  // regel-gebaseerde parser (incl. onze eigen validator) misleiden.
  const sanitized = value.replace(/[\r\n]+/g, ' ').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  // Quote alles behalve simpele tokens — voorkomt YAML-edge-cases bij
  // merknamen met dubbele punten, quotes of leading specials. Numeriek
  // ogende waarden ("0.2") altijd quoten zodat ze strings blijven.
  if (
    /^[A-Za-z0-9][A-Za-z0-9 _.\-]*$/.test(sanitized) &&
    !/^(true|false|null|~|yes|no)$/i.test(sanitized) &&
    !/^[\d.]+$/.test(sanitized)
  ) {
    return sanitized;
  }
  return `"${sanitized.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
