/**
 * GEO/SEO Fase 3 — composable GEO-polish-stage.
 *
 * Eén lichte (judge-vrije) LLM-call die SEO-pipeline-output herschrijft met de
 * canonieke buildGeoDirective()-principes, ZONDER de SEO-structuur te slopen
 * (zelfde keywords/koppen/meta/FAQ). De expliciete trade-off-regel (answer-first
 * wint van keyword-first) zit in de polish-modus van de directive.
 *
 * Wordt ALLEEN aangeroepen voor het seo-geo-profiel op long-form (zie
 * canvas-orchestrator + runSeoPipeline). Fail-soft: bij elke fout geeft
 * `runGeoPolish` de originele content terug — een mislukte polish mag de
 * SEO-pipeline nooit laten falen.
 */
import { createStructuredCompletion } from './exploration/ai-caller';
import { buildGeoDirective } from './prompts/geo-directives';
import { LONG_FORM_SEO_TYPES, type OptimizationGoal } from './seo-pipeline.types';
import type { ResolvedModel } from './feature-models';

/**
 * Gating-predikaat voor de composable GEO-polish: alleen bij het seo-geo-profiel
 * (goals bevat 'geo') én op long-form (ADR open vraag #2 — long-form-only om het
 * productie-SEO-pad van de page-types ongemoeid te laten). Pure functie.
 */
export function shouldApplyGeoPolish(
  optimizationGoals: OptimizationGoal[],
  contentType: string,
): boolean {
  return optimizationGoals.includes('geo') && LONG_FORM_SEO_TYPES.has(contentType);
}

export interface GeoPolishOpts {
  /** Content-locale voor de directive-tekst. */
  locale?: string;
  /** Brand-voice-directive (zelfde als de SEO-pipeline gebruikt) — behoudt stem. */
  voiceDirective?: string;
  /** AI-tracking-context (learning-loop snapshot). */
  tracking?: { workspaceId: string; deliverableId: string };
}

/**
 * Pure prompt-builder voor de GEO-polish-call. Hergebruikt de `{ draft }`-JSON-
 * envelope (zelfde payload-klasse als variant-B in de SEO-pipeline) zodat het
 * structured-completion-contract houdt. Testbaar zonder live-AI.
 */
export function buildGeoPolishPrompt(
  content: string,
  opts: GeoPolishOpts = {},
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Je bent een Senior GEO-editor. Je herschrijft een bestaande, SEO-geoptimaliseerde pagina zodat AI-antwoordmachines passages zelfstandig kunnen citeren — ZONDER de SEO-fundering te slopen.

BEHOUD (niet wijzigen): alle keywords, de koppenstructuur (H1/H2/H3), meta-elementen, interne links, FAQ-secties, E-E-A-T-signalen, de kernboodschap en de merkstem.

${buildGeoDirective({ locale: opts.locale, mode: 'polish' })}

OUTPUT-FORMAT:
Antwoord met een JSON-object volgens dit exacte schema:
{
  "draft": "string — de volledige geoptimaliseerde pagina in markdown"
}
Het "draft"-veld is het ENIGE veld. Gebruik sentence case voor koppen. Behoud de officiële schrijfwijze van merk-, product- en bedrijfsnamen. Genereer GEEN inhoudsopgave met ankerlinks en GEEN --- horizontale lijnen.${opts.voiceDirective ? `\n${opts.voiceDirective}` : ''}`;

  const userPrompt = `## BESTAANDE PAGINA (SEO-geoptimaliseerd)
${content}

Herschrijf de pagina answer-first en citeerbaar volgens de GEO-directive, met behoud van álle SEO-elementen hierboven. Lever de volledige markdown-pagina in het "draft"-veld.`;

  return { systemPrompt, userPrompt };
}

/** Defensieve draft-extractie uit de `{ draft }`-envelope (of een kale string). */
function extractDraft(result: unknown): string | null {
  if (typeof result === 'string' && result.trim()) return result;
  if (result && typeof result === 'object') {
    const draft = (result as Record<string, unknown>).draft;
    if (typeof draft === 'string' && draft.trim()) return draft;
  }
  return null;
}

/**
 * Voert de GEO-polish uit op SEO-content. Fail-soft: geeft bij elke fout
 * (LLM-error, lege/ongeldige response) de ONGEWIJZIGDE input terug, zodat de
 * SEO-pipeline altijd doorloopt.
 */
export async function runGeoPolish(
  content: string,
  model: ResolvedModel,
  opts: GeoPolishOpts = {},
): Promise<string> {
  if (!content.trim()) return content;
  try {
    const { systemPrompt, userPrompt } = buildGeoPolishPrompt(content, opts);
    const result = await createStructuredCompletion<{ draft: string }>(
      model.provider,
      model.model,
      systemPrompt,
      userPrompt,
      // Zelfde payload-klasse als variant-B (volledige pagina in JSON-envelope).
      { timeoutMs: 240_000, maxTokens: 24000 },
      opts.tracking
        ? {
            workspaceId: opts.tracking.workspaceId,
            parentEntityType: 'Deliverable',
            parentEntityId: opts.tracking.deliverableId,
            callOrder: 100, // ná de 8-staps pipeline + variant-B (99)
            sourceIdentifier: 'src/lib/ai/geo-polish.ts:runGeoPolish',
          }
        : undefined,
    );
    return extractDraft(result) ?? content;
  } catch (err) {
    console.warn('[geo-polish] polish failed, using original SEO content:', err instanceof Error ? err.message : err);
    return content;
  }
}
