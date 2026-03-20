// Frontend types for Website Scanner

export interface StartScanResponse {
  id: string;
  status: string;
}

export interface ScanProgressResponse {
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
  results: MappedResultsResponse | null;
  errors: string[];
  cancelled: boolean;
  brandstyleStatus?: string | null;
  brandstyleError?: string | null;
}

export interface MappedResultsResponse {
  brandAssets: Array<{
    slug: string;
    frameworkData: Record<string, unknown>;
    confidence: number;
  }>;
  personas: Array<{
    name: string;
    fields: Record<string, unknown>;
    confidence: number;
  }>;
  products: Array<{
    name: string;
    fields: Record<string, unknown>;
    images: Array<{ url: string; category: string }>;
    confidence: number;
  }>;
  competitors: Array<{
    name: string;
    fields: Record<string, unknown>;
    confidence: number;
  }>;
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

export interface ApplyResultsResponse {
  success: boolean;
  applied: {
    assetsUpdated: number;
    personasCreated: number;
    productsCreated: number;
    competitorsCreated: number;
  };
}

export type ScanViewState = 'input' | 'scanning' | 'results' | 'applied';

export type ApplyBody =
  | { applyAll: boolean }
  | { categories: string[] };
