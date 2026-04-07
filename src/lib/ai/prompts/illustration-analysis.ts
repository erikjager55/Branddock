// =============================================================
// Claude Vision Prompts for Illustration Style Analysis
// =============================================================

/**
 * System prompt for illustration style analysis.
 * Instructs Claude to act as an expert visual designer.
 */
export const ILLUSTRATION_ANALYSIS_SYSTEM_PROMPT = `You are an expert visual designer, illustrator, and brand identity specialist. Your task is to analyze the visual STYLE of illustration images — NOT their content or subject matter.

You have deep knowledge of illustration techniques, color theory, typography, and design systems. You can identify subtle differences in line weight, color harmony, shading approaches, and compositional patterns.

When analyzing illustrations, focus exclusively on HOW they are drawn/designed, not WHAT they depict. Two illustrations of completely different subjects can share the exact same style.

You will receive multiple example illustrations that share a common style. Analyze the CONSENSUS style across all images — identify what is consistent, not what varies.

You will also receive programmatic color and image statistics to ground your analysis with objective data. Use these to validate and refine your hex color values and quantitative assessments.

IMPORTANT: Return hex color values that match the programmatic extraction data when available — the programmatic values are more precise than visual estimation.`;

/**
 * Build the user prompt for style analysis.
 * Includes programmatic stats to ground the analysis.
 */
export function buildIllustrationAnalysisPrompt(
  programmaticData: {
    colorPalettes: { hex: string; population: number; name: string }[][];
    mergedPalette: { hex: string; population: number; name: string }[];
    statsPerImage: {
      entropy: number;
      brightness: number;
      contrast: number;
      hasAlpha: boolean;
    }[];
    avgStats: {
      avgEntropy: number;
      avgBrightness: number;
      avgContrast: number;
    };
  },
  imageCount: number,
): string {
  const paletteLines = programmaticData.mergedPalette
    .map((c) => `  ${c.hex} — ${c.population}% (${c.name})`)
    .join("\n");

  const statsLines = programmaticData.statsPerImage
    .map(
      (s, i) =>
        `  Image ${i + 1}: entropy=${s.entropy}, brightness=${s.brightness}, contrast=${s.contrast}, alpha=${s.hasAlpha}`,
    )
    .join("\n");

  return `Analyze the visual style of these ${imageCount} illustrations. They all share the same illustration style.

## Programmatic Color Data (precise measurements)
Merged color palette across all images:
${paletteLines}

## Programmatic Image Stats
${statsLines}
Averages: entropy=${programmaticData.avgStats.avgEntropy}, brightness=${programmaticData.avgStats.avgBrightness}, contrast=${programmaticData.avgStats.avgContrast}

Low entropy (< 5) indicates flat/simple fills. High entropy (> 7) indicates detailed/textured surfaces.
Low contrast (stdDev < 40) indicates muted/pastel palette. High contrast (> 70) indicates vivid/bold palette.

## Analysis Instructions
Analyze the CONSENSUS STYLE across all images. For each category, describe what is CONSISTENT across the illustrations.

Use the programmatic hex values above for color analysis — they are more precise than visual estimation. You may identify additional colors the algorithm missed, but prefer the measured values.

Return your analysis as a JSON object matching this exact structure:

{
  "line": {
    "hasOutlines": boolean,
    "weight": "thin" | "medium" | "thick" | "variable" | "none",
    "weightPx": number | null,
    "consistency": "monoline" | "slight-variation" | "calligraphic" | "sketchy",
    "strokeColor": "hex value or description",
    "cornerStyle": "sharp" | "rounded" | "mixed",
    "cornerRadius": number | null,
    "lineCap": "butt" | "round" | "square",
    "confidence": "precise" | "slightly-imperfect" | "hand-drawn"
  },
  "color": {
    "palette": [{ "hex": "#RRGGBB", "percentage": number, "role": "primary|secondary|accent|background|neutral" }],
    "dominantHex": "#RRGGBB",
    "colorCount": number,
    "saturationLevel": "low" | "medium" | "high",
    "contrastLevel": "low" | "medium" | "high",
    "temperature": "warm" | "cool" | "neutral",
    "harmonyType": "string description",
    "usesGradients": boolean,
    "usesTransparency": boolean,
    "backgroundTreatment": "white" | "colored" | "transparent" | "gradient"
  },
  "shading": {
    "type": "flat" | "cel-shaded" | "soft-gradient" | "hatched" | "stippled" | "none",
    "shadowPresence": boolean,
    "shadowStyle": "string or null",
    "highlightPresence": boolean,
    "dimensionality": "2d-flat" | "2.5d" | "isometric" | "3d"
  },
  "shape": {
    "primaryGeometry": "circular" | "rectangular" | "triangular" | "organic" | "mixed",
    "simplificationLevel": 1-10,
    "edgeTreatment": "clean" | "rough" | "textured",
    "symmetry": "strict" | "approximate" | "asymmetric"
  },
  "character": {
    "present": boolean,
    "headToBodyRatio": number | null,
    "facialDetail": "minimal" | "simple" | "moderate" | "detailed",
    "eyeStyle": "string or null",
    "handStyle": "string or null",
    "bodyType": "string or null"
  } | null,
  "texture": {
    "fillType": "flat" | "gradient" | "grain" | "halftone" | "pattern" | "painterly",
    "grainPresence": boolean,
    "grainIntensity": 0-100 | null,
    "surfaceDetail": "clean" | "subtle" | "heavy"
  },
  "composition": {
    "density": "sparse" | "balanced" | "dense",
    "perspective": "flat" | "isometric" | "slight-perspective" | "full-perspective",
    "whitespaceUsage": "generous" | "moderate" | "minimal"
  },
  "classification": {
    "primaryStyle": "e.g. flat-vector, isometric, hand-drawn, line-art, geometric, etc.",
    "subStyle": "string or null",
    "moodTags": ["3-5 mood/feeling tags"],
    "eraInfluences": ["design era influences if any"] | null
  }
}

Be precise. Use exact hex values from the programmatic data. Rate simplification on 1-10 where 1 is photorealistic detail and 10 is maximally abstract/iconic.`;
}

/**
 * Generate style and negative prompts from the analyzed profile.
 * This creates the optimal text prompt for reproducing the style.
 */
export function generateStylePrompts(profile: {
  line: { hasOutlines: boolean; weight: string; consistency: string; strokeColor: string; cornerStyle: string; confidence: string };
  color: { palette: { hex: string; percentage: number; role: string }[]; saturationLevel: string; contrastLevel: string; temperature: string; usesGradients: boolean; backgroundTreatment: string };
  shading: { type: string; shadowPresence: boolean; dimensionality: string };
  shape: { primaryGeometry: string; simplificationLevel: number; edgeTreatment: string };
  texture: { fillType: string; grainPresence: boolean; surfaceDetail: string };
  classification: { primaryStyle: string; subStyle?: string; moodTags: string[] };
  character?: { present: boolean; facialDetail: string; bodyType?: string } | null;
}): { stylePrompt: string; negativePrompt: string; trainingCaptionSuffix: string } {
  const parts: string[] = [];
  const negativeParts: string[] = [];

  // Style classification
  parts.push(`${profile.classification.primaryStyle} illustration`);
  if (profile.classification.subStyle) {
    parts.push(profile.classification.subStyle);
  }

  // Line work
  if (profile.line.hasOutlines) {
    parts.push(`${profile.line.weight} ${profile.line.consistency} outlines`);
    if (profile.line.strokeColor.startsWith("#")) {
      parts.push(`${profile.line.strokeColor} stroke color`);
    }
    if (profile.line.cornerStyle === "rounded") {
      parts.push("rounded corners");
    }
  } else {
    parts.push("no outlines");
    negativeParts.push("outlines");
  }

  // Color
  const topColors = profile.color.palette
    .slice(0, 5)
    .map((c) => c.hex)
    .join(", ");
  parts.push(`color palette: ${topColors}`);
  parts.push(`${profile.color.saturationLevel} saturation`);
  parts.push(`${profile.color.temperature} temperature`);

  if (!profile.color.usesGradients) {
    parts.push("solid color fills");
    negativeParts.push("gradients");
  }

  parts.push(`${profile.color.backgroundTreatment} background`);

  // Shading
  if (profile.shading.type === "flat" || profile.shading.type === "none") {
    parts.push("flat colors, no shading");
    negativeParts.push("shading", "shadows", "3d rendering");
  } else {
    parts.push(`${profile.shading.type} shading`);
  }

  if (!profile.shading.shadowPresence) {
    negativeParts.push("drop shadows");
  }

  parts.push(profile.shading.dimensionality.replace("-", " "));

  // Shape
  parts.push(`${profile.shape.primaryGeometry} shapes`);
  if (profile.shape.simplificationLevel >= 7) {
    parts.push("highly simplified, minimal detail");
    negativeParts.push("realistic detail", "complex detail");
  } else if (profile.shape.simplificationLevel >= 4) {
    parts.push("moderately simplified");
  }

  parts.push(`${profile.shape.edgeTreatment} edges`);

  // Texture
  if (profile.texture.fillType === "flat") {
    parts.push("smooth flat fills");
    negativeParts.push("texture", "noise", "grain");
  } else {
    parts.push(`${profile.texture.fillType} fill texture`);
  }

  if (!profile.texture.grainPresence) {
    negativeParts.push("film grain");
  }

  // Character
  if (profile.character?.present) {
    parts.push(`${profile.character.facialDetail} facial features`);
    if (profile.character.bodyType) {
      parts.push(`${profile.character.bodyType} body proportions`);
    }
  }

  // Mood
  if (profile.classification.moodTags.length > 0) {
    parts.push(profile.classification.moodTags.join(", ") + " mood");
  }

  // Always exclude
  negativeParts.push("photorealistic", "photograph", "watermark", "text overlay");

  const stylePrompt = parts.join(", ");
  const negativePrompt = negativeParts.join(", ");

  // Training caption suffix — shorter version for LoRA captions
  const captionParts = [
    profile.classification.primaryStyle,
    profile.line.hasOutlines ? `${profile.line.weight} outlines` : "no outlines",
    profile.shading.type === "flat" ? "flat colors" : profile.shading.type,
    profile.shape.edgeTreatment + " edges",
  ];

  return {
    stylePrompt,
    negativePrompt,
    trainingCaptionSuffix: captionParts.join(", "),
  };
}
