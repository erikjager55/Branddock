// =============================================================
// Brand Kit — shared client-side types
// Shape mirrors the /api/export/brand-kit/data endpoint response.
// =============================================================

import type {
  StyleguideColor,
  TypeScaleLevel,
} from "../../types/brandstyle.types";

export interface BrandKitLogo {
  id: string;
  variant: "PRIMARY" | "LIGHT" | "DARK" | "ICON" | "WORDMARK" | "LOCKUP";
  fileUrl: string;
  fileName: string;
  fileType: string; // "svg" | "png" | "jpg"
  width: number | null;
  height: number | null;
  description: string | null;
  sortOrder: number;
}

export interface BrandKitWorkspace {
  id: string;
  name: string;
  slug: string;
  contentLanguage: string | null;
  createdAt: string;
  organization: {
    name: string;
    type: string;
    logoUrl: string | null;
  } | null;
}

export interface BrandKitStyleguide {
  id: string;
  colors: StyleguideColor[];
  logos: BrandKitLogo[];
  logoGuidelines: string[];
  logoDonts: string[];
  primaryFontName: string | null;
  primaryFontUrl: string | null;
  additionalFonts: string[];
  typeScale: TypeScaleLevel[] | null;
  // contentGuidelines / writingGuidelines / examplePhrases verhuisd naar
  // BrandKitVoiceguide (ADR 2026-05-15).
  photographyStyle: unknown;
  photographyGuidelines: string[];
  illustrationGuidelines: string[];
  imageryDonts: string[];
}

export interface BrandKitExamplePhrase {
  text: string;
  type: "do" | "dont";
}

export interface BrandKitVoiceguide {
  contentGuidelines: string[];
  writingGuidelines: string[];
  examplePhrases: BrandKitExamplePhrase[] | null;
}

export interface BrandKitBrandAsset {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  content: string | null;
  frameworkType: string | null;
  frameworkData: unknown;
  status: string;
  updatedAt: string;
}

export interface BrandKitPersona {
  id: string;
  name: string;
  tagline: string | null;
  avatarUrl: string | null;
  age: string | null;
  gender: string | null;
  location: string | null;
  occupation: string | null;
  income: string | null;
  education: string | null;
  familyStatus: string | null;
  personalityType: string | null;
  coreValues: string[];
  interests: string[];
  goals: string[];
  motivations: string[];
  frustrations: string[];
  behaviors: string[];
  preferredChannels: unknown;
  techStack: unknown;
  buyingTriggers: unknown;
  decisionCriteria: unknown;
  quote: string | null;
  bio: string | null;
  strategicImplications: string | null;
}

export interface BrandKitProductImage {
  url: string;
  category: string;
  altText: string | null;
  sortOrder: number;
}

export interface BrandKitProduct {
  id: string;
  name: string;
  category: string;
  description: string | null;
  pricingModel: string | null;
  pricingDetails: string | null;
  features: string[];
  benefits: string[];
  useCases: string[];
  sourceUrl: string | null;
  images: BrandKitProductImage[];
}

export interface BrandKitCompetitor {
  id: string;
  name: string;
  tier: string;
  competitiveScore: number | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  description: string | null;
  foundingYear: number | null;
  headquarters: string | null;
  employeeRange: string | null;
  valueProposition: string | null;
  targetAudience: string | null;
  differentiators: string[];
  mainOfferings: string[];
  pricingModel: string | null;
  strengths: string[];
  weaknesses: string[];
  toneOfVoice: string | null;
  messagingThemes: string[];
  visualStyleNotes: string | null;
}

export interface BrandKitData {
  workspace: BrandKitWorkspace;
  styleguide: BrandKitStyleguide | null;
  voiceguide: BrandKitVoiceguide | null;
  brandAssets: BrandKitBrandAsset[];
  personas: BrandKitPersona[];
  products: BrandKitProduct[];
  competitors: BrandKitCompetitor[];
  generatedAt: string;
}
