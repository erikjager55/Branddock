// =============================================================
// DESIGN.md Emitter
//
// Produceert een Google Stitch-compatible DESIGN.md bestand:
// YAML frontmatter (tokens) + markdown body (rationale) in de
// door de spec voorgeschreven sectie-volgorde.
//
// Branddock-extensies (## Brand Voice / ## Imagery / ## Iconography /
// ## Brand Foundation) worden als extra sections toegevoegd. Dit is
// spec-safe: "Unknown section headings are preserved without error".
//
// Output is deterministisch — dezelfde input produceert bit-voor-bit
// dezelfde output (nodig voor snapshot-tests + diff-arme re-exports).
// =============================================================

import type {
  DesignSystemModel,
  SemanticColorRole,
  TypeRole,
  RoundedScale,
  SpacingScale,
  ElevationLevel,
} from '../canonical';
import { roundedScaleKeys, spacingScaleKeys, elevationLevelKeys } from '../canonical';

// Volgorde voor deterministische YAML-output.
const COLOR_ORDER: SemanticColorRole[] = [
  'primary', 'on-primary', 'primary-container',
  'secondary', 'on-secondary',
  'tertiary', 'on-tertiary',
  'surface', 'on-surface', 'surface-variant',
  'outline',
  'error', 'on-error',
  'success', 'warning', 'info',
];

const TYPE_ORDER: TypeRole[] = [
  'headline-display',
  'headline-lg', 'headline-md', 'headline-sm',
  'body-lg', 'body-md', 'body-sm',
  'label-lg', 'label-md', 'label-sm',
];

export function emitDesignMd(model: DesignSystemModel): string {
  const parts: string[] = [];
  parts.push(renderFrontmatter(model));
  parts.push('');
  parts.push(`# ${model.meta.name}`);
  parts.push('');
  parts.push(renderOverview(model));
  parts.push(renderColors(model));
  parts.push(renderTypography(model));
  parts.push(renderLayout(model));
  parts.push(renderElevation(model));
  parts.push(renderShapes(model));
  parts.push(renderComponents(model));
  parts.push(renderDosDonts(model));
  // Extensies
  parts.push(renderBrandVoice(model));
  parts.push(renderImagery(model));
  parts.push(renderIconography(model));
  parts.push(renderBrandFoundation(model));
  return parts.filter((s) => s.length > 0).join('\n') + '\n';
}

// ─── Frontmatter ──────────────────────────────────────

function renderFrontmatter(model: DesignSystemModel): string {
  const lines: string[] = ['---'];
  lines.push(`version: alpha`);
  lines.push(`name: ${yamlString(model.meta.name)}`);
  if (model.meta.description) {
    lines.push(`description: ${yamlString(model.meta.description)}`);
  }

  // colors
  const colorEntries = COLOR_ORDER
    .filter((k) => model.colors[k])
    .map((k) => [k, model.colors[k]!.value] as const);
  if (colorEntries.length > 0) {
    lines.push('colors:');
    for (const [k, v] of colorEntries) {
      lines.push(`  ${k}: ${yamlString(v)}`);
    }
  }

  // typography
  const typoEntries = TYPE_ORDER
    .filter((k) => model.typography[k])
    .map((k) => [k, model.typography[k]!] as const);
  if (typoEntries.length > 0) {
    lines.push('typography:');
    for (const [k, tok] of typoEntries) {
      lines.push(`  ${k}:`);
      lines.push(`    fontFamily: ${yamlString(tok.fontFamily)}`);
      lines.push(`    fontSize: ${yamlString(tok.fontSize)}`);
      lines.push(`    fontWeight: ${tok.fontWeight}`);
      lines.push(`    lineHeight: ${yamlString(tok.lineHeight)}`);
      if (tok.letterSpacing) {
        lines.push(`    letterSpacing: ${yamlString(tok.letterSpacing)}`);
      }
    }
  }

  // rounded
  const roundedEntries = roundedScaleKeys()
    .filter((k) => model.rounded[k])
    .map((k) => [k, model.rounded[k]!.value] as const);
  if (roundedEntries.length > 0) {
    lines.push('rounded:');
    for (const [k, v] of roundedEntries) {
      lines.push(`  ${k}: ${v === 9999 ? '9999px' : `${v}px`}`);
    }
  }

  // spacing
  const spacingEntries = spacingScaleKeys()
    .filter((k) => model.spacing[k])
    .map((k) => [k, model.spacing[k]!.value] as const);
  if (spacingEntries.length > 0) {
    lines.push('spacing:');
    for (const [k, v] of spacingEntries) {
      lines.push(`  ${k}: ${v}px`);
    }
  }

  // components
  const compEntries = Object.entries(model.components).sort(([a], [b]) => a.localeCompare(b));
  if (compEntries.length > 0) {
    lines.push('components:');
    for (const [variant, tok] of compEntries) {
      lines.push(`  ${variant}:`);
      const propKeys = Object.keys(tok.props).sort();
      for (const propKey of propKeys) {
        lines.push(`    ${propKey}: ${yamlString(tok.props[propKey])}`);
      }
    }
  }

  lines.push('---');
  return lines.join('\n');
}

// ─── Body sections ────────────────────────────────────

function renderOverview(model: DesignSystemModel): string {
  const prose = model.prose.overview ?? model.meta.description ?? defaultOverview(model);
  return section('Overview', prose);
}

function defaultOverview(model: DesignSystemModel): string {
  return `This is the design system for ${model.meta.name}. Tokens above describe the brand's visual identity — use them consistently across all touchpoints.`;
}

function renderColors(model: DesignSystemModel): string {
  const lines: string[] = [];
  const ordered = COLOR_ORDER.filter((k) => model.colors[k]);
  if (ordered.length === 0 && !model.prose.colors) return '';
  for (const role of ordered) {
    const tok = model.colors[role]!;
    const src = tok.source ? ` — ${tok.source}` : '';
    lines.push(`- **${role} (${tok.value}):** ${describeColorRole(role)}${src}`);
  }
  if (model.prose.colors) {
    lines.push('');
    lines.push(model.prose.colors);
  }
  return section('Colors', lines.join('\n'));
}

function describeColorRole(role: SemanticColorRole): string {
  switch (role) {
    case 'primary': return 'Dominant brand colour, used for the single most important action on a screen.';
    case 'on-primary': return 'Text/icon colour placed on top of primary surfaces.';
    case 'primary-container': return 'Muted variant of primary for hover, backgrounds, and supporting surfaces.';
    case 'secondary': return 'Supporting brand colour for secondary actions and accents.';
    case 'on-secondary': return 'Text/icon colour on secondary surfaces.';
    case 'tertiary': return 'Tertiary accent for decorative moments and variety.';
    case 'on-tertiary': return 'Text/icon colour on tertiary surfaces.';
    case 'surface': return 'Default background colour for pages and cards.';
    case 'on-surface': return 'Primary body text colour on default surfaces.';
    case 'surface-variant': return 'Alternative background for panels and sections.';
    case 'outline': return 'Border colour for dividers and low-emphasis elements.';
    case 'error': return 'Indicates errors, destructive actions, or critical warnings.';
    case 'on-error': return 'Text/icon colour on error surfaces.';
    case 'success': return 'Indicates successful operations and positive states.';
    case 'warning': return 'Indicates caution and non-critical issues.';
    case 'info': return 'Indicates informational messages.';
  }
}

function renderTypography(model: DesignSystemModel): string {
  const lines: string[] = [];
  const roles = TYPE_ORDER.filter((k) => model.typography[k]);
  for (const role of roles) {
    const tok = model.typography[role]!;
    lines.push(`- **${role}:** ${tok.fontFamily} ${tok.fontSize} / ${tok.fontWeight} / line-height ${tok.lineHeight}`);
  }
  if (model.prose.typography) {
    lines.push('');
    lines.push(model.prose.typography);
  }
  return roles.length === 0 && !model.prose.typography
    ? ''
    : section('Typography', lines.join('\n'));
}

function renderLayout(model: DesignSystemModel): string {
  const lines: string[] = [];
  const spacingKeys = spacingScaleKeys().filter((k) => model.spacing[k]);
  if (spacingKeys.length > 0) {
    lines.push('Spacing scale:');
    for (const k of spacingKeys) {
      lines.push(`- \`spacing.${k}\` = ${model.spacing[k]!.value}px`);
    }
  }
  if (model.prose.layout) {
    if (lines.length > 0) lines.push('');
    lines.push(model.prose.layout);
  }
  return lines.length === 0 ? '' : section('Layout', lines.join('\n'));
}

function renderElevation(model: DesignSystemModel): string {
  const lines: string[] = [];
  const levels = elevationLevelKeys().filter((k) => model.elevation[k]);
  if (levels.length === 0 && !model.prose.elevation) return '';
  if (levels.length === 0) {
    lines.push('This brand uses borders and tonal layers for hierarchy rather than shadows.');
  } else {
    for (const k of levels) {
      lines.push(`- **Level ${k}:** ${model.elevation[k]!.value}`);
    }
  }
  if (model.prose.elevation) {
    lines.push('');
    lines.push(model.prose.elevation);
  }
  return section('Elevation & Depth', lines.join('\n'));
}

function renderShapes(model: DesignSystemModel): string {
  const lines: string[] = [];
  const roundedKeys = roundedScaleKeys().filter((k) => model.rounded[k]);
  if (roundedKeys.length > 0) {
    lines.push('Corner radius scale:');
    for (const k of roundedKeys) {
      const v = model.rounded[k]!.value;
      lines.push(`- \`rounded.${k}\` = ${v === 9999 ? 'fully rounded' : `${v}px`}`);
    }
  }
  if (model.prose.shapes) {
    if (lines.length > 0) lines.push('');
    lines.push(model.prose.shapes);
  }
  return lines.length === 0 ? '' : section('Shapes', lines.join('\n'));
}

function renderComponents(model: DesignSystemModel): string {
  const variants = Object.keys(model.components).sort();
  if (variants.length === 0 && !model.prose.components) return '';
  const lines: string[] = [];
  for (const variant of variants) {
    const tok = model.components[variant];
    const propStr = Object.entries(tok.props)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    lines.push(`- **${variant}:** ${propStr}`);
  }
  if (model.prose.components) {
    lines.push('');
    lines.push(model.prose.components);
  }
  return section('Components', lines.join('\n'));
}

function renderDosDonts(model: DesignSystemModel): string {
  const items = model.prose.dosDonts ?? [];
  if (items.length === 0) return '';
  return section("Do's and Don'ts", items.map((i) => `- ${i}`).join('\n'));
}

// ─── Extensies ────────────────────────────────────────

function renderBrandVoice(model: DesignSystemModel): string {
  const v = model.extensions.voice;
  if (!v) return '';
  const lines: string[] = [];
  if (v.principles.length > 0) {
    lines.push('**Principles**');
    for (const p of v.principles) lines.push(`- ${p}`);
  }
  if (v.writingGuidelines.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Writing guidelines**');
    for (const g of v.writingGuidelines) lines.push(`- ${g}`);
  }
  if (v.doSayPhrases.length > 0 || v.dontSayPhrases.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Phrases**');
    for (const p of v.doSayPhrases) lines.push(`- Do say: "${p}"`);
    for (const p of v.dontSayPhrases) lines.push(`- Don't say: "${p}"`);
  }
  return section('Brand Voice', lines.join('\n'));
}

function renderImagery(model: DesignSystemModel): string {
  const i = model.extensions.imagery;
  if (!i) return '';
  const lines: string[] = [];
  if (i.photographyStyle) lines.push(`Mood: ${i.photographyStyle}`);
  if (i.photographyGuidelines.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Photography**');
    for (const g of i.photographyGuidelines) lines.push(`- ${g}`);
  }
  if (i.illustrationGuidelines.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Illustration**');
    for (const g of i.illustrationGuidelines) lines.push(`- ${g}`);
  }
  if (i.donts.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push("**Don'ts**");
    for (const d of i.donts) lines.push(`- ${d}`);
  }
  return section('Imagery', lines.join('\n'));
}

function renderIconography(model: DesignSystemModel): string {
  const i = model.extensions.iconography;
  if (!i) return '';
  const lines: string[] = [];
  if (i.style) lines.push(`- Style: ${i.style}`);
  if (i.strokeWeight) lines.push(`- Stroke weight: ${i.strokeWeight}`);
  if (i.cornerRadius) lines.push(`- Corner radius: ${i.cornerRadius}`);
  if (i.sizing) lines.push(`- Sizing: ${i.sizing}`);
  if (i.colorUsage) lines.push(`- Colour usage: ${i.colorUsage}`);
  return lines.length === 0 ? '' : section('Iconography', lines.join('\n'));
}

function renderBrandFoundation(model: DesignSystemModel): string {
  const bf = model.extensions.brandFoundation;
  if (!bf) return '';
  const lines: string[] = [];
  if (bf.assets.length > 0) {
    lines.push('**Brand assets**');
    for (const a of bf.assets) {
      const hasSummary = a.summary && a.summary.length > 0;
      lines.push(`- **${a.name}${a.frameworkType ? ` (${a.frameworkType})` : ''}:** ${hasSummary ? a.summary : '—'}`);
    }
  }
  if (bf.personas.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Personas**');
    for (const p of bf.personas) {
      const traits = p.keyTraits.length > 0 ? ` (${p.keyTraits.join(', ')})` : '';
      lines.push(`- **${p.name}${p.tagline ? ` — ${p.tagline}` : ''}${traits}**${p.primaryGoal ? `: ${p.primaryGoal}` : ''}`);
    }
  }
  if (bf.competitors.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Competitive landscape**');
    for (const c of bf.competitors) {
      const diffs = c.differentiators.length > 0 ? ` — differentiators: ${c.differentiators.slice(0, 3).join(', ')}` : '';
      lines.push(`- **${c.name} (${c.tier})${c.positioning ? `:** ${c.positioning}` : '**'}${diffs}`);
    }
  }
  return section('Brand Foundation', lines.join('\n'));
}

// ─── Helpers ──────────────────────────────────────────

function section(title: string, body: string): string {
  if (!body || body.trim().length === 0) return '';
  return `## ${title}\n\n${body}\n`;
}

/**
 * Quote een YAML-string veilig. DESIGN.md spec verwacht strings tussen
 * double quotes voor hex-colors en vrije tekst; bare tokens (keys, numbers)
 * blijven onquoted. We gebruiken double-quoted style consistent voor
 * string-values behalve pure ASCII zonder special chars — dan bare.
 */
function yamlString(value: string): string {
  if (/^[A-Za-z0-9_][A-Za-z0-9_\-]*$/.test(value) && !['true', 'false', 'null'].includes(value.toLowerCase())) {
    return value;
  }
  // Escape backslashes en double quotes
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
