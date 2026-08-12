#!/usr/bin/env node
// =============================================================
// brandmd-validate — validator voor brand.md-bestanden
//
// Valideert twee lagen:
//   CORE  — de open brand.md-standaard (v0.2): YAML-frontmatter met
//           minimaal `name` + `version` + `language`, en de secties
//           Strategy / Voice / Visual.
//   FULL  — het Branddock full profile (additief, optioneel):
//           locales / validation / provenance in de frontmatter en
//           de secties Audience / Products & Services / Channel
//           Tones / Guardrails. Ontbreken = geen fout, wel rapport.
//
// Bewust dependency-vrij (geen yaml-parser): we valideren alleen de
// velden die de spec vereist, met een minimale regelparser. Exit 0 =
// core-valide; exit 1 = core-schendingen; exit 2 = usage-fout.
// =============================================================

import { readFileSync } from 'node:fs';

const CORE_SECTIONS = ['Strategy', 'Voice', 'Visual'];
const FULL_SECTIONS = ['Audience', 'Products & Services', 'Channel Tones', 'Guardrails'];
const FULL_FRONTMATTER = ['locales', 'validation', 'provenance'];
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

function headings(body) {
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
}

export function validate(text) {
  const errors = [];
  const warnings = [];
  const info = [];

  const fm = parseFrontmatter(text);
  if (!fm) {
    errors.push('Missing YAML frontmatter (--- ... --- at the top of the file).');
    return { errors, warnings, info, fullProfile: false };
  }

  for (const required of ['name', 'version', 'language']) {
    if (!fm.keys.has(required) || fm.keys.get(required) === '') {
      errors.push(`Frontmatter is missing required field \`${required}\`.`);
    }
  }
  const version = (fm.keys.get('version') ?? '').replace(/^"|"$/g, '');
  if (version && !/^0\.2(\.\d+)?$/.test(version)) {
    warnings.push(`Version "${version}" — this validator checks the v0.2 core; newer/older versions may differ.`);
  }

  const found = headings(fm.body);
  for (const section of CORE_SECTIONS) {
    if (!found.includes(section)) {
      errors.push(`Missing core section \`## ${section}\`.`);
    }
  }

  const fullSectionsFound = FULL_SECTIONS.filter((s) => found.includes(s));
  const fullFrontmatterFound = FULL_FRONTMATTER.filter((k) => fm.raw.match(new RegExp(`^${k}:`, 'm')));
  const fullProfile = fullSectionsFound.length > 0 || fullFrontmatterFound.length > 0;
  if (fullProfile) {
    info.push(
      `Full profile detected — sections: ${fullSectionsFound.join(', ') || '(none)'}; frontmatter: ${fullFrontmatterFound.join(', ') || '(none)'}.`,
    );
    const missing = FULL_SECTIONS.filter((s) => !found.includes(s));
    if (missing.length > 0) {
      info.push(`Optional full-profile sections not present: ${missing.join(', ')}.`);
    }
  }

  if (found.includes(PRIVATE_SECTION)) {
    warnings.push(
      `This file contains \`## ${PRIVATE_SECTION}\` — that is the PRIVATE extended profile. Do not share this file.`,
    );
  }

  const unvalidated = (text.match(/status:\s*unvalidated/g) ?? []).length;
  if (unvalidated > 0) {
    info.push(`${unvalidated} section(s) marked unvalidated — complete them at the file's canonical URL.`);
  }

  return { errors, warnings, info, fullProfile };
}

// ─── Self-test (geen fixtures op disk nodig) ─────────────────────────

function selfTest() {
  const valid = `---\nname: Acme\nversion: "0.2"\nlanguage: en\nprovenance:\n  generated_by: Branddock\n---\n\n# Acme\n\n## Strategy\n\nx\n\n## Voice\n\nx\n\n## Visual\n\nx\n\n## Guardrails\n\n- rule\n`;
  const invalid = `# Just a readme\n\n## Voice\n`;
  const v1 = validate(valid);
  const v2 = validate(invalid);
  if (v1.errors.length !== 0) throw new Error(`self-test: valid file rejected: ${v1.errors.join('; ')}`);
  if (!v1.fullProfile) throw new Error('self-test: full profile not detected');
  if (v2.errors.length === 0) throw new Error('self-test: invalid file accepted');
  console.log('✓ self-test passed');
}

// ─── CLI ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  selfTest();
  process.exit(0);
}
if (args.length === 0 || args.includes('--help')) {
  console.log('Usage: brandmd-validate <file.md>\n\nValidates a brand.md file against the open v0.2 core spec\nand reports Branddock full-profile extensions.');
  process.exit(args.length === 0 ? 2 : 0);
}

let text;
try {
  text = readFileSync(args[0], 'utf8');
} catch {
  console.error(`✗ Cannot read file: ${args[0]}`);
  process.exit(2);
}

const { errors, warnings, info, fullProfile } = validate(text);
for (const e of errors) console.error(`✗ ${e}`);
for (const w of warnings) console.warn(`⚠ ${w}`);
for (const i of info) console.log(`ℹ ${i}`);

if (errors.length === 0) {
  console.log(`✓ Valid brand.md (v0.2 core${fullProfile ? ' + full profile' : ''}).`);
  console.log('  Tip: generate one for any site → https://branddock.app/brandmd');
  process.exit(0);
} else {
  console.error(`\n${errors.length} error(s) — this file does not validate against the brand.md v0.2 core.`);
  process.exit(1);
}
