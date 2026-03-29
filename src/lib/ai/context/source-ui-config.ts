// =============================================================
// Shared UI configuration for context source selectors.
//
// Used by both:
// - Campaign Wizard KnowledgeStep
// - Persona Chat KnowledgeContextSelector
//
// Keeps the visual rendering (icons, labels, badge colors)
// identical between both selectors.
// =============================================================

import {
  Building2,
  Package,
  Radar,
  BookOpen,
  Megaphone,
  FileText,
  Palette,
  Users,
  Swords,
  Target,
  TrendingUp,
  Search,
} from 'lucide-react';

/** Lucide icon map — maps registry icon strings to React components */
export const CONTEXT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Fingerprint: Building2,
  Package,
  Radar,
  BookOpen,
  Megaphone,
  FileText,
  Palette,
  Users,
  Swords,
  Target,
  TrendingUp,
  Search,
};

/** Per-source-type display metadata (label, icon, badge color) */
export const SOURCE_TYPE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  brand_asset: { label: 'Brand', icon: Building2, color: 'bg-emerald-100 text-emerald-700' },
  brandstyle: { label: 'Brandstyle', icon: Palette, color: 'bg-pink-100 text-pink-700' },
  persona: { label: 'Persona', icon: Users, color: 'bg-indigo-100 text-indigo-700' },
  product: { label: 'Product', icon: Package, color: 'bg-blue-100 text-blue-700' },
  detected_trend: { label: 'Trend', icon: Radar, color: 'bg-amber-100 text-amber-700' },
  knowledge_resource: { label: 'Library', icon: BookOpen, color: 'bg-purple-100 text-purple-700' },
  campaign: { label: 'Campaign', icon: Megaphone, color: 'bg-rose-100 text-rose-700' },
  deliverable: { label: 'Deliverable', icon: FileText, color: 'bg-sky-100 text-sky-700' },
  competitor: { label: 'Competitor', icon: Swords, color: 'bg-orange-100 text-orange-700' },
  business_strategy: { label: 'Strategy', icon: Target, color: 'bg-cyan-100 text-cyan-700' },
  strategic_implication: { label: 'Implication', icon: TrendingUp, color: 'bg-primary-100 text-primary-700' },
};

/** Default fallback icon for unknown source types */
export const DEFAULT_SOURCE_ICON = FileText;

/** Search icon (used for the "All" filter chip) */
export const SEARCH_ICON = Search;
