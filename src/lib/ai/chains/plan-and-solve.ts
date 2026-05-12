// =============================================================
// Plan-and-Solve chain orchestrator — sub-sprint #5.B chain-pattern C.
//
// Per plan §3.0 (Wang et al. 2023): PLAN → sequential N × EXECUTE →
// ASSEMBLY. Sequentieel zodat sectie-N anchor heeft op sectie-N-1
// (narrative-flow + cross-reference consistency).
//
// Provider-agnostisch via createStructuredCompletion. Sequentiële
// execute-stappen runnen via for-of loop met running-context-buffer
// (laatste 200 woorden van vorige sectie als anchor).
//
// Tracking-strategie: één AICallTrace per plan + één per execute. Plan
// is callOrder=0; executes zijn callOrder=1..N. Hergebruikt AICallTracking
// pattern uit ai-caller voor consistentie met andere chains.
// =============================================================

import { createStructuredCompletion, type AICallTracking } from '../exploration/ai-caller';
import type {
  ContentPlan,
  ExecutedSection,
  PlanAndSolveBrief,
  PlanAndSolveOutput,
  PlanAndSolveEvent,
  PlanSection,
} from './plan-and-solve.types';

/**
 * Plan-and-Solve eigen semver — onafhankelijk van long-form.ts templates
 * omdat dit een aparte pipeline-strategie is. Bump bij PLAN/EXECUTE-
 * prompt-wijzigingen. v1.0.0 baseline.
 */
export const PLAN_AND_SOLVE_VERSION = '1.0.0';

// ─── Prompt builders ──────────────────────────────────────────

const PLAN_SYSTEM_PROMPT = `Je bent een ervaren content-strateeg die een structuurplan bouwt voor een long-form content-piece. Je output is STRIKT structureel: H1-titel + 4-7 H2-secties met word-budgets + sectie-doelen + key-points.

## STRUCTUUR-REGELS

1. **Titel**: H1, max 12 woorden, SEO-aware bij seoKeyword aanwezig
2. **MetaDescription**: 145-160 chars, value-prop + call-to-action hint
3. **Secties**: 4-7 stuks, geordend van probleem → onderbouwing → oplossing → conclusie
4. **Word-budgets**: som ≈ doel-woordaantal (uit content-type constraints)
5. **Goal per sectie**: 1 zin wat de lezer hier moet doen/leren/voelen
6. **KeyPoints**: 2-4 bullet-outline punten per sectie

## OUTLINE-PATRONEN per content-type

- **blog-post / article**: Introductie + 3-5 substantiate H2's + Conclusie (+ optionele FAQ)
- **whitepaper**: Executive summary + Probleem-analyse + 3-4 thematische H2's + Implementatie + Conclusie
- **case-study**: Achtergrond + Uitdaging + Aanpak + Resultaat + Lessen geleerd
- **ebook**: Inleiding + 4-6 hoofdstukken + Conclusie
- **thought-leadership**: Bold-take + Argumentatie + Onderbouwing + Implicaties
- **pillar-page**: Definitie + Diepte-secties + Vergelijking + Praktijk-toepassing + FAQ
- **landing-page**: zie aparte template (geen Plan-and-Solve, gebruikt direct prompt)

## OUTPUT FORMAT (strict JSON)

{
  "title": "string (H1, max 12 woorden)",
  "metaDescription": "string of null (145-160 chars indien seoKeyword aanwezig)",
  "audienceAnchor": "1 zin samenvatting wie deze content leest",
  "sections": [
    {
      "heading": "H2 sentence-case",
      "wordBudget": 200,
      "goal": "1 zin sectie-doel",
      "keyPoints": ["punt 1", "punt 2", "punt 3"]
    }
  ],
  "faqQuestions": ["vraag 1?", "vraag 2?"] // optional, alleen blog-post + pillar-page
}

Geen markdown, geen commentary, alleen JSON.`;

function buildPlanUserPrompt(brief: PlanAndSolveBrief): string {
  const parts: string[] = [];
  parts.push(`Brand: ${brief.brandName}`);
  parts.push(`Taal: ${brief.contentLanguage}`);
  parts.push(`Content-type: ${brief.contentType}`);
  parts.push(`Objective: ${brief.objective}`);
  parts.push(`Key message: ${brief.keyMessage}`);
  parts.push(`Tone: ${brief.toneDirection}`);
  parts.push(`Call to action: ${brief.callToAction}`);
  parts.push(`Audience: ${brief.audienceDescription}`);
  if (brief.seoKeyword) parts.push(`SEO keyword: ${brief.seoKeyword}`);
  if (brief.typeSpecificInputs) {
    const tsi = Object.entries(brief.typeSpecificInputs)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\n');
    if (tsi) parts.push(`\n## Type-specific\n${tsi}`);
  }
  return `Bouw een structuurplan voor de volgende brief:\n\n${parts.join('\n')}\n\nReturn alleen het JSON-object.`;
}

const EXECUTE_SYSTEM_PROMPT = `Je schrijft één sectie van een long-form content-piece volgens een vooraf bepaald structuurplan. Je krijgt:
- De volledige plan-outline (zodat je weet waar deze sectie past)
- De huidige sectie-context (heading + goal + keyPoints + wordBudget)
- Een samenvatting van wat in eerdere secties geschreven is (running anchor)

## SCHRIJF-DISCIPLINE

1. **Heading-prefix**: GEEN H2-heading inkluderen in je output (orchestrator doet dat in assembly-stap). Begin direct met de body-tekst.
2. **Word-budget**: ±15% afwijking acceptabel. Bij overschrijding: cut redundante voorbeelden, niet kern-content.
3. **KeyPoints**: alle keyPoints moeten gedekt zijn — niet noodzakelijk in volgorde, niet noodzakelijk expliciet, maar inhoudelijk aanwezig.
4. **Voorgaande-secties anchor**: bouw voort op wat eerder gezegd is. Geen herhalingen, geen contradicties.
5. **Markdown**: bullet-lists + bold + links waar relevant. GEEN code-blocks tenzij expliciet gevraagd.
6. **Tone-fit**: matched de tone-of-voice uit brief.

## ANTI-PATTERNS

- Begin NIET met "In deze sectie bespreken we..." (meta-commentary)
- Begin NIET met de heading-tekst (orchestrator doet dat)
- Vermijd corporate jargon ("synergy", "leverage", "best-of-breed")
- Vermijd AI-tells ("Kortom", "Tot slot", "Concluderend", "In summary")
- Geen placeholders ([PRICE], TBD, €XX)

Output: pure markdown body-tekst voor deze sectie. Geen JSON, geen wrapper.`;

function buildExecuteUserPrompt(
  brief: PlanAndSolveBrief,
  plan: ContentPlan,
  sectionIndex: number,
  prevSectionsAnchor: string,
): string {
  const currentSection = plan.sections[sectionIndex];
  const parts: string[] = [];
  parts.push(`# Volledig plan (referentie):`);
  parts.push(`Titel: ${plan.title}`);
  parts.push(`Audience-anchor: ${plan.audienceAnchor}`);
  parts.push(`\nSectie-overzicht:`);
  plan.sections.forEach((s, i) => {
    const marker = i === sectionIndex ? ' ← HUIDIGE SECTIE' : '';
    parts.push(`  ${i + 1}. ${s.heading} (${s.wordBudget} woorden)${marker}`);
  });

  parts.push(`\n# Huidige sectie te schrijven`);
  parts.push(`Heading: ${currentSection.heading}`);
  parts.push(`WordBudget: ${currentSection.wordBudget} woorden (±15% acceptabel)`);
  parts.push(`Goal: ${currentSection.goal}`);
  parts.push(`KeyPoints (alle moeten gedekt zijn):`);
  currentSection.keyPoints.forEach((kp) => parts.push(`  - ${kp}`));

  if (prevSectionsAnchor) {
    parts.push(`\n# Wat eerdere secties hebben gezegd (running anchor)`);
    parts.push(prevSectionsAnchor);
  }

  parts.push(`\n# Brief-context (voor tone + brand-voice)`);
  parts.push(`Brand: ${brief.brandName}`);
  parts.push(`Tone: ${brief.toneDirection}`);
  parts.push(`Key message: ${brief.keyMessage}`);

  parts.push(`\n# Schrijf nu sectie ${sectionIndex + 1} (${currentSection.heading})`);

  return parts.join('\n');
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Build running-context anchor: laatste ~200 woorden uit recente secties.
 * Zorgt voor narrative-flow zonder buffer-explosie op lange content.
 */
function buildRunningAnchor(sections: ExecutedSection[]): string {
  if (sections.length === 0) return '';
  const recentSections = sections.slice(-2); // Laatste 2 secties als anchor
  return recentSections
    .map((s) => {
      const truncated = s.content.split(/\s+/).slice(-200).join(' ');
      return `### ${s.heading}\n${truncated}`;
    })
    .join('\n\n');
}

/**
 * Markdown-assembly: H1 + per sectie H2 + sectie-content. Plus FAQ-sectie
 * als plan.faqQuestions gevuld is (blog-post + pillar-page).
 */
function assembleMarkdown(plan: ContentPlan, sections: ExecutedSection[]): string {
  const parts: string[] = [`# ${plan.title}`];
  for (const section of sections) {
    parts.push('');
    parts.push(`## ${section.heading}`);
    parts.push('');
    parts.push(section.content);
  }
  if (plan.faqQuestions && plan.faqQuestions.length > 0) {
    parts.push('');
    parts.push('## Veelgestelde vragen');
    parts.push('');
    plan.faqQuestions.forEach((q) => {
      parts.push(`**${q}**`);
      parts.push('');
      parts.push('[Antwoord volgt — content-team vult in]');
      parts.push('');
    });
  }
  return parts.join('\n');
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Provider-agnostic AI-caller dependency. Default = createStructuredCompletion.
 * Test-mocks injecteren een fixture-callback om dit pure te houden.
 */
export type AICompletionFn = <T>(
  provider: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number },
  tracking?: AICallTracking,
) => Promise<T>;

export interface PlanAndSolveConfig {
  /** Provider voor plan + execute (default: anthropic). */
  provider?: string;
  /** Model voor beide stages (default: claude-sonnet-4-5-20251001). */
  model?: string;
  /** Override AI-caller voor smoke-tests. */
  aiCompletion?: AICompletionFn;
  /** Tracking-config (workspaceId etc.) voor learning-loop persistence. */
  tracking?: Omit<AICallTracking, 'sourceIdentifier' | 'callOrder' | 'promptVersion'>;
}

const DEFAULT_PROVIDER = 'anthropic';
const DEFAULT_MODEL = 'claude-sonnet-4-5-20251001';

/**
 * Run plan-stage: produceer structureel plan vóór execute.
 */
async function runPlanStage(
  brief: PlanAndSolveBrief,
  config: PlanAndSolveConfig,
): Promise<{ plan: ContentPlan; latencyMs: number }> {
  const completion = config.aiCompletion ?? createStructuredCompletion;
  const start = Date.now();
  const plan = await completion<ContentPlan>(
    config.provider ?? DEFAULT_PROVIDER,
    config.model ?? DEFAULT_MODEL,
    PLAN_SYSTEM_PROMPT,
    buildPlanUserPrompt(brief),
    { temperature: 0.7, maxTokens: 2000 },
    config.tracking
      ? {
          ...config.tracking,
          sourceIdentifier: 'src/lib/ai/chains/plan-and-solve.ts:runPlanStage',
          callOrder: 0,
          promptVersion: PLAN_AND_SOLVE_VERSION,
        }
      : undefined,
  );
  return { plan, latencyMs: Date.now() - start };
}

/**
 * Run execute-stage voor één sectie. Sequentieel aangeroepen door
 * runPlanAndSolve met running-anchor van vorige secties.
 */
async function runExecuteStage(
  brief: PlanAndSolveBrief,
  plan: ContentPlan,
  sectionIndex: number,
  prevSections: ExecutedSection[],
  config: PlanAndSolveConfig,
): Promise<{ section: ExecutedSection; latencyMs: number }> {
  const completion = config.aiCompletion ?? createStructuredCompletion;
  const anchor = buildRunningAnchor(prevSections);
  const start = Date.now();
  // Execute geeft markdown-string terug — niet structured JSON. Gebruik
  // dezelfde createStructuredCompletion maar parsing eraf strippen door
  // string-wrapping. Pragmatic: gebruik T = { content: string }.
  const result = await completion<{ content: string }>(
    config.provider ?? DEFAULT_PROVIDER,
    config.model ?? DEFAULT_MODEL,
    EXECUTE_SYSTEM_PROMPT + '\n\nReturn JSON: { "content": "<markdown body>" }',
    buildExecuteUserPrompt(brief, plan, sectionIndex, anchor),
    { temperature: 0.7, maxTokens: 4000 },
    config.tracking
      ? {
          ...config.tracking,
          sourceIdentifier: `src/lib/ai/chains/plan-and-solve.ts:runExecuteStage:section-${sectionIndex}`,
          callOrder: sectionIndex + 1,
          promptVersion: PLAN_AND_SOLVE_VERSION,
        }
      : undefined,
  );
  const content = result.content?.trim() ?? '';
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  return {
    section: {
      heading: plan.sections[sectionIndex].heading,
      content,
      actualWordCount: wordCount,
    },
    latencyMs: Date.now() - start,
  };
}

/**
 * Full Plan-and-Solve pipeline. Sequentieel uitgevoerd: 1 plan + N executes.
 * Returnt eind-output + per-stage metrics.
 *
 * Tracking: één AICallTrace voor plan (callOrder=0) en één per execute
 * (callOrder=1..N). Plan-stage gebruikt PLAN_AND_SOLVE_VERSION als promptVersion;
 * execute-stages idem (zelfde template-versie omdat dit één chain is).
 */
export async function runPlanAndSolve(
  brief: PlanAndSolveBrief,
  config: PlanAndSolveConfig = {},
): Promise<PlanAndSolveOutput> {
  const { plan, latencyMs: planLatencyMs } = await runPlanStage(brief, config);
  const sections: ExecutedSection[] = [];
  let totalExecuteLatencyMs = 0;
  for (let i = 0; i < plan.sections.length; i++) {
    const { section, latencyMs } = await runExecuteStage(brief, plan, i, sections, config);
    totalExecuteLatencyMs += latencyMs;
    sections.push(section);
  }
  const assembledContent = assembleMarkdown(plan, sections);
  const totalWordCount = sections.reduce((sum, s) => sum + s.actualWordCount, 0);
  return {
    plan,
    sections,
    assembledContent,
    metrics: {
      planLatencyMs,
      executeLatencyMs: totalExecuteLatencyMs,
      totalSections: sections.length,
      totalWordCount,
    },
  };
}

/**
 * SSE-streaming variant — yields events per stage zodat orchestrator
 * progress-events naar de UI kan doorzetten.
 */
export async function* runPlanAndSolveStream(
  brief: PlanAndSolveBrief,
  config: PlanAndSolveConfig = {},
): AsyncGenerator<PlanAndSolveEvent> {
  try {
    yield { event: 'plan_started' };
    const { plan } = await runPlanStage(brief, config);
    yield { event: 'plan_complete', data: plan };

    const sections: ExecutedSection[] = [];
    for (let i = 0; i < plan.sections.length; i++) {
      yield { event: 'section_started', data: { index: i, heading: plan.sections[i].heading } };
      const { section } = await runExecuteStage(brief, plan, i, sections, config);
      sections.push(section);
      yield { event: 'section_complete', data: section };
    }

    const assembledContent = assembleMarkdown(plan, sections);
    const totalWordCount = sections.reduce((sum, s) => sum + s.actualWordCount, 0);
    const output: PlanAndSolveOutput = {
      plan,
      sections,
      assembledContent,
      metrics: {
        planLatencyMs: 0, // Stream-versie tracks not aggregated; use telemetry
        executeLatencyMs: 0,
        totalSections: sections.length,
        totalWordCount,
      },
    };
    yield { event: 'assembly_complete', data: output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Stage-detection via stack-trace heuristic — orchestrator kan
    // hier later betere classifier inhaken.
    const stage: 'plan' | 'execute' | 'assembly' = message.includes('runExecuteStage')
      ? 'execute'
      : message.includes('runPlanStage')
        ? 'plan'
        : 'assembly';
    yield { event: 'error', data: { stage, message } };
  }
}

// Helpers ge-exposeerd voor smoke-tests
export { assembleMarkdown, buildRunningAnchor };
// Internal stages alleen voor unit-test mocking
export { runPlanStage as _runPlanStage, runExecuteStage as _runExecuteStage };
// Re-export types voor consumers
export type { PlanSection };
