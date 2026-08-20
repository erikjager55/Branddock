// =============================================================
// Smoke: changelog-nummering
//
// Op 2026-08-20 pakten twee parallelle sessies dezelfde nummers: #513, #514
// en #515 bestonden elk twee keer, en een rebase liet een `### 514.`-header
// zonder body achter. Git zag geen conflict, want beide sessies voegden op
// nét andere plekken in. Het formaat is de oorzaak: iedereen prikt bovenaan
// hetzelfde bestand een oplopend nummer.
//
// Deze bewaker maakt dat zichtbaar vóór de merge in plaats van erna.
// Draait zonder DB en zonder sleutels.
//
// Run: npx tsx scripts/smoke-tests/changelog-nummering.ts
// =============================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAD = join(process.cwd(), 'docs/changelog.md');
const tekst = readFileSync(PAD, 'utf8');

let failed = 0;
function assert(label: string, cond: boolean, detail = '') {
  if (cond) console.log(`  OK   ${label}`);
  else { failed++; console.error(`  FAIL ${label}${detail ? ` -- ${detail}` : ''}`); }
}

interface Entry { nummer: number; titel: string; regel: number; body: string }

const entries: Entry[] = [];
const regels = tekst.split('\n');
for (let i = 0; i < regels.length; i++) {
  const m = /^### (\d+)\.\s*(.*)$/.exec(regels[i]);
  if (!m) continue;
  let j = i + 1;
  const body: string[] = [];
  while (j < regels.length && !/^### \d+\./.test(regels[j]) && !/^## /.test(regels[j])) body.push(regels[j++]);
  entries.push({ nummer: Number(m[1]), titel: m[2], regel: i + 1, body: body.join('\n').trim() });
}

console.log(`Gevonden: ${entries.length} genummerde entries\n`);
assert('er zijn entries gevonden', entries.length > 100, `${entries.length}`);

console.log('\n1. Elk nummer komt hoogstens één keer voor');
const perNummer = new Map<number, Entry[]>();
for (const e of entries) perNummer.set(e.nummer, [...(perNummer.get(e.nummer) ?? []), e]);
// #234 is een bekend, historisch duplicaat uit mei 2026 (twee losse features,
// beide genummerd 234). Bewust uitgezonderd: hernummeren zou verwijzingen in
// oude task-files breken zonder iets op te lossen.
const BEKENDE_DUPLICATEN = new Set([234]);
const dubbel = [...perNummer.entries()]
  .filter(([n, es]) => es.length > 1 && !BEKENDE_DUPLICATEN.has(n));
assert('geen onverwachte dubbele nummers', dubbel.length === 0,
  dubbel.map(([n, es]) => `#${n} op regels ${es.map((e) => e.regel).join(' en ')}`).join('; '));

console.log('\n2. Geen entry zonder body (weesheader uit een rebase)');
const wezen = entries.filter((e) => e.body.length === 0);
assert('elke entry heeft inhoud', wezen.length === 0,
  wezen.map((e) => `#${e.nummer} (regel ${e.regel})`).join(', '));

console.log('\n3. De nieuwste entries staan bovenaan en lopen af');
const top = entries.slice(0, 12).map((e) => e.nummer);
const stijgingen = top.map((n, i) => (i > 0 && n > top[i - 1] ? `#${top[i - 1]} gevolgd door #${n}` : '')).filter(Boolean);
assert('bovenste 12 lopen aflopend', stijgingen.length === 0, stijgingen.join('; '));

console.log('\n4. MUTATIETEST — de detector moet een duplicaat en een wees kunnen zien');
function tel(t: string) {
  const es: { nummer: number; body: string }[] = [];
  const rs = t.split('\n');
  for (let i = 0; i < rs.length; i++) {
    const m = /^### (\d+)\.\s*(.*)$/.exec(rs[i]);
    if (!m) continue;
    let j = i + 1; const b: string[] = [];
    while (j < rs.length && !/^### \d+\./.test(rs[j]) && !/^## /.test(rs[j])) b.push(rs[j++]);
    es.push({ nummer: Number(m[1]), body: b.join('\n').trim() });
  }
  const per = new Map<number, number>();
  for (const e of es) per.set(e.nummer, (per.get(e.nummer) ?? 0) + 1);
  return { dubbel: [...per.values()].filter((c) => c > 1).length, wezen: es.filter((e) => e.body.length === 0).length };
}
const kapot = '### 99. Een\n\ntekst\n\n### 99. Twee\n\ntekst\n\n### 98. Wees\n### 97. Volgende\n\ntekst\n';
const m1 = tel(kapot);
assert('detector ziet het duplicaat', m1.dubbel === 1, `zag ${m1.dubbel}`);
assert('detector ziet de weesheader', m1.wezen === 1, `zag ${m1.wezen}`);
const heel = '### 99. Een\n\ntekst\n\n### 98. Twee\n\ntekst\n';
const m2 = tel(heel);
assert('detector meldt niets op een gezond bestand', m2.dubbel === 0 && m2.wezen === 0);

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — 8 checks, ${failed} gefaald`);
process.exit(failed === 0 ? 0 : 1);
