/**
 * F-VAL dimensie 8 — Visual Brand-Fit Judge (DTS-plan #6 v2).
 *
 * Volledige implementatie: Playwright screenshot van een puckData-tree
 * → Anthropic Claude vision-API met designPhilosophy als brand-anker
 * → score 0-100 + reasoning.
 *
 * Architectuur:
 * 1. capturePuckTreeScreenshot rendert de Puck-tree headless via
 *    react-dom/server + Playwright (lp-screenshotter.ts)
 * 2. createClaudeStructuredCompletion stuurt screenshot + brand-context
 *    naar Claude met vision-system-prompt
 * 3. Score 0-100 met categorie-mapping voor F-VAL composite
 *
 * Niet-blokkerend: bij screenshot-failure of vision-error → status=skipped/
 * error met score=null. F-VAL composite mag dimensie weglaten en gewicht
 * redistribueren.
 */
import type { CanvasContextStack } from "../ai/canvas-context";
import type { Data } from "@puckeditor/core";

export interface VisualBrandFitInput {
  /** Pre-captured screenshot buffer. Wanneer absent + puckData/ctx aanwezig:
   *  judge captureert zelf via lp-screenshotter. */
  screenshotBuffer?: Buffer | null;
  /** Alternative input: puckData + ctx → judge maakt zelf de screenshot. */
  puckData?: Data | null;
  ctx?: CanvasContextStack | null;
  /** Brand-design-philosophy (uit BrandStyleguide.designPhilosophy). Required. */
  designPhilosophy: string | null;
  /** Extra brand-context voor scherpere judging. */
  brandName?: string;
  brandColors?: string[];
  brandImageryStyle?: string | null;
}

export interface VisualBrandFitResult {
  score: number | null;
  status:
    | "scored"
    | "skipped-missing-screenshot"
    | "skipped-missing-philosophy"
    | "skipped-screenshot-failed"
    | "error";
  reasoning: string | null;
  inputTokens?: number;
  outputTokens?: number;
}

const VISION_SYSTEM = `Je bent een brand-designer die beoordeelt of een gerenderde landingspagina past bij de visuele identiteit van een merk.

Je krijgt:
1. Een screenshot van de gerenderde pagina
2. De design-philosophy van het merk (één-zin samenvatting van wat de brand visueel onderscheidt)
3. Brand-context (naam, kleuren, imagery-style)

Beoordeel op een schaal van 0-100 hoe goed de pagina dit merk vertegenwoordigt:
- 90-100: identiek aan wat je zou verwachten — perfect brand-match
- 70-89: sterke match met kleine afwijkingen
- 50-69: herkenbaar maar mist signature-elementen
- 30-49: vlak/generic, mist brand-DNA
- 0-29: contradicts brand identity

Kijk specifiek naar:
- Typografie hiërarchie (hoofdkop / body / labels)
- Kleur-discipline (gebruikt het de juiste brand-color + bevriendigde neutrals)
- Card-elevation (flat / shadow / border-only — past dit bij het merk?)
- Sectie-spacing (sparse premium vs tight conversion-density)
- Photography (full-bleed brand-scrim vs gradient vs solid bg)
- Button-styling (radius / capitalisation / tone)

Output STRICT JSON: { "score": <0-100>, "reasoning": "<1-2 zinnen NL>" }`;

export async function judgeVisualBrandFit(
  input: VisualBrandFitInput,
): Promise<VisualBrandFitResult> {
  // Gate 1 — designPhilosophy verplicht
  if (!input.designPhilosophy || input.designPhilosophy.trim().length === 0) {
    return {
      score: null,
      status: "skipped-missing-philosophy",
      reasoning: null,
    };
  }

  // Gate 2 — resolve screenshot-buffer (capture wanneer alleen puckData)
  let screenshotBuffer: Buffer | null = input.screenshotBuffer ?? null;
  if (!screenshotBuffer && input.puckData) {
    try {
      const { capturePuckTreeScreenshot } = await import("./lp-screenshotter");
      screenshotBuffer = await capturePuckTreeScreenshot(input.puckData, input.ctx ?? null);
    } catch (err) {
      console.warn(
        `[visual-brand-fit-judge] Screenshot-capture failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        score: null,
        status: "skipped-screenshot-failed",
        reasoning: err instanceof Error ? err.message : "screenshot failed",
      };
    }
  }

  if (!screenshotBuffer) {
    return {
      score: null,
      status: "skipped-missing-screenshot",
      reasoning: null,
    };
  }

  // Bouw brand-context-prompt
  const contextParts: string[] = [];
  contextParts.push(`Design philosophy: ${input.designPhilosophy.trim()}`);
  if (input.brandName) contextParts.push(`Brand: ${input.brandName}`);
  if (input.brandColors && input.brandColors.length > 0) {
    contextParts.push(`Brand colors: ${input.brandColors.join(", ")}`);
  }
  if (input.brandImageryStyle) {
    contextParts.push(`Brand imagery style: ${input.brandImageryStyle}`);
  }
  const userPrompt = `${contextParts.join("\n")}\n\nBeoordeel de bijgevoegde screenshot. Output strict JSON.`;

  // Vision-call via bestaande Anthropic-pipeline
  try {
    const { createClaudeStructuredCompletion } = await import(
      "../ai/exploration/ai-caller"
    );
    const response = await createClaudeStructuredCompletion<{
      score?: number;
      reasoning?: string;
    }>(
      VISION_SYSTEM,
      userPrompt,
      {
        temperature: 0.2,
        maxTokens: 400,
        images: [
          {
            buffer: screenshotBuffer,
            mediaType: "image/png" as const,
          },
        ],
        timeoutMs: 60_000,
      },
      {
        workspaceId: "vision-judge",
        parentEntityType: "VisualBrandFitJudge",
        parentEntityId: input.brandName ?? "anonymous",
        callOrder: 0,
        sourceIdentifier: "src/lib/landing-pages/visual-brand-fit-judge.ts:judgeVisualBrandFit",
      },
    );
    if (
      typeof response.score !== "number" ||
      response.score < 0 ||
      response.score > 100
    ) {
      return {
        score: null,
        status: "error",
        reasoning: `Invalid score in vision response: ${response.score}`,
      };
    }
    return {
      score: Math.round(response.score),
      status: "scored",
      reasoning: typeof response.reasoning === "string" ? response.reasoning : "",
    };
  } catch (err) {
    return {
      score: null,
      status: "error",
      reasoning: err instanceof Error ? err.message : "vision call failed",
    };
  }
}

/**
 * Composite-score gewicht voor F-VAL pipeline. 10% van composite —
 * complementair aan style (35%), judge (45%), rules (20%).
 */
export function visualBrandFitWeight(): number {
  return 0.1;
}
