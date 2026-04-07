// =============================================================
// Illustration Style Profile Types
// =============================================================

/** Color swatch with usage percentage and role */
export interface StyleColor {
  hex: string;
  percentage: number;
  role: string; // "primary" | "secondary" | "accent" | "background" | "neutral"
}

/** Line work characteristics */
export interface StyleLineWork {
  hasOutlines: boolean;
  weight: "thin" | "medium" | "thick" | "variable" | "none";
  weightPx?: number;
  consistency:
    | "monoline"
    | "slight-variation"
    | "calligraphic"
    | "sketchy";
  strokeColor: string;
  cornerStyle: "sharp" | "rounded" | "mixed";
  cornerRadius?: number;
  lineCap: "butt" | "round" | "square";
  confidence: "precise" | "slightly-imperfect" | "hand-drawn";
}

/** Color system characteristics */
export interface StyleColorSystem {
  palette: StyleColor[];
  dominantHex: string;
  colorCount: number;
  saturationLevel: "low" | "medium" | "high";
  contrastLevel: "low" | "medium" | "high";
  temperature: "warm" | "cool" | "neutral";
  harmonyType: string;
  usesGradients: boolean;
  usesTransparency: boolean;
  backgroundTreatment: "white" | "colored" | "transparent" | "gradient";
}

/** Shading and rendering approach */
export interface StyleShading {
  type:
    | "flat"
    | "cel-shaded"
    | "soft-gradient"
    | "hatched"
    | "stippled"
    | "none";
  shadowPresence: boolean;
  shadowStyle?: string;
  highlightPresence: boolean;
  dimensionality: "2d-flat" | "2.5d" | "isometric" | "3d";
}

/** Shape language */
export interface StyleShapeLanguage {
  primaryGeometry:
    | "circular"
    | "rectangular"
    | "triangular"
    | "organic"
    | "mixed";
  simplificationLevel: number; // 1-10
  edgeTreatment: "clean" | "rough" | "textured";
  symmetry: "strict" | "approximate" | "asymmetric";
}

/** Character design attributes (optional) */
export interface StyleCharacter {
  present: boolean;
  headToBodyRatio?: number;
  facialDetail: "minimal" | "simple" | "moderate" | "detailed";
  eyeStyle?: string;
  handStyle?: string;
  bodyType?: string;
}

/** Texture and surface treatment */
export interface StyleTexture {
  fillType:
    | "flat"
    | "gradient"
    | "grain"
    | "halftone"
    | "pattern"
    | "painterly";
  grainPresence: boolean;
  grainIntensity?: number; // 0-100
  surfaceDetail: "clean" | "subtle" | "heavy";
}

/** Composition characteristics */
export interface StyleComposition {
  density: "sparse" | "balanced" | "dense";
  perspective: "flat" | "isometric" | "slight-perspective" | "full-perspective";
  whitespaceUsage: "generous" | "moderate" | "minimal";
}

/** Style classification metadata */
export interface StyleClassification {
  primaryStyle: string;
  subStyle?: string;
  moodTags: string[];
  eraInfluences?: string[];
}

/** Auto-generated prompts derived from the profile */
export interface StyleGeneratedPrompts {
  stylePrompt: string;
  negativePrompt: string;
  trainingCaptionSuffix: string;
}

/** Complete illustration style profile — stored as JSON on ConsistentModel */
export interface IllustrationStyleProfile {
  version: number;
  analyzedAt: string;
  imageCount: number;

  line: StyleLineWork;
  color: StyleColorSystem;
  shading: StyleShading;
  shape: StyleShapeLanguage;
  character?: StyleCharacter;
  texture: StyleTexture;
  composition: StyleComposition;
  classification: StyleClassification;
  generatedPrompts: StyleGeneratedPrompts;
}

/** Result of validating a generated image against the style profile */
export interface StyleValidationResult {
  overallScore: number; // 0-1
  colorMatchScore: number;
  contrastMatchScore: number;
  deviations: string[];
}

/** Color extraction result from node-vibrant */
export interface ExtractedColorPalette {
  palette: { hex: string; population: number; name: string }[];
  dominantHex: string;
  colorCount: number;
}

/** Image statistics from sharp */
export interface ImageStats {
  width: number;
  height: number;
  channels: number;
  entropy: number;
  hasAlpha: boolean;
  format: string;
  channelStats: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  }[];
}
