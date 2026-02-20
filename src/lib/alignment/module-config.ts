import type { AlignmentModule } from '@/types/brand-alignment';

export const MODULE_CONFIG: Record<AlignmentModule, { label: string; icon: string; route: string }> = {
  BRAND_FOUNDATION:   { label: 'Brand Foundation',    icon: 'Layers',       route: 'brand' },
  BUSINESS_STRATEGY:  { label: 'Business Strategy',   icon: 'Target',       route: 'business-strategy' },
  BRANDSTYLE:         { label: 'Brandstyle',          icon: 'Palette',      route: 'brandstyle-guide' },
  PERSONAS:           { label: 'Personas',            icon: 'Users',        route: 'personas' },
  PRODUCTS_SERVICES:  { label: 'Products & Services', icon: 'Package',      route: 'products' },
  MARKET_INSIGHTS:    { label: 'Market Insights',     icon: 'TrendingUp',   route: 'trends' },
};
