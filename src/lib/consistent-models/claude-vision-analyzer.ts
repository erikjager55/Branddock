// =============================================================
// Claude Vision Analyzer — structured illustration style analysis
// =============================================================

import Anthropic from "@anthropic-ai/sdk";
import {
  ILLUSTRATION_ANALYSIS_SYSTEM_PROMPT,
  buildIllustrationAnalysisPrompt,
  generateStylePrompts,
} from "@/lib/ai/prompts/illustration-analysis";
import type {
  IllustrationStyleProfile,
  ExtractedColorPalette,
  ImageStats,
} from "./style-profile.types";

// ─── Anthropic singleton ──────────────────────────────────

let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for style analysis");
    }
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// ─── Types ─────────────────────────────────────────────────

interface AnalysisInput {
  imageUrls?: string[];
  imageBuffers?: { buffer: Buffer; mediaType: string }[];
  colorPalettes: ExtractedColorPalette[];
  mergedPalette: ExtractedColorPalette;
  statsPerImage: ImageStats[];
  avgStats: {
    avgEntropy: number;
    avgBrightness: number;
    avgContrast: number;
  };
}

/** Claude Vision's raw response shape (before prompt generation) */
interface ClaudeStyleAnalysis {
  line: IllustrationStyleProfile["line"];
  color: Omit<IllustrationStyleProfile["color"], "palette" | "dominantHex" | "colorCount">;
  shading: IllustrationStyleProfile["shading"];
  shape: IllustrationStyleProfile["shape"];
  character: IllustrationStyleProfile["character"] | null;
  texture: IllustrationStyleProfile["texture"];
  composition: IllustrationStyleProfile["composition"];
  classification: IllustrationStyleProfile["classification"];
}

// ─── Main analysis function ────────────────────────────────

/**
 * Analyze illustration style using Claude Vision with structured output.
 * Sends all reference images + programmatic stats to Claude.
 * Returns a complete IllustrationStyleProfile.
 */
export async function analyzeWithClaudeVision(
  input: AnalysisInput,
): Promise<IllustrationStyleProfile> {
  const client = getAnthropicClient();

  // Build image content blocks (base64 for local, URL for R2)
  const imageCount = input.imageBuffers?.length ?? input.imageUrls?.length ?? 0;
  const imageBlocks: Anthropic.Messages.ImageBlockParam[] = input.imageBuffers
    ? input.imageBuffers.map((img) => ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: img.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: img.buffer.toString("base64"),
        },
      }))
    : (input.imageUrls ?? []).map((url) => ({
        type: "image" as const,
        source: {
          type: "url" as const,
          url,
        },
      }));

  // Build programmatic data for the prompt
  const programmaticData = {
    colorPalettes: input.colorPalettes.map((p) => p.palette),
    mergedPalette: input.mergedPalette.palette,
    statsPerImage: input.statsPerImage.map((s) => ({
      entropy: s.entropy,
      brightness:
        s.channelStats.length >= 3
          ? Math.round(
              (s.channelStats[0].mean +
                s.channelStats[1].mean +
                s.channelStats[2].mean) /
                3,
            )
          : 128,
      contrast:
        s.channelStats.length >= 3
          ? Math.round(
              ((s.channelStats[0].stdDev +
                s.channelStats[1].stdDev +
                s.channelStats[2].stdDev) /
                3) *
                100,
            ) / 100
          : 50,
      hasAlpha: s.hasAlpha,
    })),
    avgStats: {
      avgEntropy: input.avgStats.avgEntropy,
      avgBrightness: input.avgStats.avgBrightness,
      avgContrast: input.avgStats.avgContrast,
    },
  };

  const userPrompt = buildIllustrationAnalysisPrompt(
    programmaticData,
    imageCount,
  );

  // Call Claude with images + structured prompt (120s timeout to avoid hanging)
  const sourceType = input.imageBuffers ? "base64" : "url";
  console.log(`[claude-vision] Sending ${imageBlocks.length} images to Claude (${sourceType})`);
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.error("[claude-vision] 120s timeout reached — aborting Claude API call");
    controller.abort();
  }, 120_000);

  let response: Anthropic.Messages.Message;
  try {
    response = await client.messages.create(
      {
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        system: ILLUSTRATION_ANALYSIS_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              ...imageBlocks,
              { type: "text" as const, text: userPrompt },
            ],
          },
        ],
      },
      { signal: controller.signal },
    );
    console.log(`[claude-vision] Claude responded (stop_reason: ${response.stop_reason}, tokens: ${response.usage?.output_tokens})`);
  } finally {
    clearTimeout(timeout);
  }

  // Extract JSON from response
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text response for style analysis");
  }

  const analysis = parseAnalysisResponse(textBlock.text);

  // Merge Claude's analysis with programmatic color data
  const mergedProfile = buildProfile(analysis, input);

  return mergedProfile;
}

// ─── Helpers ───────────────────────────────────────────────

function parseAnalysisResponse(text: string): ClaudeStyleAnalysis {
  // Try to extract JSON from the response (may be wrapped in markdown code blocks)
  let jsonStr = text;

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    // Try to find raw JSON object
    const braceStart = text.indexOf("{");
    const braceEnd = text.lastIndexOf("}");
    if (braceStart >= 0 && braceEnd > braceStart) {
      jsonStr = text.slice(braceStart, braceEnd + 1);
    }
  }

  try {
    return JSON.parse(jsonStr) as ClaudeStyleAnalysis;
  } catch {
    throw new Error(
      `Failed to parse Claude style analysis response as JSON: ${text.slice(0, 200)}...`,
    );
  }
}

function buildProfile(
  analysis: ClaudeStyleAnalysis,
  input: AnalysisInput,
): IllustrationStyleProfile {
  // Use programmatic color data (more precise) merged with Claude's role assignments
  const claudePalette = (analysis.color as Record<string, unknown>).palette as
    | { hex: string; percentage: number; role: string }[]
    | undefined;

  // Build merged palette: prefer programmatic hex+percentage, use Claude's role assignments
  const mergedPalette = input.mergedPalette.palette.map((progColor) => {
    // Find matching Claude color for role assignment
    const claudeMatch = claudePalette?.find(
      (cc) => cc.hex.toUpperCase() === progColor.hex.toUpperCase(),
    );
    return {
      hex: progColor.hex,
      percentage: progColor.population,
      role: claudeMatch?.role ?? "secondary",
    };
  });

  // Add any Claude-only colors not in programmatic palette
  if (claudePalette) {
    for (const cc of claudePalette) {
      const alreadyPresent = mergedPalette.some(
        (mc) => mc.hex.toUpperCase() === cc.hex.toUpperCase(),
      );
      if (!alreadyPresent) {
        mergedPalette.push({ hex: cc.hex, percentage: cc.percentage, role: cc.role });
      }
    }
  }

  // Sort by percentage descending
  mergedPalette.sort((a, b) => b.percentage - a.percentage);

  const colorSystem = {
    palette: mergedPalette,
    dominantHex: mergedPalette[0]?.hex ?? input.mergedPalette.dominantHex,
    colorCount: mergedPalette.length,
    saturationLevel: analysis.color.saturationLevel,
    contrastLevel: analysis.color.contrastLevel,
    temperature: analysis.color.temperature,
    harmonyType: analysis.color.harmonyType,
    usesGradients: analysis.color.usesGradients,
    usesTransparency: analysis.color.usesTransparency,
    backgroundTreatment: analysis.color.backgroundTreatment,
  };

  // Generate prompts from the analyzed profile
  const profileForPrompts = {
    line: analysis.line,
    color: colorSystem,
    shading: analysis.shading,
    shape: analysis.shape,
    texture: analysis.texture,
    classification: analysis.classification,
    character: analysis.character,
  };

  const generatedPrompts = generateStylePrompts(profileForPrompts);

  return {
    version: 1,
    analyzedAt: new Date().toISOString(),
    imageCount: input.imageUrls?.length ?? input.imageBuffers?.length ?? 0,
    line: analysis.line,
    color: colorSystem,
    shading: analysis.shading,
    shape: analysis.shape,
    character: analysis.character ?? undefined,
    texture: analysis.texture,
    composition: analysis.composition,
    classification: analysis.classification,
    generatedPrompts,
  };
}
