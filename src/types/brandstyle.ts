export type StyleguideStatus = "DRAFT" | "ANALYZING" | "COMPLETE" | "ERROR";
export type StyleguideSource = "URL" | "PDF";
export type AnalysisStatus =
  | "PENDING"
  | "SCANNING_STRUCTURE"
  | "EXTRACTING_COLORS"
  | "ANALYZING_TYPOGRAPHY"
  | "DETECTING_COMPONENTS"
  | "GENERATING_STYLEGUIDE"
  | "COMPLETE"
  | "ERROR";
export type ColorCategory =
  | "PRIMARY"
  | "SECONDARY"
  | "ACCENT"
  | "NEUTRAL"
  | "SEMANTIC";

export interface BrandStyleguide {
  id: string;
  status: StyleguideStatus;
  sourceType: StyleguideSource;
  sourceUrl: string | null;
  sourceFileName: string | null;
  createdBy: { name: string; avatarUrl: string | null };
  createdAt: string;
  logo: LogoSection;
  colors: ColorsSection;
  typography: TypographySection;
  toneOfVoice: ToneOfVoiceSection;
  imagery: ImagerySection;
}

export interface LogoSection {
  variations: LogoVariation[];
  guidelines: string[];
  donts: string[];
  savedForAi: boolean;
}

export interface LogoVariation {
  name: string;
  url: string;
  type: "primary" | "white" | "icon";
}

export interface ColorsSection {
  colors: StyleguideColorItem[];
  donts: string[];
  savedForAi: boolean;
}

export interface StyleguideColorItem {
  id: string;
  name: string;
  hex: string;
  rgb: string | null;
  hsl: string | null;
  cmyk: string | null;
  category: ColorCategory;
  tags: string[];
  notes: string | null;
  contrastWhite: string | null;
  contrastBlack: string | null;
  sortOrder: number;
}

export interface TypographySection {
  primaryFontName: string | null;
  primaryFontUrl: string | null;
  typeScale: TypeScaleItem[];
  savedForAi: boolean;
}

export interface TypeScaleItem {
  level: string;
  name: string;
  size: string;
  lineHeight: string;
  weight: string;
  letterSpacing: string;
}

export interface ToneOfVoiceSection {
  contentGuidelines: string[];
  writingGuidelines: string[];
  examplePhrases: ExamplePhrase[];
  savedForAi: boolean;
}

export interface ExamplePhrase {
  text: string;
  type: "do" | "dont";
}

export interface ImagerySection {
  photographyStyle: {
    style: string;
    mood: string;
    composition: string;
  } | null;
  photographyGuidelines: string[];
  illustrationGuidelines: string[];
  donts: string[];
  savedForAi: boolean;
}

// Analysis
export interface AnalysisStatusResponse {
  jobId: string;
  status: AnalysisStatus;
  currentStep: number;
  totalSteps: number;
  steps: AnalysisStep[];
  error?: string;
}

export interface AnalysisStep {
  name: string;
  status: "pending" | "in_progress" | "complete";
}

export const ANALYSIS_STEPS = [
  "Scanning website structure",
  "Extracting color palette",
  "Analyzing typography",
  "Detecting component styles",
  "Generating styleguide",
] as const;

// API Bodies
export interface AnalyzeUrlBody {
  url: string;
}

export interface AddColorBody {
  name: string;
  hex: string;
  category?: ColorCategory;
  tags?: string[];
}

// AI Context
export interface AiContextResponse {
  logo: LogoSection | null;
  colors: ColorsSection | null;
  typography: TypographySection | null;
  toneOfVoice: ToneOfVoiceSection | null;
  imagery: ImagerySection | null;
}

// Tab config
export type StyleguideTab =
  | "logo"
  | "colors"
  | "typography"
  | "tone_of_voice"
  | "imagery";

export const STYLEGUIDE_TAB_CONFIG: Record<
  StyleguideTab,
  { label: string; icon: string }
> = {
  logo: { label: "Logo", icon: "Image" },
  colors: { label: "Colors", icon: "Palette" },
  typography: { label: "Typography", icon: "Type" },
  tone_of_voice: { label: "Tone of Voice", icon: "MessageCircle" },
  imagery: { label: "Imagery", icon: "Camera" },
};

export const COLOR_CATEGORY_CONFIG: Record<
  ColorCategory,
  { label: string; color: string }
> = {
  PRIMARY: { label: "Primary", color: "bg-teal-100 text-teal-700" },
  SECONDARY: { label: "Secondary", color: "bg-blue-100 text-blue-700" },
  ACCENT: { label: "Accent", color: "bg-purple-100 text-purple-700" },
  NEUTRAL: { label: "Neutral", color: "bg-gray-100 text-gray-600" },
  SEMANTIC: { label: "Semantic", color: "bg-amber-100 text-amber-700" },
};
