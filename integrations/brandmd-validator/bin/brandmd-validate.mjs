#!/usr/bin/env node
// =============================================================
// brandmd-validate — validator voor BRAND.md-bestanden
//
// Valideert tegen de upstream-spec (github.com/caiopizzol/brand.md,
// spec/brand-md.md). Kent specversies 0.2.0 en 0.3.0 en volgt de
// resolutieregels uit de spec:
//   - `specVersion` afwezig → valideren als 0.2.0 (het enige
//     impliciete geval)
//   - bekend → die versie; onbekend-tussenin → dichtstbijzijnde
//     eronder; onbekend-hoger in major 0 → nieuwste + melding;
//     onbekend-lager of vreemde major → unsupported; misvormd
//     (`0.3`, `v0.3.0`, leading zeros) → fout, nooit stil terugvallen
//
// Vereist per versie:
//   0.2.0 — frontmatter name/tagline/version(int)/language; H2-lagen
//           Strategy/Voice/Visual; H3's: Strategy > Overview,
//           Positioning, Personality, Promise, Guardrails; Voice >
//           Identity, Tagline & Slogans, Message Pillars, Phrases,
//           Tonal Rules; Visual > Colors (alias Core Colors),
//           Typography (alias Typefaces)
//   0.3.0 — 0.2.0 plus Strategy > Audience en References &
//           Anti-References, en Visual > Art Direction (alias Style)
//
// Daarnaast rapporteert (nooit als fout) het Branddock full profile:
// locales/validation/provenance-frontmatter, persona-subentries,
// Products & Services / Channel Tones. `## Market Context` geeft een
// waarschuwing — dat is het privé-profiel.
//
// Bewust dependency-vrij (geen yaml-parser): minimale regelparser
// voor precies de velden die de spec vereist. Exit 0 = valide;
// exit 1 = spec-schendingen; exit 2 = usage-fout.
// =============================================================

import { readFileSync } from 'node:fs';

const KNOWN_VERSIONS = ['0.2.0', '0.3.0'];

// Per laag de verplichte H3's; [naam, ...aliassen] — consumers must accept both.
const REQUIRED_02 = {
  Strategy: [['Overview'], ['Positioning'], ['Personality'], ['Promise'], ['Guardrails']],
  Voice: [['Identity'], ['Tagline & Slogans'], ['Message Pillars'], ['Phrases'], ['Tonal Rules']],
  Visual: [['Colors', 'Core Colors'], ['Typography', 'Typefaces']],
};
const REQUIRED_03 = {
  Strategy: [
    ['Overview'], ['Audience'], ['Positioning'], ['Personality'],
    ['References & Anti-References'], ['Promise'], ['Guardrails'],
  ],
  Voice: REQUIRED_02.Voice,
  Visual: [
    ['Core Colors', 'Colors'], ['Typefaces', 'Typography'], ['Art Direction', 'Style'],
  ],
};

const FULL_FRONTMATTER = ['locales', 'validation', 'provenance'];
const FULL_SECTIONS = ['Products & Services', 'Channel Tones'];
const PRIVATE_SECTION = 'Market Context';

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const keys = new Map();
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (kv) keys.set(kv[1], kv[2]);
  }
  return { raw: m[1], keys, body: text.slice(m[0].length) };
}

function unquote(v) {
  return (v ?? '').replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

/** H2-lagen met hun H3-subsecties. */
function parseSections(body) {
  const layers = new Map();
  let current = null;
  for (const line of body.split(/\r?\n/)) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    const h3 = line.match(/^###\s+(.+?)\s*$/);
    if (h2 && !line.startsWith('####')) {
      current = h2[1];
      if (!layers.has(current)) layers.set(current, []);
    } else if (h3 && current) {
      layers.get(current).push(h3[1]);
    }
  }
  return layers;
}

/**
 * specVersion-resolutie per de spec-tabel. Retourneert
 * { target, error?, note? } — target is de versie om tegen te valideren
 * of null bij unsupported/misvormd.
 */
function resolveSpecVersion(raw) {
  if (raw === undefined || raw === '') {
    return { target: '0.2.0' };
  }
  const value = unquote(raw);
  const m = value.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  if (!m) {
    return { target: null, error: `Malformed \`specVersion\` "${value}" — must be exact MAJOR.MINOR.PATCH (e.g. "0.3.0"). Never silently treated as 0.2.` };
  }
  if (KNOWN_VERSIONS.includes(value)) return { target: value };
  const [major] = value.split('.').map(Number);
  const knownMajors = new Set(KNOWN_VERSIONS.map((v) => Number(v.split('.')[0])));
  if (!knownMajors.has(major)) {
    return { target: null, error: `Unsupported \`specVersion\` major in "${value}" — this validator knows ${KNOWN_VERSIONS.join(', ')}.` };
  }
  const cmp = (a, b) => {
    const [a1, a2, a3] = a.split('.').map(Number);
    const [b1, b2, b3] = b.split('.').map(Number);
    return a1 - b1 || a2 - b2 || a3 - b3;
  };
  const sameMajor = KNOWN_VERSIONS.filter((v) => Number(v.split('.')[0]) === major);
  const below = sameMajor.filter((v) => cmp(v, value) < 0).sort(cmp);
  const newest = sameMajor.sort(cmp).at(-1);
  if (cmp(value, newest) > 0) {
    return { target: newest, note: `File targets spec ${value}, newer than this validator knows — validated against ${newest}.` };
  }
  if (below.length > 0) {
    return { target: below.at(-1), note: `Unknown spec ${value} — validated against closest known version below (${below.at(-1)}).` };
  }
  return { target: null, error: `Unsupported \`specVersion\` "${value}" — lower than every version this validator knows (${KNOWN_VERSIONS.join(', ')}).` };
}

export function validate(text) {
  const errors = [];
  const warnings = [];
  const info = [];

  const fm = parseFrontmatter(text);
  if (!fm) {
    errors.push('Missing YAML frontmatter (--- ... --- at the top of the file).');
    return { errors, warnings, info, fullProfile: false, specVersion: null };
  }

  // ── Frontmatter (spec: name/tagline/version/language verplicht) ──
  for (const required of ['name', 'tagline', 'version', 'language']) {
    if (!fm.keys.has(required) || fm.keys.get(required) === '') {
      errors.push(`Frontmatter is missing required field \`${required}\`.`);
    }
  }
  const versionRaw = unquote(fm.keys.get('version'));
  if (versionRaw && !/^[1-9]\d*$/.test(versionRaw)) {
    errors.push(`Frontmatter \`version\` must be an integer starting at 1 (the brand revision), got "${versionRaw}". The spec version belongs in \`specVersion\`.`);
  }

  const resolved = resolveSpecVersion(fm.keys.get('specVersion'));
  if (resolved.error) {
    errors.push(resolved.error);
    return { errors, warnings, info, fullProfile: false, specVersion: null };
  }
  if (resolved.note) info.push(resolved.note);
  const target = resolved.target;
  const required = target === '0.3.0' ? REQUIRED_03 : REQUIRED_02;

  // ── Lagen + verplichte subsecties ──
  const layers = parseSections(fm.body);
  for (const [layer, subsections] of Object.entries(required)) {
    if (!layers.has(layer)) {
      errors.push(`Missing required layer \`## ${layer}\`.`);
      continue;
    }
    const present = layers.get(layer);
    for (const nameAndAliases of subsections) {
      if (!nameAndAliases.some((n) => present.includes(n))) {
        errors.push(`Missing required section \`### ${nameAndAliases[0]}\` under \`## ${layer}\`${nameAndAliases.length > 1 ? ` (alias: ${nameAndAliases.slice(1).join(', ')})` : ''}.`);
      }
    }
  }

  // ── Full profile (additief — rapporteren, nooit fouten) ──
  const allH2 = [...layers.keys()];
  const fullSectionsFound = FULL_SECTIONS.filter((s) => allH2.includes(s));
  const fullFrontmatterFound = FULL_FRONTMATTER.filter((k) => fm.raw.match(new RegExp(`^${k}:`, 'm')));
  const fullProfile = fullSectionsFound.length > 0 || fullFrontmatterFound.length > 0;
  if (fullProfile) {
    info.push(
      `Full profile detected — sections: ${fullSectionsFound.join(', ') || '(none)'}; frontmatter: ${fullFrontmatterFound.join(', ') || '(none)'}.`,
    );
  }

  if (allH2.includes(PRIVATE_SECTION)) {
    warnings.push(
      `This file contains \`## ${PRIVATE_SECTION}\` — that is the PRIVATE extended profile. Do not share this file.`,
    );
  }

  const unvalidated = (text.match(/status:\s*unvalidated/g) ?? []).length;
  if (unvalidated > 0) {
    info.push(`${unvalidated} section(s) marked unvalidated — complete them at the file's canonical URL.`);
  }
  const notDefined = (text.match(/_Not yet defined\._/g) ?? []).length;
  if (notDefined > 0) {
    info.push(`${notDefined} required section(s) are explicitly empty ("Not yet defined") — honest, but worth completing.`);
  }

  return { errors, warnings, info, fullProfile, specVersion: target };
}

// ─── Self-test (geen fixtures op disk nodig) ─────────────────────────

function selfTest() {
  const valid03 = `---
name: Acme
tagline: "Build faster, break nothing"
specVersion: "0.3.0"
version: 1
language: en
provenance:
  generated_by: Branddock
---

# Acme

## Strategy

### Overview

x

### Audience

x

### Positioning

x

### Personality

x

### References & Anti-References

_Not yet defined._

### Promise

x

### Guardrails

#### Don't

- rule

## Voice

### Identity

x

### Tagline & Slogans

- Primary: "Build faster, break nothing"

### Message Pillars

_Not yet defined._

### Phrases

- "x"

### Tonal Rules

- rule

## Visual

### Core Colors

- **Primary** \`#111111\`

### Typefaces

- **Inter** — used for body. Licensing: not verified.

### Art Direction

x
`;
  // 0.2-bestand: geen specVersion, 0.2-aliassen (Colors/Typography), geen
  // Audience/References/Art Direction — moet als 0.2.0 valideren.
  const valid02 = `---
name: Acme
tagline: "Build faster"
version: 2
language: en
---

# Acme

## Strategy

### Overview

x

### Positioning

x

### Personality

x

### Promise

x

### Guardrails

x

## Voice

### Identity

x

### Tagline & Slogans

x

### Message Pillars

x

### Phrases

x

### Tonal Rules

x

## Visual

### Colors

x

### Typography

x
`;
  const invalid = `# Just a readme\n\n## Voice\n`;
  const badVersion = valid03.replace('version: 1', 'version: "0.2"');
  const malformed = valid03.replace('specVersion: "0.3.0"', 'specVersion: "0.3"');

  const v1 = validate(valid03);
  if (v1.errors.length !== 0) throw new Error(`self-test: valid 0.3 file rejected: ${v1.errors.join('; ')}`);
  if (v1.specVersion !== '0.3.0') throw new Error('self-test: 0.3 not resolved');
  if (!v1.fullProfile) throw new Error('self-test: full profile not detected');

  const v2 = validate(valid02);
  if (v2.errors.length !== 0) throw new Error(`self-test: valid 0.2 file rejected: ${v2.errors.join('; ')}`);
  if (v2.specVersion !== '0.2.0') throw new Error('self-test: absent specVersion not resolved to 0.2.0');

  const v3 = validate(invalid);
  if (v3.errors.length === 0) throw new Error('self-test: invalid file accepted');

  const v4 = validate(badVersion);
  if (!v4.errors.some((e) => e.includes('must be an integer'))) throw new Error('self-test: string version accepted');

  const v5 = validate(malformed);
  if (!v5.errors.some((e) => e.includes('Malformed'))) throw new Error('self-test: malformed specVersion accepted');

  console.log('✓ self-test passed (0.3 valid, 0.2 valid, invalid rejected, version-type + malformed specVersion caught)');
}

// ─── CLI ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  selfTest();
  process.exit(0);
}
if (args.length === 0 || args.includes('--help')) {
  console.log('Usage: brandmd-validate <BRAND.md>\n\nValidates a BRAND.md file against the open spec (0.2.0 / 0.3.0,\ngithub.com/caiopizzol/brand.md) and reports Branddock full-profile\nextensions.');
  process.exit(args.length === 0 ? 2 : 0);
}

let text;
try {
  text = readFileSync(args[0], 'utf8');
} catch {
  console.error(`✗ Cannot read file: ${args[0]}`);
  process.exit(2);
}

const { errors, warnings, info, fullProfile, specVersion } = validate(text);
for (const e of errors) console.error(`✗ ${e}`);
for (const w of warnings) console.warn(`⚠ ${w}`);
for (const i of info) console.log(`ℹ ${i}`);

if (errors.length === 0) {
  console.log(`✓ Valid BRAND.md (spec ${specVersion}${fullProfile ? ' + full profile' : ''}).`);
  console.log('  Tip: generate one for any site → https://branddock.app/brandmd');
  process.exit(0);
} else {
  console.error(`\n${errors.length} error(s) — this file does not validate against the BRAND.md spec.`);
  process.exit(1);
}
