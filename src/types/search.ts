// =============================================================
// Search Types (S8)
// =============================================================

export interface SearchParams {
  query: string;
  type?: 'all' | 'brand_assets' | 'personas' | 'products' | 'insights' | 'campaigns';
  limit?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  type: string;
  description: string | null;
  href: string;
  icon: string;
}

export interface SearchResponse {
  results: SearchResult[];
}
