/**
 * GLOBAL SEARCH SERVICE
 * 
 * Provides intelligent search across all entities in the application.
 * Supports fuzzy matching, relevance scoring, and filtering.
 */

import { SearchResult, SearchSection, SearchConfig, SearchResultType } from '../types/workflow';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { mockPersonas } from '../data/mock-personas';

const DEFAULT_CONFIG: SearchConfig = {
  placeholder: 'Search everything...',
  maxResults: 50,
  minSearchLength: 2,
  debounceMs: 150,
  fuzzyMatch: true
};

class GlobalSearchService {
  private config: SearchConfig;

  constructor(config: Partial<SearchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Perform search across all entities
   */
  search(query: string): SearchSection[] {
    if (!query || query.length < (this.config.minSearchLength || 2)) {
      return this.getDefaultSections();
    }

    const normalizedQuery = query.toLowerCase().trim();
    const sections: SearchSection[] = [];

    // Search brand assets
    const brandResults = this.searchBrandAssets(normalizedQuery);
    if (brandResults.length > 0) {
      sections.push({
        id: 'brand-assets',
        label: 'Brand Assets',
        results: brandResults.slice(0, 5)
      });
    }

    // Search personas
    const personaResults = this.searchPersonas(normalizedQuery);
    if (personaResults.length > 0) {
      sections.push({
        id: 'personas',
        label: 'Personas',
        results: personaResults.slice(0, 5)
      });
    }

    // Search research methods
    const researchResults = this.searchResearchMethods(normalizedQuery);
    if (researchResults.length > 0) {
      sections.push({
        id: 'research-methods',
        label: 'Research Methods',
        results: researchResults.slice(0, 5)
      });
    }

    // Search actions/commands
    const actionResults = this.searchActions(normalizedQuery);
    if (actionResults.length > 0) {
      sections.push({
        id: 'actions',
        label: 'Quick Actions',
        results: actionResults.slice(0, 5)
      });
    }

    // Search pages
    const pageResults = this.searchPages(normalizedQuery);
    if (pageResults.length > 0) {
      sections.push({
        id: 'pages',
        label: 'Pages',
        results: pageResults.slice(0, 5)
      });
    }

    return sections;
  }

  /**
   * Get default sections when no query
   */
  private getDefaultSections(): SearchSection[] {
    return [
      {
        id: 'quick-actions',
        label: 'Quick Actions',
        results: [
          {
            id: 'new-research',
            type: 'action',
            title: 'Start New Research',
            subtitle: 'Create a research plan',
            icon: 'Plus',
            action: () => console.log('New research')
          },
          {
            id: 'new-persona',
            type: 'action',
            title: 'Create Persona',
            subtitle: 'Add a new persona',
            icon: 'UserPlus',
            action: () => console.log('New persona')
          },
          {
            id: 'view-relationships',
            type: 'action',
            title: 'View Relationships',
            subtitle: 'See data connections',
            icon: 'Network',
            route: 'relationships'
          }
        ]
      },
      {
        id: 'pages',
        label: 'Go To',
        results: this.getAllPages()
      }
    ];
  }

  /**
   * Search brand assets
   */
  private searchBrandAssets(query: string): SearchResult[] {
    return mockBrandAssets
      .filter(asset => {
        const titleMatch = asset.title.toLowerCase().includes(query);
        const descMatch = asset.description?.toLowerCase().includes(query);
        return titleMatch || descMatch;
      })
      .map(asset => ({
        id: asset.id,
        type: 'brand-asset' as SearchResultType,
        title: asset.title,
        subtitle: asset.category,
        description: asset.description,
        icon: 'Palette',
        route: `brand-${asset.id}`,
        metadata: {
          status: asset.status,
          category: asset.category,
          score: this.calculateRelevance(query, asset.title, asset.description)
        }
      }))
      .sort((a, b) => (b.metadata?.score || 0) - (a.metadata?.score || 0));
  }

  /**
   * Search personas
   */
  private searchPersonas(query: string): SearchResult[] {
    return mockPersonas
      .filter(persona => {
        const nameMatch = persona.name.toLowerCase().includes(query);
        const roleMatch = persona.role.toLowerCase().includes(query);
        const descMatch = persona.description?.toLowerCase().includes(query);
        return nameMatch || roleMatch || descMatch;
      })
      .map(persona => ({
        id: persona.id,
        type: 'persona' as SearchResultType,
        title: persona.name,
        subtitle: persona.role,
        description: persona.description,
        icon: 'Users',
        route: `personas/${persona.id}`,
        metadata: {
          score: this.calculateRelevance(query, persona.name, persona.description)
        }
      }))
      .sort((a, b) => (b.metadata?.score || 0) - (a.metadata?.score || 0));
  }

  /**
   * Search research methods
   */
  private searchResearchMethods(query: string): SearchResult[] {
    const methods = [
      { id: 'workshop', title: 'Workshop', description: 'Collaborative team sessions' },
      { id: 'survey', title: 'Strategic Survey', description: 'Quantitative data collection' },
      { id: 'interview', title: '1-on-1 Interviews', description: 'Deep qualitative insights' },
      { id: 'ai', title: 'AI Exploration', description: 'AI-powered research' }
    ];

    return methods
      .filter(method => {
        const titleMatch = method.title.toLowerCase().includes(query);
        const descMatch = method.description.toLowerCase().includes(query);
        return titleMatch || descMatch;
      })
      .map(method => ({
        id: method.id,
        type: 'research-method' as SearchResultType,
        title: method.title,
        subtitle: 'Research Method',
        description: method.description,
        icon: 'Target',
        route: `research/${method.id}`,
        metadata: {
          score: this.calculateRelevance(query, method.title, method.description)
        }
      }));
  }

  /**
   * Search quick actions/commands
   */
  private searchActions(query: string): SearchResult[] {
    const actions = [
      { 
        id: 'new-research', 
        title: 'Start New Research', 
        description: 'Create a new research plan',
        keywords: ['new', 'create', 'start', 'research', 'plan']
      },
      { 
        id: 'new-persona', 
        title: 'Create Persona', 
        description: 'Add a new persona',
        keywords: ['new', 'create', 'persona', 'add', 'user']
      },
      { 
        id: 'export', 
        title: 'Export Data', 
        description: 'Export brand data to PDF',
        keywords: ['export', 'download', 'pdf', 'save']
      },
      { 
        id: 'settings', 
        title: 'Open Settings', 
        description: 'Configure application settings',
        keywords: ['settings', 'config', 'preferences']
      }
    ];

    return actions
      .filter(action => {
        const titleMatch = action.title.toLowerCase().includes(query);
        const descMatch = action.description.toLowerCase().includes(query);
        const keywordMatch = action.keywords.some(k => k.includes(query));
        return titleMatch || descMatch || keywordMatch;
      })
      .map(action => ({
        id: action.id,
        type: 'action' as SearchResultType,
        title: action.title,
        subtitle: 'Quick Action',
        description: action.description,
        icon: 'Zap',
        action: () => console.log(`Execute: ${action.id}`),
        metadata: {
          score: this.calculateRelevance(query, action.title, action.description)
        }
      }));
  }

  /**
   * Search pages
   */
  private searchPages(query: string): SearchResult[] {
    return this.getAllPages()
      .filter(page => {
        const titleMatch = page.title.toLowerCase().includes(query);
        const descMatch = page.description?.toLowerCase().includes(query);
        return titleMatch || descMatch;
      });
  }

  /**
   * Get all pages for navigation
   */
  private getAllPages(): SearchResult[] {
    return [
      { 
        id: 'dashboard', 
        type: 'page' as SearchResultType, 
        title: 'Dashboard', 
        description: 'Overview and statistics',
        icon: 'Home', 
        route: 'dashboard' 
      },
      { 
        id: 'research', 
        type: 'page' as SearchResultType, 
        title: 'Research Hub', 
        description: 'Manage research plans and methods',
        icon: 'Target', 
        route: 'research' 
      },
      { 
        id: 'brand', 
        type: 'page' as SearchResultType, 
        title: 'Brand Assets', 
        description: 'Your brand foundation',
        icon: 'Palette', 
        route: 'brand' 
      },
      { 
        id: 'personas', 
        type: 'page' as SearchResultType, 
        title: 'Personas', 
        description: 'Target audience profiles',
        icon: 'Users', 
        route: 'personas' 
      },
      { 
        id: 'strategy', 
        type: 'page' as SearchResultType, 
        title: 'Strategy & Goals', 
        description: 'Strategic planning tools',
        icon: 'Zap', 
        route: 'strategy' 
      },
      { 
        id: 'products', 
        type: 'page' as SearchResultType, 
        title: 'Products & Services', 
        description: 'Product catalog',
        icon: 'Package', 
        route: 'products' 
      },
      { 
        id: 'trends', 
        type: 'page' as SearchResultType, 
        title: 'Trend Library', 
        description: 'Industry trends and insights',
        icon: 'TrendingUp', 
        route: 'trends' 
      },
      { 
        id: 'knowledge', 
        type: 'page' as SearchResultType, 
        title: 'Knowledge Library', 
        description: 'Documents and resources',
        icon: 'BookOpen', 
        route: 'knowledge' 
      },
      { 
        id: 'relationships', 
        type: 'page' as SearchResultType, 
        title: 'Relationships', 
        description: 'Data connections and insights',
        icon: 'Network', 
        route: 'relationships' 
      }
    ];
  }

  /**
   * Calculate relevance score for search result
   */
  private calculateRelevance(query: string, title: string, description?: string): number {
    let score = 0;
    const normalizedTitle = title.toLowerCase();
    const normalizedDesc = description?.toLowerCase() || '';

    // Exact match in title = highest score
    if (normalizedTitle === query) score += 100;
    
    // Starts with query in title
    else if (normalizedTitle.startsWith(query)) score += 80;
    
    // Contains query in title
    else if (normalizedTitle.includes(query)) score += 60;
    
    // Contains in description
    if (normalizedDesc.includes(query)) score += 20;

    // Boost shorter titles (more specific)
    score += Math.max(0, 20 - title.length / 5);

    return score;
  }

  /**
   * Highlight matching text in results
   */
  highlightMatch(text: string, query: string): string {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}

// Singleton instance
export const globalSearch = new GlobalSearchService();
