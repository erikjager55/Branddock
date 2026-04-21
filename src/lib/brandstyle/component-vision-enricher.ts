// =============================================================
// Component Vision Enricher — Sprint 4 follow-up
//
// Takes the screenshots captured by component-screenshotter and runs
// them through Claude Vision to derive better labels than the class-
// name heuristic can produce.
//
// The screenshotter labels components from CSS class names ("Primary
// Button" if class contains "primary", etc). Claude Vision can look at
// the actual pixels and tell that a button is emerald, rounded, and
// reads "Get started" — producing "Primary Get-Started Button" with
// real semantic specificity.
//
// Gated by `BRANDSTYLE_COMPONENT_VISION=1`. Requires `ANTHROPIC_API_KEY`.
// Single batched call (all images in one message) minimises latency and
// token overhead. Typical cost: ~$0.13 per scan (35 images).
// =============================================================

import Anthropic from "@anthropic-ai/sdk";
import type { ScreenshotedComponent } from "./component-screenshotter";

export function isComponentVisionEnabled(): boolean {
  return process.env.BRANDSTYLE_COMPONENT_VISION === "1";
}

const MODEL = "claude-sonnet-4-5-20250929";
const TIMEOUT_MS = 90_000;

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for component vision enrichment");
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

interface VisionRefinement {
  index: number;
  label: string;
  /** One-sentence description of what's distinctive about this component. */
  notes?: string;
}

const SYSTEM_PROMPT = `You are a brand designer classifying UI component screenshots.
For each image you receive, write a short, specific label (3-6 words)
that captures the component's role and visual character.

Good labels are specific and designerly:
  - "Primary emerald CTA button"
  - "Search input with rounded pill shape"
  - "Success status chip"
  - "Top navigation — sticky, centered"
  - "Testimonial card with accent border"

Avoid generic labels like "Button" or "Card" — we already have those.
If the image is unclear, empty, or clearly not the stated component type,
return { "index": N, "label": "Unclear" } for that entry.

Respond ONLY with valid JSON matching the schema requested.`;

/**
 * Send all screenshots to Claude Vision in one batched call and return
 * refined labels per component. The input array ordering is preserved
 * via an explicit index so the response is easy to map back.
 *
 * Mutates the input array (sets `label` and appends notes to selector
 * as a tooltip hint). Returns the same array for chaining.
 */
export async function enrichComponentsWithVision(
  components: ScreenshotedComponent[],
): Promise<ScreenshotedComponent[]> {
  if (components.length === 0) return components;
  const client = getClient();

  // Build image + text message content. Each image carries its index +
  // the type the screenshotter decided (BUTTON, FORM_INPUT, …) so Claude
  // has minimal context to ground on.
  const content: Anthropic.Messages.ContentBlockParam[] = [];
  for (let i = 0; i < components.length; i++) {
    const c = components[i];
    content.push({
      type: "text",
      text: `[${i}] Type hint: ${c.type}`,
    });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: c.screenshotBuffer.toString("base64"),
      },
    });
  }
  content.push({
    type: "text",
    text: `Classify each of the ${components.length} images above.

Return a JSON object with this exact shape:
{
  "refinements": [
    { "index": 0, "label": "...", "notes": "..." },
    { "index": 1, "label": "...", "notes": "..." },
    ...
  ]
}

The notes field is optional — include only when there's something distinctive
(e.g. "uses brand green", "unusual rounded-full shape"). Keep notes under 12 words.`,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Anthropic.Messages.Message;
  try {
    response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      },
      { signal: controller.signal },
    );
  } catch (err) {
    console.warn(
      `[component-vision] Claude call failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return components; // fall back to screenshotter labels
  } finally {
    clearTimeout(timer);
  }

  // Extract text content
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    console.warn("[component-vision] No text response block");
    return components;
  }

  // Strip potential markdown fences + parse JSON
  const raw = textBlock.text;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn("[component-vision] No JSON in response");
    return components;
  }
  let parsed: { refinements?: VisionRefinement[] } | null = null;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    console.warn("[component-vision] Invalid JSON in response");
    return components;
  }
  const refinements = parsed?.refinements ?? [];

  // Merge refinements back onto components by index, skipping "Unclear"
  // entries (keep the fallback class-name label).
  for (const r of refinements) {
    if (typeof r.index !== "number") continue;
    if (r.index < 0 || r.index >= components.length) continue;
    const label = (r.label ?? "").trim();
    if (!label || /unclear/i.test(label)) continue;
    components[r.index].label = label;
    // Piggyback notes on the selector field — it's the only free-text
    // slot DetectedComponent has without schema changes. The UI can
    // choose to render it or ignore.
    const notes = (r.notes ?? "").trim();
    if (notes) {
      components[r.index].selector = `${components[r.index].selector}  |  ${notes}`;
    }
  }

  console.log(
    `[component-vision] Refined ${refinements.length}/${components.length} component labels (${response.usage?.input_tokens} in / ${response.usage?.output_tokens} out)`,
  );

  return components;
}
