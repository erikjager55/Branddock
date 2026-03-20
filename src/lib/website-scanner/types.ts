// =============================================================
// Website Scanner — Shared Types
// =============================================================

export interface CrawledPage {
  url: string;
  title: string | null;
  pageType: string;
  bodyText: string;
  images: Array<{ url: string; alt: string | null; context: string }>;
}

export interface WebsiteExtraction {
  companyProfile: {
    name: string;
    tagline: string | null;
    description: string;
    foundingYear: number | null;
    headquarters: string | null;
    industry: string | null;
    employeeRange: string | null;
    socialLinks: Record<string, string>;
  };
  productsAndServices: Array<{
    name: string;
    description: string;
    category: string;
    features: string[];
    benefits: string[];
    pricingModel: string | null;
    imageUrls: string[];
  }>;
  targetAudience: Array<{
    name: string;
    description: string;
    demographics: Record<string, string>;
    needs: string[];
    painPoints: string[];
  }>;
  brandSignals: {
    toneDescription: string;
    writingStyle: string;
    keyThemes: string[];
    wordsUsed: string[];
  };
  mentionedCompetitors: Array<{
    name: string;
    relationship: string;
  }>;
  visualBranding: {
    primaryColors: string[];
    logoDescription: string | null;
  };
}

export interface MappedBrandAsset {
  slug: string;
  frameworkData: Record<string, unknown>;
  confidence: number;
}

export interface MappedPersona {
  name: string;
  fields: Record<string, unknown>;
  confidence: number;
}

export interface MappedProduct {
  name: string;
  fields: Record<string, unknown>;
  images: Array<{ url: string; category: string }>;
  confidence: number;
}

export interface MappedCompetitor {
  name: string;
  fields: Record<string, unknown>;
  confidence: number;
}

export interface MappedResults {
  brandAssets: MappedBrandAsset[];
  personas: MappedPersona[];
  products: MappedProduct[];
  competitors: MappedCompetitor[];
  strategyHints: {
    objectives: string[];
    focusAreas: string[];
  };
  trendSignals: Array<{
    title: string;
    description: string;
    category: string;
  }>;
  workspaceUpdates: {
    websiteUrl: string;
    industry?: string;
  };
}

export type ScanPhase = 'crawling' | 'extracting' | 'analyzing' | 'mapping' | 'styling' | 'completed' | 'failed' | 'cancelled';

export interface ScanProgress {
  id: string;
  status: string;
  progress: number;
  pagesDiscovered: number;
  pagesCrawled: number;
  currentPage: string | null;
  crawledPages: Array<{ url: string; title: string; pageType: string }>;
  currentCategory: string | null;
  categoriesDone: number;
  categoriesTotal: number;
  results: MappedResults | null;
  errors: string[];
  cancelled: boolean;
  brandstyleStatus: string | null;
  brandstyleError: string | null;
}
