// =============================================================
// Pattern E image-quality-chain — OCR text-in-image check via Google Vision.
//
// Detecteert tekst in gegenereerde images (captions, signage, logo-letters,
// embedded copy). Versterkt de AI-judge `text-in-image` dimensie met een
// deterministische OCR-pass die geen LLM-hallucinaties heeft.
//
// Graceful skip wanneer GOOGLE_VISION_API_KEY niet gezet — caller krijgt
// null en de bestaande visual-ai-judge text-in-image score blijft vangnet.
//
// Vision API endpoint: images:annotate met TEXT_DETECTION feature. Network
// timeout 15s; API zelf is meestal sub-second voor enkele image.
// =============================================================

const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";
const TIMEOUT_MS = 15_000;

export interface OcrCheckResult {
  /** Detected text in image (alle annotations gejoined). Lege string = geen tekst gevonden. */
  text: string;
  /** Aantal text-blocks dat de Vision API als losse annotation rapporteert. */
  blockCount: number;
  /** Confidence score 0-1 indien gerapporteerd door API. null = niet beschikbaar. */
  confidence: number | null;
  /** Provenance — handig voor logging + UI-attribution. */
  source: "google-vision";
}

interface VisionAnnotateResponse {
  responses: Array<{
    error?: { code: number; message: string };
    textAnnotations?: Array<{
      description: string;
      locale?: string;
      confidence?: number;
    }>;
    fullTextAnnotation?: {
      text: string;
      pages?: Array<{ confidence?: number }>;
    };
  }>;
}

/**
 * Detect tekst in een image via Google Vision API.
 *
 * Returns `null` wanneer:
 * - GOOGLE_VISION_API_KEY niet gezet (graceful skip)
 * - Network/API error (logged, geen exception bubble)
 * - Vision API niet enabled op het project (403 — user actie nodig)
 *
 * Returns een leeg `text` veld wanneer Vision geen tekst detecteert — dat is
 * de happy-path voor brand-content waar tekst expliciet ongewenst is.
 */
export async function extractTextFromImage(imageUrl: string): Promise<OcrCheckResult | null> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY?.trim();
  if (!apiKey) {
    // Graceful skip — geen logging, dit is een verwachte deployment-state
    return null;
  }
  if (!imageUrl || !imageUrl.startsWith("http")) {
    console.warn("[ocr-check] invalid image URL, skipping:", imageUrl);
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${VISION_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { source: { imageUri: imageUrl } },
            features: [{ type: "TEXT_DETECTION", maxResults: 50 }],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 403) {
        console.warn(
          "[ocr-check] Vision API niet geactiveerd of key invalid (403). Skipping.",
        );
      } else {
        console.error(
          `[ocr-check] Vision API ${res.status} ${res.statusText}:`,
          body.slice(0, 200),
        );
      }
      return null;
    }

    const data = (await res.json()) as VisionAnnotateResponse;
    const first = data.responses?.[0];
    if (!first) return { text: "", blockCount: 0, confidence: null, source: "google-vision" };

    if (first.error) {
      console.warn(
        `[ocr-check] per-image error (${first.error.code}): ${first.error.message}`,
      );
      return null;
    }

    const annotations = first.textAnnotations ?? [];
    const fullText = first.fullTextAnnotation?.text ?? "";
    const pageConfidence = first.fullTextAnnotation?.pages?.[0]?.confidence ?? null;

    // De eerste annotation bevat de hele detected text; volgende zijn per-woord/per-block
    const allText = fullText || annotations[0]?.description || "";
    const blockCount = Math.max(0, annotations.length - 1); // -1 omdat [0] de samenvatting is

    return {
      text: allText.trim(),
      blockCount,
      confidence: pageConfidence,
      source: "google-vision",
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[ocr-check] timeout na ${TIMEOUT_MS}ms voor ${imageUrl}`);
    } else {
      console.error(
        "[ocr-check] unexpected error:",
        err instanceof Error ? err.message : err,
      );
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Heuristic: bepaal of detected text als "ongewenste hallucinated text" telt.
 *
 * Brand-content waar geen tekst-overlay verwacht wordt (lifestyle photos,
 * abstract visuals, product close-ups zonder caption) zou idealiter 0 chars
 * uit OCR retourneren. Wanneer er WEL tekst gedetecteerd is, is dat in 90%
 * van de gevallen een hallucination van het image-model.
 *
 * Returns 0-100 deduction-score: 0 = no penalty, 100 = severe text-pollution.
 * Caller (visual-fidelity-scorer) gebruikt dit om de text-in-image dimensie
 * te penaliseren of een nieuwe `textOcrPenalty` aux-veld in te vullen.
 */
export function computeTextPollutionPenalty(ocr: OcrCheckResult): number {
  if (!ocr.text || ocr.text.length === 0) return 0;

  const len = ocr.text.length;
  const blocks = ocr.blockCount;

  // Heuristic-tiers:
  // - 1-5 chars (likely single letter / artefact): light penalty
  // - 6-20 chars (short label/logo word): medium penalty
  // - 21-60 chars (caption-length): severe penalty
  // - 60+ chars (paragraph): maximum penalty
  if (len <= 5) return 20;
  if (len <= 20) return 50;
  if (len <= 60) return 80;
  if (blocks > 3) return 100;
  return 90;
}
