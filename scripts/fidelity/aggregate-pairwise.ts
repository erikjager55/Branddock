/**
 * scripts/fidelity/aggregate-pairwise.ts
 *
 * Aggregeert klant-pairwise responses naar drift-percentage of AI-vs-mens score.
 *
 * Verwacht: ingevulde eval-form.md bestanden in
 *   research/fidelity-week1/scores/humans/pairwise/{evaluator-id}.md
 *
 * Naming convention voor evaluator-id:
 *   {merk-slug}-{evaluator-naam-of-nummer}
 *   bv. wra-juristen-1, wra-juristen-2, linfi-1, better-brands-1
 *
 * Per merk verschilt de interpretatie van de keuze:
 *   - DRIFT modus (WRA, Linfi): klant kiest tussen onze A en onze B → drift A→B%
 *   - AI_VS_HUMAN modus (BB): klant kiest tussen onze AI en menselijk artikel
 *
 * Output: research/fidelity-week1/reports/pairwise-aggregate.md
 *
 * Run:
 *   npx tsx scripts/fidelity/aggregate-pairwise.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// ─── Env loading ──────────────────────

const envPath = resolve(process.cwd(), '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
} catch {
  // ignore
}

// ─── Types ────────────────────────────

type PresentedKind = 'A_OURS' | 'B_OURS' | 'HUMAN';
type TestMode = 'DRIFT' | 'AI_VS_HUMAN';
type ContentType = 'case-study' | 'thought-leadership';

interface KeyMappingEntry {
  brandSlug: string;
  contentType: ContentType;
  testMode: TestMode;
  presented: {
    versieA: { source: string; kind: PresentedKind };
    versieB: { source: string; kind: PresentedKind };
  };
  pairLabel: string;
}

interface PairwiseResponse {
  evaluatorId: string;
  brandSlug: string;
  contentType: ContentType;
  testMode: TestMode;
  presentedChoice: 'A' | 'B' | 'NO_PREFERENCE';
  /** Wat de klant koos in onze interne notatie */
  resolvedKind: PresentedKind | 'NO_PREFERENCE';
  reasoning: string;
}

// ─── Parser ────────────────────────────

function parseEvalForm(content: string, evaluatorId: string, brandSlug: string): Array<{
  contentType: ContentType;
  presentedChoice: 'A' | 'B' | 'NO_PREFERENCE';
  reasoning: string;
}> {
  const out: Array<{ contentType: ContentType; presentedChoice: 'A' | 'B' | 'NO_PREFERENCE'; reasoning: string }> = [];

  const sections = content.split(/##\s*Vergelijking\s*(\d+)/i);
  const types: ContentType[] = ['case-study', 'thought-leadership'];

  for (let i = 1; i < sections.length; i += 2) {
    const sectionNumStr = sections[i];
    const body = sections[i + 1] ?? '';
    const sectionIdx = parseInt(sectionNumStr, 10);
    if (sectionIdx < 1 || sectionIdx > types.length) continue;
    const contentType = types[sectionIdx - 1];

    const isChecked = (label: RegExp) =>
      new RegExp(`-\\s*\\[\\s*[xX✓✔]\\s*\\][^\\n]*${label.source}`, 'i').test(body);

    let presentedChoice: 'A' | 'B' | 'NO_PREFERENCE' | null = null;
    if (isChecked(/Geen\s*voorkeur/)) presentedChoice = 'NO_PREFERENCE';
    else if (isChecked(/Versie\s*A/)) presentedChoice = 'A';
    else if (isChecked(/Versie\s*B/)) presentedChoice = 'B';

    if (presentedChoice === null) {
      console.warn(`  ⚠ ${evaluatorId} / ${contentType}: no checkbox marked — skipped`);
      continue;
    }

    const reasoningMatch = body.match(/Wat maakt het verschil\?[^\n]*\n+>?\s*([^\n_]+)/i);
    const reasoning = reasoningMatch?.[1]?.trim() ?? '';

    out.push({ contentType, presentedChoice, reasoning: reasoning || '(geen toelichting)' });
  }
  return out;
}

// ─── Resolve via key-mapping ──────────

function resolve_(
  parsed: ReturnType<typeof parseEvalForm>[number],
  evaluatorId: string,
  brandSlug: string,
  mapping: KeyMappingEntry[],
): PairwiseResponse {
  const m = mapping.find((x) => x.brandSlug === brandSlug && x.contentType === parsed.contentType);
  if (!m) {
    console.warn(`  ⚠ No mapping for ${brandSlug}/${parsed.contentType}`);
    return {
      evaluatorId,
      brandSlug,
      contentType: parsed.contentType,
      testMode: 'DRIFT',
      presentedChoice: parsed.presentedChoice,
      resolvedKind: parsed.presentedChoice === 'NO_PREFERENCE' ? 'NO_PREFERENCE' : 'A_OURS',
      reasoning: parsed.reasoning,
    };
  }

  let resolvedKind: PresentedKind | 'NO_PREFERENCE';
  if (parsed.presentedChoice === 'NO_PREFERENCE') {
    resolvedKind = 'NO_PREFERENCE';
  } else if (parsed.presentedChoice === 'A') {
    resolvedKind = m.presented.versieA.kind;
  } else {
    resolvedKind = m.presented.versieB.kind;
  }

  return {
    evaluatorId,
    brandSlug,
    contentType: parsed.contentType,
    testMode: m.testMode,
    presentedChoice: parsed.presentedChoice,
    resolvedKind,
    reasoning: parsed.reasoning,
  };
}

// ─── Aggregation ─────────────────────

interface DriftStats {
  A_OURS: number;
  B_OURS: number;
  NO_PREFERENCE: number;
  total: number;
}

interface AiVsHumanStats {
  A_OURS: number; // onze AI
  HUMAN: number;
  NO_PREFERENCE: number;
  total: number;
}

function aggregate(responses: PairwiseResponse[]) {
  const driftPerBrand: Record<string, DriftStats> = {};
  const aiVsHumanPerBrand: Record<string, AiVsHumanStats> = {};

  for (const r of responses) {
    if (r.testMode === 'DRIFT') {
      if (!driftPerBrand[r.brandSlug])
        driftPerBrand[r.brandSlug] = { A_OURS: 0, B_OURS: 0, NO_PREFERENCE: 0, total: 0 };
      const s = driftPerBrand[r.brandSlug];
      if (r.resolvedKind === 'A_OURS') s.A_OURS++;
      else if (r.resolvedKind === 'B_OURS') s.B_OURS++;
      else s.NO_PREFERENCE++;
      s.total++;
    } else {
      if (!aiVsHumanPerBrand[r.brandSlug])
        aiVsHumanPerBrand[r.brandSlug] = { A_OURS: 0, HUMAN: 0, NO_PREFERENCE: 0, total: 0 };
      const s = aiVsHumanPerBrand[r.brandSlug];
      if (r.resolvedKind === 'A_OURS') s.A_OURS++;
      else if (r.resolvedKind === 'HUMAN') s.HUMAN++;
      else s.NO_PREFERENCE++;
      s.total++;
    }
  }

  return { driftPerBrand, aiVsHumanPerBrand };
}

// ─── Report builder ─────────────────

function pct(n: number, total: number): string {
  return total > 0 ? `${Math.round((n / total) * 100)}%` : '—';
}

function buildReport(responses: PairwiseResponse[], agg: ReturnType<typeof aggregate>): string {
  const lines: string[] = [];
  lines.push('# F-VAL Drift-Meting — Klant-Pairwise Aggregaat');
  lines.push('');
  lines.push(`> Datum: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`> Bron: research/fidelity-week1/scores/humans/pairwise/`);
  lines.push(`> Aantal responses: ${responses.length} (${new Set(responses.map((r) => r.evaluatorId)).size} unieke evaluators)`);
  lines.push('');

  // ─── DRIFT modus (WRA, Linfi) ─

  const driftBrands = Object.keys(agg.driftPerBrand).sort();
  if (driftBrands.length > 0) {
    lines.push('## Drift-meting: huidige BVD vs gestructureerde BVD');
    lines.push('');
    lines.push('| Merk | n | A (huidige BVD) | B (gestructureerde BVD) | Geen voorkeur | Drift B−A |');
    lines.push('|---|---|---|---|---|---|');
    for (const brand of driftBrands) {
      const s = agg.driftPerBrand[brand];
      const drift = s.total > 0 ? ((s.B_OURS - s.A_OURS) / s.total) * 100 : 0;
      lines.push(
        `| ${brand} | ${s.total} | ${s.A_OURS} (${pct(s.A_OURS, s.total)}) | ${s.B_OURS} (${pct(s.B_OURS, s.total)}) | ${s.NO_PREFERENCE} | ${drift >= 0 ? '+' : ''}${drift.toFixed(0)}pp |`,
      );
    }
    lines.push('');

    // Overall drift
    const allDrift = driftBrands.reduce<DriftStats>(
      (acc, b) => {
        const s = agg.driftPerBrand[b];
        return {
          A_OURS: acc.A_OURS + s.A_OURS,
          B_OURS: acc.B_OURS + s.B_OURS,
          NO_PREFERENCE: acc.NO_PREFERENCE + s.NO_PREFERENCE,
          total: acc.total + s.total,
        };
      },
      { A_OURS: 0, B_OURS: 0, NO_PREFERENCE: 0, total: 0 },
    );
    const overallDrift = allDrift.total > 0 ? ((allDrift.B_OURS - allDrift.A_OURS) / allDrift.total) * 100 : 0;
    lines.push(`**Overall drift B−A**: ${overallDrift >= 0 ? '+' : ''}${overallDrift.toFixed(0)}pp (n=${allDrift.total})`);
    lines.push('');
    if (Math.abs(overallDrift) >= 30) lines.push(`Substantiële klant-voorkeur (${overallDrift > 0 ? 'B' : 'A'}) — duidelijk signaal.`);
    else if (Math.abs(overallDrift) >= 15) lines.push(`Lichte klant-voorkeur (${overallDrift > 0 ? 'B' : 'A'}) — meetbaar maar niet decisief.`);
    else lines.push(`Geen meetbare klant-voorkeur — A en B scoren gelijkwaardig.`);
    lines.push('');
  }

  // ─── AI_VS_HUMAN modus (BB) ─

  const aiVsHumanBrands = Object.keys(agg.aiVsHumanPerBrand).sort();
  if (aiVsHumanBrands.length > 0) {
    lines.push('## AI vs menselijk: kan onze AI tippen aan menselijk werk?');
    lines.push('');
    lines.push('| Merk | n | Onze AI gekozen | Mens gekozen | Geen voorkeur | AI-share |');
    lines.push('|---|---|---|---|---|---|');
    for (const brand of aiVsHumanBrands) {
      const s = agg.aiVsHumanPerBrand[brand];
      const aiShare = s.total > 0 ? (s.A_OURS / s.total) * 100 : 0;
      lines.push(
        `| ${brand} | ${s.total} | ${s.A_OURS} (${pct(s.A_OURS, s.total)}) | ${s.HUMAN} (${pct(s.HUMAN, s.total)}) | ${s.NO_PREFERENCE} | ${aiShare.toFixed(0)}% |`,
      );
    }
    lines.push('');
    lines.push('**Interpretatie van AI-share**:');
    lines.push('- ≥40%: onze AI is competitief met menselijk werk — sterke demo-belofte');
    lines.push('- 20-40%: AI is herkenbaar zwakker maar dichtbij — verbeterruimte zichtbaar');
    lines.push('- <20%: menselijk werk wordt duidelijk geprefereerd — AI niet demo-klaar');
    lines.push('');
  }

  // ─── Open comments ─

  lines.push('## Klant-toelichtingen (raw)');
  lines.push('');
  for (const r of responses) {
    if (r.reasoning && r.reasoning !== '(geen toelichting)') {
      const choiceLabel =
        r.resolvedKind === 'A_OURS'
          ? 'onze A'
          : r.resolvedKind === 'B_OURS'
            ? 'onze B'
            : r.resolvedKind === 'HUMAN'
              ? 'mens-artikel'
              : 'geen voorkeur';
      lines.push(`- **${r.evaluatorId}** / ${r.contentType} → koos **${choiceLabel}**:`);
      lines.push(`  > ${r.reasoning}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

// ─── Main ─────────────────────────

async function main() {
  const { PATHS } = await import('./config');

  const pairwiseDir = join(PATHS.outputRoot, 'scores', 'humans', 'pairwise');
  const mappingPath = join(PATHS.outputRoot, 'pairwise-package', 'key-mapping.json');

  if (!existsSync(mappingPath)) {
    console.error(`Key-mapping not found at ${mappingPath}. Run build-pairwise-package.ts first.`);
    process.exit(1);
  }

  const mapping: KeyMappingEntry[] = JSON.parse(readFileSync(mappingPath, 'utf8')).mapping;

  if (!existsSync(pairwiseDir)) {
    console.error(`No klant-responses found in ${pairwiseDir}.`);
    console.error(`Save ingevulde eval-form.md files there with naming pattern: {brand-slug}-{N}.md`);
    process.exit(1);
  }

  const files = readdirSync(pairwiseDir).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.error(`No .md responses in ${pairwiseDir}.`);
    process.exit(1);
  }

  console.log(`→ Found ${files.length} response files`);

  const allResponses: PairwiseResponse[] = [];
  for (const f of files) {
    const evaluatorId = f.replace('.md', '');
    const m = evaluatorId.match(/^([a-z-]+)-(\w+)$/);
    if (!m) {
      console.warn(`  ⚠ Cannot parse brand-slug from "${f}" — skipping`);
      continue;
    }
    const brandSlug = m[1];

    const content = readFileSync(join(pairwiseDir, f), 'utf8');
    const parsed = parseEvalForm(content, evaluatorId, brandSlug);
    const resolved = parsed.map((p) => resolve_(p, evaluatorId, brandSlug, mapping));
    allResponses.push(...resolved);

    console.log(`  ${f}: ${parsed.length} comparisons`);
    for (const r of resolved) {
      console.log(`    ${r.contentType} (${r.testMode}): klant koos "${r.presentedChoice}" → ${r.resolvedKind}`);
    }
  }

  const agg = aggregate(allResponses);

  const reportPath = join(PATHS.reports, 'pairwise-aggregate.md');
  mkdirSync(PATHS.reports, { recursive: true });
  writeFileSync(reportPath, buildReport(allResponses, agg), 'utf8');

  console.log('');
  console.log(`✓ Rapport: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
