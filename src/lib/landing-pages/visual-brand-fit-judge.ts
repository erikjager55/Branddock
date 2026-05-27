/**
 * F-VAL dimensie 8 — Visual Brand-Fit Judge (verbeterplan #6 spike).
 *
 * Score-functie voor "past de gerenderde LP visueel bij het merk?".
 * Vereist een screenshot van de rendered Puck-output + de brand
 * designPhilosophy. Claude vision-API doet de evaluatie.
 *
 * Spike-scope: alleen de judge-functie + integration-stub.
 * Screenshot-capture infrastructure (Playwright in render-pipeline) is
 * deferred naar v2 — zie TODO's hieronder.
 *
 * Status: NOT WIRED IN F-VAL composite-score yet. Caller moet
 * screenshotUrl + designPhilosophy aanleveren; bij missing → score = null
 * (skip-pad in composite).
 */
export interface VisualBrandFitInput {
  /** Public URL van een screenshot van de gerenderde LP. */
  screenshotUrl: string | null;
  /** designPhilosophy uit BrandStyleguide. */
  designPhilosophy: string | null;
  /** Optionele extra brand-context: brand-name + colors. */
  brandName?: string;
  brandColors?: string[];
  brandImageryStyle?: string | null;
}

export interface VisualBrandFitResult {
  /** Score 0-100 wanneer judgement plaatsvond. Null wanneer skipped. */
  score: number | null;
  /** Statuscode voor caller. */
  status: "scored" | "skipped-missing-screenshot" | "skipped-missing-philosophy" | "error";
  /** Korte uitleg (1-2 zinnen) van de score. */
  reasoning: string | null;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * TODO v2 — screenshot-capture: er is nog geen pipeline die de live
 * gerenderde LP screenshotted. Vereist:
 *   1. Playwright (of Puppeteer) in een serverless-compatible setup
 *   2. Endpoint dat puckData rendert in een headless Next.js context
 *   3. S3 upload voor de PNG zodat Claude vision-API hem kan fetchen
 *   4. Cache + invalidatie
 * Tot deze infra klaar is wordt judgeVisualBrandFit met screenshotUrl=null
 * aangeroepen — score = null, status = "skipped-missing-screenshot".
 */
export async function judgeVisualBrandFit(
  input: VisualBrandFitInput,
): Promise<VisualBrandFitResult> {
  if (!input.screenshotUrl) {
    return {
      score: null,
      status: "skipped-missing-screenshot",
      reasoning: null,
    };
  }
  if (!input.designPhilosophy || input.designPhilosophy.trim().length === 0) {
    return {
      score: null,
      status: "skipped-missing-philosophy",
      reasoning: null,
    };
  }

  // TODO v2: vision-call implementeren.
  // Vereist:
  //   - Claude vision-API integratie (anthropicClient ondersteunt nu text-only;
  //     vision-content-block met type:image moet apart geïmplementeerd worden)
  //   - System prompt zoals hieronder geschetst:
  //     "Je bent een brand-designer. Beoordeel of pagina past bij brand-DNA.
  //      Score 0-100. 90+: perfect. 70-89: sterk. 50-69: herkenbaar. 30-49:
  //      generic. 0-29: contradicts brand identity."
  //   - Input: screenshot URL + designPhilosophy + brandColors + imageryStyle
  //   - Output JSON: { score: number, reasoning: string }
  //
  // Tot dan: error-status met TODO-bericht zodat caller kan voorbereiden.
  return {
    score: null,
    status: "error",
    reasoning: "TODO v2: vision-API integration nog niet geïmplementeerd",
  };
}

/**
 * Composite-score helper: gebruikt in F-VAL judge-pipeline.
 * Wanneer score = null (skipped/error): retourneer null zodat caller de
 * dimensie kan weglaten uit weighted average — geen verstoring van
 * bestaande F-VAL gebruikers.
 */
export function visualBrandFitWeight(): number {
  return 0.1; // 10% van composite, evenwicht met andere dimensies
}
