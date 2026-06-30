/**
 * Smoke: UI-locale (per-user, app chrome) must stay STRICTLY SEPARATE from the
 * CONTENT-locale system (per-workspace/brand, AI output language).
 * See ADR docs/adr/2026-06-28-multilingual-i18n-and-multi-market-content.md.
 *
 * Run: npx tsx scripts/smoke-tests/ui-content-locale-separation.ts
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
let failures = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`PASS  ${name}`);
  } else {
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    failures += 1;
  }
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

// 1. The AI/content layer must never read the UI-locale axis.
const aiFiles = walk(join(ROOT, 'src/lib/ai'));
const offenders = aiFiles.filter((f) =>
  /\bAppearancePreference\b|ui-i18n|branddock-ui-locale/.test(readFileSync(f, 'utf8')),
);
check(
  'src/lib/ai/** does not reference the UI-locale layer',
  offenders.length === 0,
  offenders.map((f) => f.replace(ROOT + '/', '')).join(', '),
);

// 2. The UI-i18n module is namespaced away from the franc-min content-locale system.
check(
  'ui-i18n module exists and is separate from src/lib/i18n',
  existsSync(join(ROOT, 'src/lib/ui-i18n/config.ts')) && existsSync(join(ROOT, 'src/lib/i18n')),
);

// 3. No UI-i18n file may IMPORT the content-locale system (comment mentions are fine).
const uiI18nFiles = walk(join(ROOT, 'src/lib/ui-i18n'));
const crossImports = uiI18nFiles.filter((f) =>
  /^\s*import[^\n]*(locale-resolver|detect-brand-language|lib\/i18n\/)/m.test(readFileSync(f, 'utf8')),
);
check(
  'src/lib/ui-i18n/** does not import the content-locale system',
  crossImports.length === 0,
  crossImports.map((f) => f.replace(ROOT + '/', '')).join(', '),
);

if (failures > 0) {
  console.error(`\n${failures} separation check(s) failed`);
  process.exit(1);
}
console.log('\nUI/content locale separation OK');
