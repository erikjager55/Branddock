// =============================================================
// Visual Language (Vormentaal) Analyzer
//
// Uses Claude structured completion to analyze CSS heuristics +
// brand context into a VisualLanguageProfile with a ready-to-use
// promptFragment for AI generation.
// =============================================================

import { createClaudeStructuredCompletion } from "@/lib/ai/exploration/ai-caller";
import type {
  VisualLanguageProfile,
  CssVisualHeuristics,
} from "./visual-language.types";

// ─── Types ─────────────────────────────────────────────────

interface VisualLanguageContext {
  colors: string[];
  fonts: string[];
  photographyStyle?: string;
  designLanguageSummary?: string;
}

// ─── System Prompt ─────────────────────────────────────────

const VISUAL_LANGUAGE_SYSTEM = `You are an expert UI/UX designer and brand identity specialist. You analyze the visual language (vormentaal) of websites — the design DNA that determines how everything looks: corners, shadows, spacing, depth, shape language, color application, component patterns.

You receive quantitative CSS data (border-radius values, box-shadow declarations, spacing, gradients) and qualitative brand context (colors, fonts, design language). From this, you produce a structured visual language profile.

CRITICAL: The "promptFragment" field must be a concrete, actionable set of instructions that an AI model can follow when generating visual content for this brand. Be specific with pixel values, style names, and do/don't rules. Example:
"Use rounded corners (8px radius) on all containers. Buttons are pill-shaped with solid primary color fill. Subtle box shadows (0 2px 4px rgba(0,0,0,0.08)) for elevation. Spacious layout with generous whitespace. White and light gray alternating backgrounds. No gradients. Thin 1px gray borders on inputs."

Return JSON only, no markdown.`;

// ─── User Prompt Builder ───────────────────────────────────

function buildVisualLanguagePrompt(
  heuristics: CssVisualHeuristics,
  context: VisualLanguageContext,
  sourceUrl: string,
): string {
  const parts: string[] = [];

  parts.push(`Analyze the visual language of: ${sourceUrl}\n`);

  // CSS quantitative data
  parts.push("## CSS Heuristic Data (measured from stylesheets)\n");

  parts.push(`Border-radius: ${heuristics.borderRadius.values.length} declarations found.`);
  parts.push(`  Median: ${heuristics.borderRadius.median}px, Most common: ${heuristics.borderRadius.mostCommon}px`);
  parts.push(`  Variation: ${heuristics.borderRadius.hasVariation ? "high (mixed radii)" : "low (consistent)"}\n`);

  parts.push(`Box-shadow: ${heuristics.boxShadow.count} declarations.`);
  if (heuristics.boxShadow.count > 0) {
    parts.push(`  Subtle: ${heuristics.boxShadow.hasSubtle}, Bold: ${heuristics.boxShadow.hasBold}, Colored: ${heuristics.boxShadow.hasColored}`);
    parts.push(`  Samples: ${heuristics.boxShadow.samples.slice(0, 3).join(" | ")}\n`);
  }

  parts.push(`Borders: ${heuristics.borders.count} declarations.`);
  if (heuristics.borders.count > 0) {
    parts.push(`  Median width: ${heuristics.borders.medianWidth}px`);
  }

  parts.push(`\nSpacing: median ${heuristics.spacing.median}px.`);
  if (heuristics.spacing.gridBase) {
    parts.push(`  Grid system detected: ${heuristics.spacing.gridBase}px base`);
  }

  parts.push(`\nGradients: ${heuristics.gradients.count} found.`);
  parts.push(`Glassmorphism: ${heuristics.glassmorphism.detected ? "detected" : "not detected"} (backdrop-filter: ${heuristics.glassmorphism.backdropFilter}, semi-transparent bg: ${heuristics.glassmorphism.semiTransparentBg})\n`);

  // Brand context
  parts.push("## Brand Context\n");
  if (context.colors.length > 0) {
    parts.push(`Brand colors: ${context.colors.join(", ")}`);
  }
  if (context.fonts.length > 0) {
    parts.push(`Fonts: ${context.fonts.join(", ")}`);
  }
  if (context.photographyStyle) {
    parts.push(`Photography style: ${context.photographyStyle}`);
  }
  if (context.designLanguageSummary) {
    parts.push(`Design language notes: ${context.designLanguageSummary}`);
  }

  parts.push(`\n## Required Output\n`);
  parts.push(`Return a JSON object with this exact structure:
{
  "cornerRadius": { "dominant": "sharp|slightly-rounded|rounded|pill", "radiusPx": number, "consistency": "uniform|mixed" },
  "shadow": { "style": "none|subtle|medium|bold|colored", "elevation": "flat|low|medium|high", "color": "hex or null" },
  "line": { "borders": "none|thin|medium|thick", "dividers": "none|thin|thick|decorative", "decorativeLines": boolean },
  "shape": { "primary": "geometric|organic|mixed", "angularity": 1-10, "symmetry": "strict|approximate|asymmetric" },
  "space": { "density": "compact|balanced|spacious", "whitespaceRatio": 0-1, "sectionSpacing": "tight|normal|generous" },
  "depth": { "dimensionality": "flat-2d|subtle-layers|layered|deep-3d", "overlapping": boolean, "glassmorphism": boolean },
  "weight": { "overall": "light|balanced|heavy", "textDensity": "minimal|moderate|dense", "ornamentLevel": "none|subtle|moderate|rich" },
  "colorApplication": { "buttonStyle": "description", "backgroundApproach": "description", "accentUsage": "description", "gradientPresence": "none|subtle|prominent" },
  "components": { "cardStyle": "description", "buttonShape": "description", "inputStyle": "description", "spacingSystem": "description" },
  "summary": "2-3 sentence human-readable summary of the visual language",
  "promptFragment": "Concrete, actionable instructions for AI generation (specific px values, style names, do/don't rules)"
}`);

  return parts.join("\n");
}

// ─── Main Analysis Function ────────────────────────────────

/**
 * Analyze visual language from CSS heuristics + brand context.
 * Returns a structured profile with a ready-to-use promptFragment.
 */
export async function analyzeVisualLanguage(
  heuristics: CssVisualHeuristics,
  context: VisualLanguageContext,
  sourceUrl: string,
): Promise<VisualLanguageProfile> {
  const prompt = buildVisualLanguagePrompt(heuristics, context, sourceUrl);

  const result = await createClaudeStructuredCompletion<
    Omit<VisualLanguageProfile, "version" | "analyzedAt" | "sourceUrl">
  >(
    VISUAL_LANGUAGE_SYSTEM,
    prompt,
    { temperature: 0.2, maxTokens: 4096 },
  );

  return {
    version: 1,
    analyzedAt: new Date().toISOString(),
    sourceUrl,
    cornerRadius: result.cornerRadius,
    shadow: result.shadow,
    line: result.line,
    shape: result.shape,
    space: result.space,
    depth: result.depth,
    weight: result.weight,
    colorApplication: result.colorApplication,
    components: result.components,
    summary: result.summary,
    promptFragment: result.promptFragment,
  };
}
