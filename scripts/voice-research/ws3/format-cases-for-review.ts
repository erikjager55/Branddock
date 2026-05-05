/**
 * WS3 — Format disagreement cases as a review-ready markdown document.
 *
 * Reads disagreement-result.json and emits a self-contained markdown file
 * that two raters can read end-to-end without referring back to JSON or
 * the corpus. Per protocol v0.4 §6.4 the kwalitatieve case inspection is
 * the PRIMARY signal — this document is the input artefact for that step.
 *
 * No DB access, no API calls — pure transform.
 *
 * Usage:
 *   tsx scripts/voice-research/ws3/format-cases-for-review.ts
 *
 * Output: scripts/voice-research/ws3/output/disagreement-cases-for-review.md
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

// ─── Constants ────────────────────────────────────────────

const SCRIPT_DIR = path.resolve(process.cwd(), 'scripts/voice-research/ws3');
const DEFAULT_INPUT = path.join(SCRIPT_DIR, 'output/disagreement-result.json');
const DEFAULT_OUTPUT = path.join(SCRIPT_DIR, 'output/disagreement-cases-for-review.md');

// ─── Input shape (subset we use) ─────────────────────────

interface DisagreementCase {
  item_id: string;
  workspace_slug: string;
  is_brand_anchor: boolean;
  content_type: string;
  title: string;
  word_count: number;
  voice_score: number;
  voice_score_normalized: number;
  voice_explanation: string;
  similarity_to_linfi_centroid: number;
  similarity_method: string;
  delta: number;
  delta_z_score: number;
  direction: string;
  content_snippet: string;
}

interface DisagreementFile {
  generated_at: string;
  protocol_version: string;
  protocol_commit: string;
  n_pairs: number;
  threshold_z: number;
  correlation: {
    pearson_r: number;
    spearman_rho: number;
    directional_label_spearman: string;
  };
  score_distribution: {
    voice_score: { unique_values: number; min: number; max: number; mean: number };
    similarity: { min: number; max: number; mean: number; stddev: number };
    delta_voice_minus_similarity: { mean: number; stddev: number };
  };
  disagreement_cases: DisagreementCase[];
}

// ─── Markdown builders ────────────────────────────────────

function fmtScore(score: number, max = 100): string {
  return `${score}/${max}`;
}

function fmtSim(sim: number): string {
  return sim.toFixed(4);
}

function fmtSigned(n: number, digits = 4): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}`;
}

function buildHeader(data: DisagreementFile): string {
  return `# WS3 Disagreement Cases — Voice Fingerprinting Review

> **Document type**: blind reviewer-input artefact
> **Protocol**: ${data.protocol_version} (commit \`${data.protocol_commit}\`) — see \`docs/voice-fingerprinting-ws2-protocol.md\` §6.4
> **Generated**: ${data.generated_at}
> **Cases**: ${data.disagreement_cases.length} of ${data.n_pairs} pieces flagged (\`|z(delta)| > ${data.threshold_z}\`)
> **Reviewer version**: 1.0 — concept

---
`;
}

function buildContextSection(data: DisagreementFile): string {
  const corr = data.correlation;
  const vs = data.score_distribution.voice_score;
  const sim = data.score_distribution.similarity;
  const delta = data.score_distribution.delta_voice_minus_similarity;

  return `## Context — what is this document?

Branddock onderzoekt of de productie quality-scorer Voice-dimensie en mStyleDistance
embedding-similarity verschillende informatie meten over brand voice. WS3 vergelijkt
beide scoring-mechanismen op ${data.n_pairs} bestaande long-form klantcontent stukken.

Per protocol v0.3 §6.4: de **kwalitatieve disagreement-case inspectie** door 2
onafhankelijke raters is het **primaire signaal** voor de F-VAL pijler 1 beslissing
(of we mStyleDistance als aanvullende fidelity-meter inbouwen). Correlation-statistieken
zijn secundair en directional, niet threshold-based.

### Pool overview

- **n = ${data.n_pairs}** long-form pieces (12 LINFI brand-anchor + 4 Napking)
- **Voice score** range: ${vs.min}-${vs.max}, mean ${vs.mean.toFixed(1)}, **${vs.unique_values} unique values** (Claude Sonnet kiest ronde getallen — known limitation)
- **mStyleDistance similarity** range: ${fmtSim(sim.min)}-${fmtSim(sim.max)}, mean ${fmtSim(sim.mean)}, stddev ${sim.stddev.toFixed(4)}
- **Delta** (voice − similarity): mean ${fmtSigned(delta.mean)}, stddev ${delta.stddev.toFixed(4)}

### Correlation — secundair directional indicator

| Metric | Value |
|---|---|
| Pearson r | ${corr.pearson_r.toFixed(4)} |
| **Spearman ρ** | **${corr.spearman_rho.toFixed(4)}** (leading per v0.3) |
| Directional interpretation | ${corr.directional_label_spearman} |

**Niet conclusief op zichzelf** — de cases hieronder bepalen de uitkomst.

---
`;
}

function buildInstructions(): string {
  return `## Reviewer instructions

Lees de cases hieronder onafhankelijk van de andere rater. Per case staan:

1. **Twee scores**: quality-scorer Voice (0-100) en mStyleDistance similarity (0-1).
2. **Direction**: welk mechanisme rate dit hoger.
3. **Voice-scorer reasoning**: wat de Claude-judge schrijft over voice-adherence.
4. **Content snippet**: eerste ~500 woorden voor blind judgment.
5. **Drie vragen** om te beantwoorden + ruimte voor losse opmerkingen.

### Wat we van jou willen weten

Per case beantwoord deze 3 vragen, kort (1-2 zinnen elk):

**Q1 — On-brand check**: Voelt deze content on-brand voor het merk (LINFI of Napking)?
\`Ja / Deels / Nee\` + reden.

**Q2 — Direction match**: Klopt de richting van de disagreement met jouw perceptie?
- Als \`embedding higher\` (mStyleDistance hoger dan voice-scorer): zou jij ook
  zeggen dat dit stuk stilistisch typisch voor het merk is, ondanks lagere voice?
- Als \`scorer higher\` (voice-scorer hoger dan embedding): zou jij ook zeggen
  dat dit stuk hoge voice-adherence heeft, ondanks atypische stijl?

**Q3 — Additive vs redundant**: Levert het mStyleDistance signaal voor DEZE case
informatie die de voice-scorer mist? \`Additief / Redundant / Onduidelijk\` + reden.

### Aggregate vraag (na alle cases)

Op basis van de cases samen: zou je het mStyleDistance signaal in F-VAL pijler 1
willen hebben naast de voice-scorer, of vind je het overbodig?

\`Bouwen / Niet bouwen / Twijfelt\` + reden.

---
`;
}

function buildCase(c: DisagreementCase, index: number, total: number): string {
  const directionLabel =
    c.direction === 'embedding-higher-than-voice-scorer'
      ? 'Embedding higher (mStyleDistance rates this more LINFI-like than voice-scorer rates voice-adherence)'
      : 'Scorer higher (voice-scorer rates voice-adherence higher than mStyleDistance rates style-similarity)';

  const anchor = c.is_brand_anchor ? ' · brand-anchor' : '';

  return `## Case ${index + 1} of ${total}: ${c.workspace_slug}/${c.content_type} — "${c.title}"

| | |
|---|---|
| Item ID | \`${c.item_id}\` |
| Workspace | ${c.workspace_slug}${anchor} |
| Content type | ${c.content_type} |
| Word count | ${c.word_count} |

### Scores

| Mechanism | Score | Notes |
|---|---|---|
| Quality-scorer Voice Adherence | **${fmtScore(c.voice_score)}** (normalized ${c.voice_score_normalized.toFixed(2)}) | Claude Sonnet judge, default 4-dim scorer |
| mStyleDistance similarity to LINFI centroid | **${fmtSim(c.similarity_to_linfi_centroid)}** | Method: ${c.similarity_method} |
| Delta (voice − similarity) | ${fmtSigned(c.delta)} | z-score: ${fmtSigned(c.delta_z_score, 2)} |
| Direction | ${directionLabel} | |

### Voice-scorer reasoning

> ${c.voice_explanation.split('\n').join('\n> ')}

### Content snippet (first ~500 words, blind)

\`\`\`
${c.content_snippet}
\`\`\`

### Reviewer responses

**Q1 — On-brand check** (\`Ja\` / \`Deels\` / \`Nee\`):

> _your answer_

**Q2 — Direction match** (matches my perception?):

> _your answer_

**Q3 — Additive vs redundant**:

> _your answer_

**Free-form notes**:

> _optional_

---
`;
}

function buildAggregateSection(): string {
  return `## Aggregate questions (after reviewing all cases)

### A1 — F-VAL pijler 1 build/no-build

Op basis van alle cases gezamenlijk: zou je het mStyleDistance signaal als
fidelity-pijler in F-VAL willen hebben?

\`Bouwen / Niet bouwen / Twijfelt\`:

> _your answer_

**Reden**:

> _your answer_

### A2 — Patterns observed

Heb je patronen gezien in welk soort content disagreement opleverde?
(bv. korter vs langer, bepaalde topics, specifieke schrijfstijlen)

> _your answer_

### A3 — Methodological concerns

Zaken die je tijdens het lezen opvielen die de WS3-meting beïnvloeden?
(bv. content-quality issues, brand-personality inconsistenties, model-artifacts)

> _your answer_

---

## Reviewer metadata

- **Reviewer name**: _your name_
- **Review date**: _YYYY-MM-DD_
- **Time spent**: _minutes_
- **Confidence in your assessment** (\`Hoog / Medium / Laag\`):

> _your answer_

Send back this completed markdown to Erik as the WS3 §6.4 deliverable.
`;
}

// ─── Main ─────────────────────────────────────────────────

async function main(): Promise<void> {
  const inputPath = process.env.INPUT ?? DEFAULT_INPUT;
  const outputPath = process.env.OUTPUT ?? DEFAULT_OUTPUT;

  console.log(`Reading: ${inputPath}`);
  const data: DisagreementFile = JSON.parse(await readFile(inputPath, 'utf-8'));

  if (!data.disagreement_cases || data.disagreement_cases.length === 0) {
    console.log('No disagreement cases — nothing to format.');
    return;
  }

  const sections = [
    buildHeader(data),
    buildContextSection(data),
    buildInstructions(),
    `# Cases\n\nReview these in order. Each is independent; you can pause between cases.\n\n---\n`,
    ...data.disagreement_cases.map((c, i) =>
      buildCase(c, i, data.disagreement_cases.length),
    ),
    buildAggregateSection(),
  ];

  const markdown = sections.join('\n');
  await writeFile(outputPath, markdown, 'utf-8');

  console.log(`✓ Wrote ${data.disagreement_cases.length} cases to:`);
  console.log(`  ${outputPath}`);
  console.log(`\nWord count: ~${markdown.split(/\s+/).length} words`);
  console.log(`File size:  ~${(markdown.length / 1024).toFixed(1)} KB`);
  console.log(
    `\nThis file is gitignored (contains customer content). Send directly to raters.`,
  );
}

main().catch((err) => {
  console.error('Format failed:', err);
  process.exit(1);
});
