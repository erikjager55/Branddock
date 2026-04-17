// =============================================================
// Brandstyle Types
// =============================================================

export interface StyleguideColor {
  id: string;
  name: string;
  hex: string;
  rgb: string | null;
  hsl: string | null;
  cmyk: string | null;
  category: "PRIMARY" | "SECONDARY" | "ACCENT" | "NEUTRAL" | "SEMANTIC";
  tags: string[];
  notes: string | null;
  contrastWhite: string | null;
  contrastBlack: string | null;
  sortOrder: number;
}

export interface LogoVariation {
  name: string;
  url: string;
  type: string;
}

export interface TypeScaleLevel {
  level: string;
  name: string;
  size: string;
  lineHeight: string;
  weight: string;
  color?: string;
  letterSpacing?: string;
  usage?: string;
}

export interface ExamplePhrase {
  text: string;
  type: "do" | "dont";
}

export interface PhotographyStyle {
  mood?: string;
  subjects?: string;
  composition?: string;
  style?: string;
}

export interface BrandImage {
  url: string;
  alt: string | null;
  context: 'hero' | 'lifestyle' | 'product' | 'team' | 'general';
}

// Design Language
export interface GraphicElementsData {
  brandShapes?: string[];
  decorativeElements?: string[];
  visualDevices?: string[];
  usageNotes?: string;
}

export interface PatternsTexturesData {
  patterns?: string[];
  textures?: string[];
  backgrounds?: string[];
  usageNotes?: string;
}

export interface IconographyStyleData {
  style?: string;           // "line" | "fill" | "duo-tone" | "custom"
  strokeWeight?: string;
  cornerRadius?: string;
  sizing?: string;
  colorUsage?: string;
  usageNotes?: string;
}

export interface GradientDefinition {
  name: string;
  type: string;             // "linear" | "radial" | "conic"
  colors: string[];
  angle?: string;
  usage?: string;
}

export interface LayoutPrinciplesData {
  gridSystem?: string;
  spacingScale?: string;
  whitespacePhilosophy?: string;
  compositionRules?: string[];
  usageNotes?: string;
}

export interface DesignLanguageSection {
  graphicElements: GraphicElementsData | null;
  graphicElementsDonts: string[];
  patternsTextures: PatternsTexturesData | null;
  iconographyStyle: IconographyStyleData | null;
  iconographyDonts: string[];
  gradientsEffects: GradientDefinition[] | null;
  layoutPrinciples: LayoutPrinciplesData | null;
  designLanguageSavedForAi: boolean;
}

export interface BrandStyleguide {
  id: string;
  status: "DRAFT" | "ANALYZING" | "COMPLETE" | "ERROR";
  sourceType: "URL" | "PDF" | null;
  sourceUrl: string | null;
  sourceFileName: string | null;
  analysisJobId: string | null;
  analysisStatus: string;

  // Logo
  logoVariations: LogoVariation[] | null;
  logoGuidelines: string[];
  logoDonts: string[];
  logoSavedForAi: boolean;

  // Colors
  colors: StyleguideColor[];
  colorDonts: string[];
  colorsSavedForAi: boolean;

  // Typography
  primaryFontName: string | null;
  primaryFontUrl: string | null;
  additionalFonts: string[];
  typeScale: TypeScaleLevel[] | null;
  typographySavedForAi: boolean;

  // Tone of Voice
  contentGuidelines: string[];
  writingGuidelines: string[];
  examplePhrases: ExamplePhrase[] | null;
  toneSavedForAi: boolean;

  // Imagery
  photographyStyle: PhotographyStyle | null;
  photographyGuidelines: string[];
  illustrationGuidelines: string[];
  imageryDonts: string[];
  imagerySavedForAi: boolean;
  /** @deprecated Scraped images are now routed to the Media Library. */
  brandImages: BrandImage[] | null;

  // Design Language
  graphicElements: GraphicElementsData | null;
  graphicElementsDonts: string[];
  patternsTextures: PatternsTexturesData | null;
  iconographyStyle: IconographyStyleData | null;
  iconographyDonts: string[];
  gradientsEffects: GradientDefinition[] | null;
  layoutPrinciples: LayoutPrinciplesData | null;
  designLanguageSavedForAi: boolean;

  // Visual Language
  visualLanguage: unknown | null;
  visualLanguageSavedForAi: boolean;

  // Lock
  isLocked: boolean;
  lockedAt: string | null;
  lockedById: string | null;
  lockedBy: { id: string; name: string } | null;

  // Meta
  createdBy: { id: string; name: string | null; avatarUrl: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisStep {
  name: string;
  status: "pending" | "active" | "complete";
}

export interface AnalysisStatusResponse {
  jobId: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  steps: AnalysisStep[];
  error?: string;
}

export interface LogoSection {
  logoVariations: LogoVariation[] | null;
  logoGuidelines: string[];
  logoDonts: string[];
  logoSavedForAi: boolean;
}

export interface ColorsSection {
  colors: StyleguideColor[];
  colorDonts: string[];
  colorsSavedForAi: boolean;
}

export interface TypographySection {
  primaryFontName: string | null;
  primaryFontUrl: string | null;
  additionalFonts: string[];
  typeScale: TypeScaleLevel[] | null;
  typographySavedForAi: boolean;
}

export interface ToneOfVoiceSection {
  contentGuidelines: string[];
  writingGuidelines: string[];
  examplePhrases: ExamplePhrase[] | null;
  toneSavedForAi: boolean;
}

export interface ImagerySection {
  photographyStyle: PhotographyStyle | null;
  photographyGuidelines: string[];
  illustrationGuidelines: string[];
  imageryDonts: string[];
  imagerySavedForAi: boolean;
  brandImages: BrandImage[] | null;
}

export interface AiContextResponse {
  context: Record<string, unknown> | null;
}

export type StyleguideTab = "logo" | "colors" | "typography" | "tone_of_voice" | "imagery" | "visual_system";

export type SaveForAiSection = "logo" | "colors" | "typography" | "tone-of-voice" | "imagery" | "design-language" | "visual-language";
