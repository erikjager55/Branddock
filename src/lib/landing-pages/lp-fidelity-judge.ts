/**
 * LP Fidelity Judge — Fase D van LP-fidelity verbeterplan (2026-05-27).
 *
 * Vergelijkt een gerenderde LP-screenshot met de hero-screenshot van de
 * BRON-website en scoort hoe consistent ze visueel zijn:
 *
 *   - Hetzelfde "vibe"? (premium/playful/editorial/etc.)
 *   - Vergelijkbare kleur-discipline (geen vibrant-bg vs accent mismatch)
 *   - Vergelijkbare typografie-feel (serif display vs sans-serif feel)
 *   - Vergelijkbare layout-densiteit (sparse vs dense)
 *
 * Anders dan visual-brand-fit-judge (= matcht LP met designPhilosophy
 * abstract): deze judge gebruikt twee CONCRETE images om side-by-side
 * fidelity vast te stellen. Beter signaal want het meet "lijkt het op de
 * werkelijke bron" niet "past het bij een tekstuele beschrijving van het
 * merk".
 *
 * Gated by `BRANDSTYLE_LP_FIDELITY=1` zodat de extra vision-call
 * (~$0.02, ~10s) opt-in is.
 */

import { createClaudeStructuredCompletion } from "@/lib/ai/exploration/ai-caller";

export interface LpFidelityInput {
  /** PNG buffer van de gegenereerde LP-hero (1280x800 typisch). */
  lpScreenshot: Buffer;
  /** PNG buffer van de bron-website hero (uit page-screenshotter). */
  sourceHeroScreenshot: Buffer;
  /** Optioneel: brand-context voor scherpere judging. */
  brandName?: string;
}

export interface LpFidelityResult {
  /** Composite fidelity-score 0-100. */
  score: number;
  /** Per-dimensie scores voor diagnose. */
  dimensions: {
    colorDiscipline: number;
    typographyFeel: number;
    layoutDensity: number;
    overallVibe: number;
  };
  /** Welke specifieke mismatches de judge zag. */
  mismatches: string[];
  /** 1-2 zinnen samenvatting van het verdict. */
  reasoning: string;
  /** Verdict-bucket voor UI. */
  verdict: "excellent" | "good" | "fair" | "poor";
}

export function isLpFidelityEnabled(): boolean {
  return process.env.BRANDSTYLE_LP_FIDELITY === "1";
}

const FIDELITY_SYSTEM = `Je bent een design-criticus die twee hero-screenshots side-by-side vergelijkt en beoordeelt of de tweede (een gegenereerde landingspagina) de visuele identiteit van de eerste (de bron-website) eerlijk weergeeft.

Score per dimensie 0-100:
- colorDiscipline — gebruikt de LP dezelfde kleur-rollen (welke kleur is achtergrond, welke is accent, welke is heading)? STRAF mismatches zoals bron-accent-color als LP-hero-bg
- typographyFeel — feel-the-same? (serif display + sans-serif body komt overal terug; weight/scale-hierarchie matched)
- layoutDensity — sparse-editorial vs dense-conversion vs centered-minimal; layouts moeten dezelfde 'breath' hebben
- overallVibe — premium/playful/editorial/utilitarian — voelt de LP als de bron, of als een generic template?

Composite-score = gewogen gemiddelde (color 35% / typo 25% / layout 20% / vibe 20%).

Verdict-buckets:
- excellent: 85-100 (vrijwel identiek aan bron)
- good: 70-84 (sterke match, kleine afwijkingen)
- fair: 50-69 (herkenbaar maar mist signature-elementen)
- poor: 0-49 (voelt als ander merk)

Output strict JSON:
{
  "score": <number 0-100>,
  "dimensions": {
    "colorDiscipline": <0-100>,
    "typographyFeel": <0-100>,
    "layoutDensity": <0-100>,
    "overallVibe": <0-100>
  },
  "mismatches": [<korte string per mismatch, max 3>],
  "reasoning": "<1-2 zinnen NL>",
  "verdict": "excellent" | "good" | "fair" | "poor"
}`;

export async function judgeLpFidelity(
  input: LpFidelityInput,
): Promise<LpFidelityResult | null> {
  try {
    const userPrompt = [
      `Vergelijk deze twee screenshots:`,
      ``,
      `IMAGE 1: bron-website hero (de werkelijke ${input.brandName ?? "merk"}-pagina)`,
      `IMAGE 2: gegenereerde LP-hero die deze pagina probeert te representeren`,
      ``,
      `Score volgens schema.`,
    ].join("\n");
    const result = await createClaudeStructuredCompletion<LpFidelityResult>(
      FIDELITY_SYSTEM,
      userPrompt,
      {
        images: [
          { buffer: input.sourceHeroScreenshot, mediaType: "image/png" },
          { buffer: input.lpScreenshot, mediaType: "image/png" },
        ],
        maxTokens: 800,
        timeoutMs: 45_000,
      },
    );
    // Sanity-check op required fields
    if (
      typeof result.score !== "number" ||
      !result.dimensions ||
      !["excellent", "good", "fair", "poor"].includes(result.verdict)
    ) {
      console.warn("[lp-fidelity] Invalid response shape:", result);
      return null;
    }
    return result;
  } catch (err) {
    console.warn(
      `[lp-fidelity] Judge failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
