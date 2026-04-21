// =============================================================
// Logo Vision Detector — Sprint 6A
//
// Uses Claude Vision to locate the brand logo on a page screenshot
// and crop it out at high quality. Replaces the weak HTML-regex
// `findLogoUrls` path that often picks up unrelated small icons
// (favicons, social icons, empty placeholder images).
//
// Flow:
//   1. Take (re-use) the hero screenshot already captured for
//      visual AI analysis.
//   2. Ask Claude to return a normalised bounding box (0..1) that
//      encloses the primary brand logo.
//   3. Crop the buffer via sharp using the actual image dimensions.
//   4. Upload the crop via the storage provider → returns a URL.
//
// Gated by `BRANDSTYLE_VISUAL_AI=1` since it shares the same Claude
// Vision requirement.
// =============================================================

import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { getStorageProvider } from "@/lib/storage";

const MODEL = "claude-sonnet-4-5-20250929";
const TIMEOUT_MS = 30_000;

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for logo vision detection");
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

const SYSTEM_PROMPT = `You identify brand logos in website screenshots and return a bounding
box that captures the COMPLETE lockup. Coordinates MUST be normalised floats between 0.0
and 1.0 relative to the image dimensions.

WHAT TO RETURN:
- The FULL brand lockup: wordmark + icon + tagline (if present), as a single horizontal
  or vertical unit. If "acme" sits next to a mark and above a tagline, include ALL of it.
- Typically a brand lockup is at least 8-20% of the page width. A bounding box that
  captures only a single letter, glyph, or icon is WRONG — expand it until the entire
  wordmark and any adjacent tagline are enclosed.
- Include a small amount of whitespace around the lockup so ascenders, descenders, and
  tagline text are not clipped.

WHAT NOT TO RETURN:
- Do NOT crop to a single letter, initial, or icon fragment.
- Do NOT return favicons, social media icons, or small decorative glyphs.
- If the logo is split across lines (e.g. icon above text), include BOTH in the bbox.
- If NO recognisable logo exists (blank page, cookie banner covering everything) return
  { "found": false }.

- Respond with valid JSON only. No prose, no code fences.`;

interface DetectionResult {
  found: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
  description?: string;
}

/**
 * Detect the logo in a hero screenshot and crop it to a standalone PNG.
 * Uploads the crop via the storage provider and returns metadata ready
 * to be written to a StyleguideLogo record.
 *
 * Returns null on any failure — caller should fall back to the legacy
 * HTML-scraped logo candidates.
 */
export async function detectAndCropLogo(
  heroBuffer: Buffer,
  workspaceId: string,
): Promise<{
  fileUrl: string;
  fileName: string;
  width: number;
  height: number;
  description: string;
} | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = getClient();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Anthropic.Messages.Message;
  try {
    response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: heroBuffer.toString("base64"),
                },
              },
              {
                type: "text",
                text: `Locate the COMPLETE primary brand lockup in this screenshot — the full
wordmark plus any tagline or adjacent icon. Do NOT crop to a single letter or glyph.
A proper brand lockup is typically 8-20% of the page width; if your bounding box is
narrower than that, you are cropping too tight.

Respond with valid JSON only, matching this schema:
{
  "found": boolean,
  "boundingBox": { "x": number, "y": number, "width": number, "height": number },
  "description": "short description of the full lockup (e.g. 'Lowercase wordmark \\'napking\\' with blue accent on the a, tagline below')"
}

All boundingBox values are normalised floats between 0.0 and 1.0.`,
              },
            ],
          },
        ],
      },
      { signal: controller.signal },
    );
  } catch (err) {
    console.warn(
      `[logo-vision] Claude call failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }

  // Extract + parse JSON
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;
  const match = textBlock.text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: DetectionResult;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!parsed.found || !parsed.boundingBox) {
    console.log("[logo-vision] Claude reported no logo found in screenshot");
    return null;
  }

  // Clamp + sanity-check bbox
  const bb = parsed.boundingBox;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const x = clamp(bb.x);
  const y = clamp(bb.y);
  const w = clamp(bb.width);
  const h = clamp(bb.height);
  // Reject bboxes that are too narrow to be a real wordmark. A full brand
  // lockup is virtually always ≥8% of page width; anything narrower is
  // typically a single letter, icon fragment, or misfire — let the scraped
  // HTML logo win instead.
  const MIN_WIDTH_RATIO = 0.08;
  if (w < MIN_WIDTH_RATIO || h < 0.01) {
    console.warn(
      `[logo-vision] Bounding box too small (w=${w.toFixed(3)}, h=${h.toFixed(3)}) — likely a single letter. Falling back to scraped logo.`,
    );
    return null;
  }

  // Map normalised bbox to pixel coordinates on the real image
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(heroBuffer).metadata();
  } catch (err) {
    console.warn(
      `[logo-vision] Failed to read image metadata: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
  const imgW = metadata.width ?? 0;
  const imgH = metadata.height ?? 0;
  if (imgW === 0 || imgH === 0) return null;

  // Convert + add generous padding so tagline, ascenders, descenders, and a
  // bit of breathing room survive the crop. Claude occasionally tightens
  // around the wordmark only and clips taglines — 8% safety margin fixes
  // most of those cases without adding noticeable whitespace.
  const PAD_RATIO = 0.08;
  const px = Math.max(0, Math.floor((x - PAD_RATIO) * imgW));
  const py = Math.max(0, Math.floor((y - PAD_RATIO) * imgH));
  const pw = Math.min(imgW - px, Math.ceil((w + PAD_RATIO * 2) * imgW));
  const ph = Math.min(imgH - py, Math.ceil((h + PAD_RATIO * 2) * imgH));

  let cropBuffer: Buffer;
  try {
    cropBuffer = await sharp(heroBuffer)
      .extract({ left: px, top: py, width: pw, height: ph })
      .png()
      .toBuffer();
  } catch (err) {
    console.warn(
      `[logo-vision] Sharp crop failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }

  // Upload via storage provider
  const storage = getStorageProvider();
  try {
    const result = await storage.upload(cropBuffer, {
      workspaceId,
      fileName: `logo-vision-${Date.now()}.png`,
      contentType: "image/png",
      generateThumbnail: false,
    });
    return {
      fileUrl: result.url,
      fileName: `logo-vision-${Date.now()}.png`,
      width: result.width ?? pw,
      height: result.height ?? ph,
      description:
        (parsed.description ?? "").trim() || "Primary brand logo detected via AI vision",
    };
  } catch (err) {
    console.warn(
      `[logo-vision] Upload failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
