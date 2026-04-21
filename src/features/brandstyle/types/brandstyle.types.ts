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
  /** 'high' | 'medium' | 'low' — how confident the scraper is this is a brand token. */
  confidence: string | null;
  /** Origin label, e.g. 'acss', 'shadcn', 'css-variable', 'frequency'. */
  detectorSource: string | null;
  sortOrder: number;
}

export type FontRole = "DISPLAY" | "UI" | "EYEBROW_META" | "BODY";
export type FontSource = "DETECTED" | "UPLOADED";
export type FontAvailability =
  | "UPLOADED"
  | "GOOGLE_FONTS"
  | "ADOBE_FONTS"
  | "COMMERCIAL"
  | "UNKNOWN";
export type LogoVariant = "PRIMARY" | "LIGHT" | "DARK" | "ICON" | "WORDMARK" | "LOCKUP";
export type ReviewStatus = "PENDING" | "APPROVED" | "NEEDS_WORK";
export type ComponentTypeKey =
  | "BUTTON"
  | "FORM_INPUT"
  | "STATUS_CHIP"
  | "PRODUCT_CARD"
  | "FEATURE_ICON"
  | "TOP_NAVIGATION"
  | "QUOTE_BLOCK";

export interface StyleguideComponentData {
  id: string;
  type: ComponentTypeKey;
  label: string;
  sourceUrl: string | null;
  screenshotUrl: string | null;
  extractedStyles: Record<string, string | undefined>;
  previewHtml: string | null;
  confidence: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateComponentBody {
  label?: string;
  extractedStyles?: Record<string, string | undefined>;
  previewHtml?: string | null;
  sortOrder?: number;
}

export interface StyleguideReviewData {
  id: string;
  section: string;
  status: ReviewStatus;
  feedback: string | null;
  referenceImageUrl: string | null;
  reviewedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StyleguideFontData {
  id: string;
  name: string;
  role: FontRole;
  source: FontSource;
  availability: FontAvailability;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  fontFamily: string | null;
  weight: string | null;
  style: string | null;
  sortOrder: number;
  uploadedById: string | null;
  /** Adobe Fonts / Typekit kit id — auto-filled by scraper when it
   *  spots `use.typekit.net/{kit}.css`, or pasted by the user. When
   *  present the UI can load `https://use.typekit.net/{kitId}.css`
   *  for a live preview of the real font. */
  adobeFontsKitId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StyleguideLogoData {
  id: string;
  variant: LogoVariant;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  description: string | null;
  sortOrder: number;
  uploadedById: string | null;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Replaced by StyleguideLogoData. Kept for legacy logo-route response shape. */
export interface LogoVariation {
  id?: string;
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
  /** CSS framework fingerprints recognised during analysis, e.g. ['acss', 'elementor']. */
  detectedFrameworks: string[];
  /** Free-text error message if analysis failed (refuse-mode or pipeline error). */
  errorMessage?: string | null;

  // Brand Assets (Fase 1) + Components (Fase 5)
  logos: StyleguideLogoData[];
  fonts: StyleguideFontData[];
  components: StyleguideComponentData[];
  logoGuidelines: string[];
  logoDonts: string[];
  logoSavedForAi: boolean;
  /** @deprecated Kept temporarily for legacy callers — prefer `logos`. */
  logoVariations?: LogoVariation[] | null;

  // Review workflow + publish state (Fase 2)
  reviews: StyleguideReviewData[];
  published: boolean;
  publishedAt: string | null;

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

  /** Adobe Fonts / Typekit kit ID set by THIS workspace's user. Applies
   *  to all ADOBE_FONTS fonts across the styleguide — the UI uses this
   *  before falling back to the per-font scraper-detected kit (which is
   *  the source site's kit and usually domain-locked). */
  workspaceAdobeFontsKitId?: string | null;
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

// === Brand Assets API bodies (Fase 1) ===

export interface UpdateFontBody {
  role?: FontRole;
  weight?: string;
  style?: string;
  fontFamily?: string;
  sortOrder?: number;
  /** Adobe Fonts / Typekit kit id. Pass "" to clear. */
  adobeFontsKitId?: string | null;
}

export interface UpdateLogoBody {
  variant?: LogoVariant;
  description?: string | null;
  sortOrder?: number;
}

export interface UpdateReviewBody {
  status: ReviewStatus;
  feedback?: string | null;
  referenceImageUrl?: string | null;
}

export type StyleguideTab = "brand_assets" | "colors" | "typography" | "spacing" | "components" | "tone_of_voice" | "imagery" | "visual_system";

export type SaveForAiSection = "logo" | "colors" | "typography" | "tone-of-voice" | "imagery" | "design-language" | "visual-language";
