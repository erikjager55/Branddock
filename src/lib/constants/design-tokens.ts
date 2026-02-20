// ============================================================
// BRANDDOCK DESIGN TOKENS — Single Source of Truth
// ============================================================
//
// Dit bestand is de ENIGE bron voor alle visuele constanten.
// Gebaseerd op Figma design (figma.com/make/WTXNV6zhzsTyYLUOdkFGge)
// + bestaande HANDOVER documentatie.
//
// REGEL: Importeer tokens in elke component. Geen hardcoded kleuren,
// spacing of typografie buiten dit bestand.
//
// Pad: src/lib/constants/design-tokens.ts
// Laatst bijgewerkt: 13 februari 2026
// ============================================================

// ─── LAYOUT TOKENS ─────────────────────────────────────────

export const LAYOUT = {
  sidebar: {
    /** Breedte van de sidebar — breed genoeg voor volledige labels */
    width: 'w-72',               // 288px
    widthPx: 288,
    /** Collapsed (icon-only) breedte */
    collapsedWidth: 'w-16',      // 64px
    collapsedWidthPx: 64,
    /** Content margin-left moet gelijk zijn aan sidebar width */
    contentOffset: 'ml-72',      // 288px
    collapsedContentOffset: 'ml-16',
    /** Interne padding */
    padding: 'px-4 py-4',
    /** Individueel nav item */
    item: {
      padding: 'px-3 py-2',
      height: 40,                // ~40px per item
      gap: 'gap-3',
      borderRadius: 'rounded-lg',
      fontSize: 'text-sm',
      fontWeight: 'font-medium',
      iconSize: 'w-5 h-5',
    },
    /** Sectie label (WORKSPACE, STRATEGY, KNOWLEDGE, etc.) */
    sectionLabel: {
      className: 'text-xs font-semibold uppercase tracking-wider text-gray-400',
      spacing: 'mt-6 mb-2 px-3',
    },
    /** Logo area bovenaan */
    logo: {
      height: 'h-14',           // 56px
      padding: 'px-4',
    },
    /** Create Content button */
    createButton: {
      className: 'w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2.5 px-4 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2',
      margin: 'mx-4 mb-4',
    },
    /** Active nav item state */
    activeState: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      icon: 'text-emerald-600',
    },
    /** Inactive nav item state */
    inactiveState: {
      text: 'text-gray-700',
      icon: 'text-gray-400',
      hover: 'hover:bg-gray-50 hover:text-gray-900',
    },
    /** Badge (notification circle) */
    badge: {
      className: 'inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full',
      colors: {
        orange: 'bg-orange-400 text-white',  // Default — Figma standaard
        red: 'bg-red-500 text-white',         // Urgent
        pink: 'bg-pink-400 text-white',       // Brand Alignment
      },
    },
  },

  topBar: {
    /** Hoogte van de top bar */
    height: 'h-14',               // 56px (Figma)
    heightPx: 56,
    padding: 'px-6',
    border: 'border-b border-gray-100',
    /** Background */
    bg: 'bg-white',
  },

  /** Breadcrumb bar (onder top bar, boven content) */
  breadcrumbBar: {
    height: 'h-10',              // 40px
    padding: 'px-6 py-2',
    border: 'border-b border-gray-50',
    bg: 'bg-white',
  },

  content: {
    /** Maximale breedte van content area */
    maxWidth: 'max-w-7xl',       // 1280px
    /** Standaard padding rondom content */
    padding: 'p-8',              // 32px — Figma toont ruime spacing
    paddingPx: 32,
  },

  grid: {
    /** 4px grid basis */
    base: 4,
    gap: {
      xs: 'gap-2',              // 8px
      sm: 'gap-3',              // 12px
      md: 'gap-4',              // 16px
      lg: 'gap-6',              // 24px
      xl: 'gap-8',              // 32px
    },
  },
} as const;

// ─── KLEUR TOKENS ──────────────────────────────────────────

export const COLORS = {
  /**
   * Primary: Teal-600 (#0D9488)
   * Gebruikt voor: links, active sidebar, focus rings, accents
   * Dit is de brand kleur die door het hele platform terugkomt.
   */
  primary: {
    50: 'teal-50',               // #F0FDFA
    100: 'teal-100',             // #CCFBF1
    500: 'teal-500',             // #14B8A6
    600: 'teal-600',             // #0D9488
    700: 'teal-700',             // #0F766E
    // Directe class helpers
    text: 'text-teal-600',
    bg: 'bg-teal-600',
    bgLight: 'bg-teal-50',
    border: 'border-teal-200',
    ring: 'ring-teal-500',
    hover: 'hover:bg-teal-700',
  },

  /**
   * CTA / Success: Emerald-500 (#10B981)
   * Gebruikt voor: primaire buttons, CTA's, success states, progress bars
   */
  cta: {
    50: 'emerald-50',            // #ECFDF5
    500: 'emerald-500',          // #10B981
    600: 'emerald-600',          // #059669
    700: 'emerald-700',          // #047857
    text: 'text-emerald-500',
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-50',
    bgHover: 'hover:bg-emerald-600',
    border: 'border-emerald-200',
  },

  /** Status kleuren — consistent door hele app */
  status: {
    success: {
      text: 'text-emerald-500',
      textDark: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    },
    warning: {
      text: 'text-amber-500',
      textDark: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    },
    danger: {
      text: 'text-red-500',
      textDark: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      dot: 'bg-red-500',
    },
    info: {
      text: 'text-blue-500',
      textDark: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
    },
    neutral: {
      text: 'text-gray-500',
      textDark: 'text-gray-700',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      dot: 'bg-gray-400',
    },
  },

  /** Surface kleuren */
  surface: {
    page: 'bg-gray-50',          // #F9FAFB — page background
    card: 'bg-white',             // Cards en modals
    sidebar: 'bg-white',          // Sidebar background
    topBar: 'bg-white',           // Top bar background
    elevated: 'bg-white shadow-sm',
    overlay: 'bg-black/50',       // Modal overlays
  },

  /** Border kleuren */
  border: {
    DEFAULT: 'border-gray-200',   // #E5E7EB — standaard borders
    light: 'border-gray-100',     // #F3F4F6 — subtiele borders
    dark: 'border-gray-300',      // #D1D5DB — emphasis borders
    focus: 'border-teal-500',     // Focus state
  },

  /** Tekst kleuren */
  text: {
    primary: 'text-gray-900',     // #111827 — headings, namen
    secondary: 'text-gray-600',   // #4B5563 — body text
    tertiary: 'text-gray-500',    // #6B7280 — labels, subtitles
    muted: 'text-gray-400',       // #9CA3AF — placeholders, disabled
    inverse: 'text-white',        // White text op donkere bg
  },
} as const;

// ─── TYPOGRAFIE TOKENS ─────────────────────────────────────

export const TYPOGRAPHY = {
  /** Font family — Inter via Tailwind default */
  fontFamily: 'font-sans',

  /**
   * Text stijlen — direct bruikbaar als className strings.
   * Combineer met Tailwind: className={TYPOGRAPHY.pageTitle}
   */
  pageTitle: 'text-2xl font-bold text-gray-900',
  pageSubtitle: 'text-sm text-gray-500',
  sectionHeading: 'text-lg font-semibold text-gray-900',
  cardTitle: 'text-base font-semibold text-gray-900',
  body: 'text-sm text-gray-600',
  bodyLarge: 'text-base text-gray-600',
  label: 'text-xs text-gray-500 uppercase tracking-wider',
  labelSemibold: 'text-xs font-semibold text-gray-500 uppercase tracking-wider',
  caption: 'text-xs text-gray-400',
  /** Stats / grote nummers */
  statValue: 'text-2xl font-bold text-gray-900',
  statLabel: 'text-sm text-gray-500',
  /** Navigation */
  navLabel: 'text-sm font-medium',
  navSectionLabel: 'text-xs font-semibold uppercase tracking-wider text-gray-400',
  /** Badges */
  badgeText: 'text-xs font-medium',
  /** Pattern Library tokens */
  pageTitleLarge: 'text-4xl font-semibold',
  pageTitleCompact: 'text-2xl font-semibold',
  sectionTitle: 'text-xl font-semibold',
  bodySmall: 'text-sm',
  statLarge: 'text-3xl font-bold',
  statMedium: 'text-2xl font-bold',
} as const;

// ─── COMPONENT TOKENS ──────────────────────────────────────

export const COMPONENTS = {
  // ── Cards ──────────────────────────────────────────────
  card: {
    /** Standaard card — alleen border, geen shadow */
    base: 'bg-white border border-gray-200 rounded-lg',
    /** Card met padding */
    padded: 'bg-white border border-gray-200 rounded-lg p-6',
    /** Klikbare card met hover effect */
    hoverable: 'bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer',
    /** Card border radius — consistent rounded-lg (8px) conform Figma */
    borderRadius: 'rounded-lg',
  },

  // ── Buttons ────────────────────────────────────────────
  button: {
    /** Primaire CTA — emerald, witte tekst */
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2',
    /** Secundaire — bordered, grijze tekst */
    secondary: 'border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2',
    /** Ghost — geen border, subtiele hover */
    ghost: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm transition-colors inline-flex items-center gap-2',
    /** Danger — rode button voor destructieve acties */
    danger: 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2',
    /** Grote CTA — breder, hoger */
    primaryLarge: 'bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2',
    /** Icon-only button */
    icon: 'p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors',
    /** Disabled state (voeg toe met cn()) */
    disabled: 'opacity-50 cursor-not-allowed pointer-events-none',
  },

  // ── Badges ─────────────────────────────────────────────
  badge: {
    /** Basis badge container */
    base: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
    /** Kleur varianten */
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
    neutral: 'bg-gray-100 text-gray-600',
    purple: 'bg-purple-50 text-purple-700',
    teal: 'bg-teal-50 text-teal-700',
  },

  // ── Input velden ───────────────────────────────────────
  input: {
    /** Standaard text input */
    base: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow',
    /** Search input (met icon ruimte links) */
    search: 'w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent',
    /** Textarea */
    textarea: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent',
    /** Label boven een input */
    label: 'block text-sm font-medium text-gray-700 mb-1.5',
    /** Error state */
    error: 'border-red-300 focus:ring-red-500',
    /** Helper text onder input */
    helperText: 'mt-1.5 text-xs text-gray-500',
    errorText: 'mt-1.5 text-xs text-red-500',
  },

  // ── Tabs ───────────────────────────────────────────────
  tabs: {
    /** Container met bottom border */
    container: 'flex gap-0 border-b border-gray-200',
    /** Active tab */
    active: 'text-emerald-600 border-b-2 border-emerald-500 pb-3 px-4 text-sm font-medium cursor-pointer',
    /** Inactive tab */
    inactive: 'text-gray-500 hover:text-gray-700 pb-3 px-4 text-sm cursor-pointer transition-colors',
  },

  // ── Filter pills ───────────────────────────────────────
  filterPill: {
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer',
    inactive: 'bg-white text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full text-sm hover:bg-gray-50 cursor-pointer transition-colors',
  },

  // ── Progress bar ───────────────────────────────────────
  progressBar: {
    track: 'h-2 rounded-full bg-gray-200 w-full overflow-hidden',
    fill: 'h-2 rounded-full transition-all duration-500',
    /** Fill kleurvarianten */
    fillSuccess: 'bg-emerald-500',
    fillGradient: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    fillAnalysis: 'bg-gradient-to-r from-blue-500 to-purple-500',
  },

  // ── Modal ──────────────────────────────────────────────
  modal: {
    overlay: 'fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16',
    container: 'bg-white rounded-xl shadow-2xl flex flex-col max-h-[80vh]',
    header: 'flex items-center gap-3 p-4 border-b border-gray-100 flex-shrink-0',
    body: 'flex-1 overflow-y-auto p-4',
    footer: 'flex items-center justify-end gap-2 p-4 border-t border-gray-100 flex-shrink-0',
  },

  // ── Empty state ────────────────────────────────────────
  emptyState: {
    container: 'flex flex-col items-center justify-center py-16 text-center',
    icon: 'w-12 h-12 text-gray-300 mb-4',
    title: 'text-lg font-semibold text-gray-900 mb-1',
    description: 'text-sm text-gray-500 mb-6 max-w-md',
  },

  // ── Divider ────────────────────────────────────────────
  divider: {
    horizontal: 'border-t border-gray-100',
    vertical: 'border-l border-gray-100 h-full',
  },

  // ── Avatar ─────────────────────────────────────────────
  avatar: {
    sm: 'w-8 h-8 rounded-full',
    md: 'w-10 h-10 rounded-full',
    lg: 'w-12 h-12 rounded-full',
    xl: 'w-16 h-16 rounded-full',
    xxl: 'w-24 h-24 rounded-full',
    /** Placeholder met initialen */
    placeholder: 'bg-emerald-100 text-emerald-700 flex items-center justify-center font-medium',
  },

  // ── Tooltip ────────────────────────────────────────────
  tooltip: {
    container: 'absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap',
  },
} as const;

// ─── PAGE HEADER PATTERN ───────────────────────────────────
// Figma: Elke pagina heeft icon-cirkel + titel + subtitle + CTA

export const PAGE_HEADER = {
  /** Buitenste container — titel links, CTA rechts */
  container: 'flex items-start justify-between mb-8',
  /** Groep: icon + titel + subtitle */
  titleGroup: 'flex items-center gap-4',
  /** Icon cirkel (48px) */
  iconCircle: {
    size: 'w-12 h-12',
    className: 'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
    iconSize: 'w-6 h-6',
  },
  title: 'text-2xl font-bold text-gray-900',
  subtitle: 'text-sm text-gray-500 mt-0.5',
  /** CTA button rechts */
  cta: 'bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-colors',
} as const;

// ─── BREADCRUMB PATTERN ────────────────────────────────────
// Figma: 🏠 Dashboard > 📦 Brand Foundation > 🎯 Golden Circle

export const BREADCRUMB = {
  container: 'flex items-center gap-1.5 text-sm',
  /** Separator: ChevronRight */
  separator: 'w-4 h-4 text-gray-300',
  item: {
    base: 'flex items-center gap-1.5 transition-colors',
    icon: 'w-4 h-4',
    /** Klikbaar item (niet de huidige pagina) */
    link: 'text-gray-500 hover:text-gray-700 cursor-pointer',
    /** Huidige pagina (niet klikbaar) */
    current: 'text-gray-900 font-medium',
  },
} as const;

// ─── STATS CARDS PATTERN ───────────────────────────────────
// Figma: Consistent 3-5 stat cards per overview pagina

export const STATS_CARD = {
  /** Grid container — cols stel je in per pagina */
  container: 'grid gap-4',
  /** Individuele stat card */
  card: 'bg-white border border-gray-200 rounded-lg p-5',
  /** Icon in gekleurde cirkel */
  iconCircle: {
    size: 'w-10 h-10',
    className: 'w-10 h-10 rounded-full flex items-center justify-center',
    iconSize: 'w-5 h-5',
  },
  value: 'text-3xl font-bold text-gray-900 mt-3',
  label: 'text-sm text-gray-500 mt-1',
} as const;

// ─── COMING SOON PLACEHOLDER ───────────────────────────────
// Vervangt 404 pagina's voor ongebouwde modules

export const COMING_SOON = {
  container: 'flex flex-col items-center justify-center min-h-[60vh] text-center px-4',
  iconWrapper: 'w-20 h-20 rounded-2xl flex items-center justify-center mb-6',
  iconSize: 'w-10 h-10',
  title: 'text-xl font-semibold text-gray-900 mb-2',
  description: 'text-sm text-gray-500 max-w-md mb-6 leading-relaxed',
  phaseBadge: 'inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full',
} as const;

// ─── SIDEBAR NAVIGATIE CONFIGURATIE ────────────────────────
// Volledige navigatiestructuur met icoon-mapping

export type SidebarNavItem = {
  key: string;
  label: string;
  icon: string;          // Lucide icon naam
  href: string;
  badge?: boolean;       // Toont notificatie badge
  badgeColor?: 'orange' | 'red' | 'pink';
};

export type SidebarSection = {
  label: string | null;  // null = geen sectie header
  items: SidebarNavItem[];
};

export const SIDEBAR_NAV: {
  sections: SidebarSection[];
  bottomItems: SidebarNavItem[];
} = {
  sections: [
    {
      label: 'WORKSPACE',
      items: [
        { key: 'dashboard', label: 'Overview', icon: 'LayoutDashboard', href: '/' },
      ],
    },
    {
      label: 'STRATEGY',
      items: [
        { key: 'active-campaigns', label: 'Campaigns', icon: 'Megaphone', href: '/strategy/campaigns' },
        { key: 'content-library', label: 'Content Library', icon: 'FileText', href: '/strategy/content-library' },
      ],
    },
    {
      label: 'KNOWLEDGE',
      items: [
        { key: 'brand', label: 'Brand Foundation', icon: 'Shield', href: '/knowledge/brand-foundation', badge: true, badgeColor: 'orange' },
        { key: 'business-strategy', label: 'Business Strategy', icon: 'Target', href: '/knowledge/business-strategy' },
        { key: 'brandstyle', label: 'Brandstyle', icon: 'Palette', href: '/knowledge/brand-style' },
        { key: 'personas', label: 'Personas', icon: 'Users', href: '/knowledge/personas' },
        { key: 'products', label: 'Products & Services', icon: 'Package', href: '/knowledge/products' },
        { key: 'trends', label: 'Market Insights', icon: 'TrendingUp', href: '/knowledge/market-insights' },
        { key: 'knowledge', label: 'Knowledge Library', icon: 'BookOpen', href: '/knowledge/library' },
        { key: 'brand-alignment', label: 'Brand Alignment', icon: 'GitCompare', href: '/knowledge/brand-alignment', badge: true, badgeColor: 'red' },
      ],
    },
    {
      label: 'VALIDATION',
      items: [
        { key: 'research', label: 'Research Hub', icon: 'FlaskConical', href: '/validation/research-hub' },
        { key: 'research-bundles', label: 'Research Bundles', icon: 'Boxes', href: '/validation/research-bundles' },
        { key: 'custom-validation', label: 'Custom Validation', icon: 'Sparkles', href: '/validation/custom-validations' },
      ],
    },
  ],
  bottomItems: [
    { key: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
    { key: 'help', label: 'Help & Support', icon: 'HelpCircle', href: '/help' },
  ],
};

// ─── PAGE ICON MAPPING ─────────────────────────────────────
// Elke pagina heeft een icon + achtergrondkleur (voor PageHeader + breadcrumbs)

export const PAGE_ICONS: Record<string, { icon: string; bgColor: string; iconColor: string }> = {
  'overview':          { icon: 'LayoutDashboard', bgColor: 'bg-blue-50',    iconColor: 'text-blue-500' },
  'campaigns':         { icon: 'Megaphone',       bgColor: 'bg-purple-50',  iconColor: 'text-purple-500' },
  'content-library':   { icon: 'FileText',         bgColor: 'bg-indigo-50',  iconColor: 'text-indigo-500' },
  'brand-foundation':  { icon: 'Shield',          bgColor: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  'business-strategy': { icon: 'Target',          bgColor: 'bg-blue-50',    iconColor: 'text-blue-500' },
  'brand-style':       { icon: 'Palette',         bgColor: 'bg-pink-50',    iconColor: 'text-pink-500' },
  'personas':          { icon: 'Users',           bgColor: 'bg-violet-50',  iconColor: 'text-violet-500' },
  'products':          { icon: 'Package',         bgColor: 'bg-orange-50',  iconColor: 'text-orange-500' },
  'market-insights':   { icon: 'TrendingUp',      bgColor: 'bg-cyan-50',    iconColor: 'text-cyan-500' },
  'knowledge-library': { icon: 'BookOpen',         bgColor: 'bg-amber-50',   iconColor: 'text-amber-500' },
  'brand-alignment':   { icon: 'GitCompare',      bgColor: 'bg-rose-50',    iconColor: 'text-rose-500' },
  'research-hub':      { icon: 'FlaskConical',    bgColor: 'bg-lime-50',    iconColor: 'text-lime-600' },
  'research-bundles':  { icon: 'Boxes',            bgColor: 'bg-sky-50',     iconColor: 'text-sky-500' },
  'custom-validations':{ icon: 'Sparkles',        bgColor: 'bg-slate-50',   iconColor: 'text-slate-500' },
  'settings':          { icon: 'Settings',        bgColor: 'bg-gray-100',   iconColor: 'text-gray-500' },
  'help':              { icon: 'HelpCircle',      bgColor: 'bg-emerald-50', iconColor: 'text-emerald-500' },
};

// ─── MODULE METADATA ───────────────────────────────────────
// Per-module informatie voor Coming Soon pages en headers

export const MODULE_META: Record<string, {
  title: string;
  subtitle: string;
  phase: string;
  comingSoonDescription: string;
}> = {
  'overview': {
    title: 'Dashboard',
    subtitle: 'Strategic overview of your brand research and validation progress',
    phase: 'Fase 11',
    comingSoonDescription: '',
  },
  'campaigns': {
    title: 'Active Campaigns',
    subtitle: 'Manage and track your marketing campaigns',
    phase: 'Fase 10',
    comingSoonDescription: 'Create, manage, and track your marketing campaigns with AI-powered content generation and performance analytics.',
  },
  'content-library': {
    title: 'Content Library',
    subtitle: 'Browse and manage all generated content',
    phase: 'Fase 10',
    comingSoonDescription: 'Your centralized library for all AI-generated and manually created content assets, organized by campaign and type.',
  },
  'brand-foundation': {
    title: 'Brand Foundation',
    subtitle: 'Build your strategic foundation with premium brand tools',
    phase: 'Fase 1',
    comingSoonDescription: '',
  },
  'business-strategy': {
    title: 'Business Strategy',
    subtitle: 'Define and track your strategic business objectives',
    phase: 'Fase 2',
    comingSoonDescription: '',
  },
  'brand-style': {
    title: 'Brandstyle Analyzer',
    subtitle: 'Analyze a website or upload a brand styleguide PDF',
    phase: 'Fase 3',
    comingSoonDescription: '',
  },
  'personas': {
    title: 'Personas',
    subtitle: 'Research-based target audience profiles',
    phase: 'Fase 4',
    comingSoonDescription: 'Create detailed personas with AI-powered analysis, chat with your personas, and validate them through multiple research methods.',
  },
  'products': {
    title: 'Products & Services',
    subtitle: 'Define and manage your product portfolio',
    phase: 'Fase 5',
    comingSoonDescription: 'Document your products and services with feature matrices, pricing tiers, competitive positioning, and brand alignment scores.',
  },
  'market-insights': {
    title: 'Market Insights',
    subtitle: 'Understand your market landscape and trends',
    phase: 'Fase 6',
    comingSoonDescription: 'AI-powered market analysis with competitor tracking, trend monitoring, and strategic opportunity identification.',
  },
  'knowledge-library': {
    title: 'Knowledge Library',
    subtitle: 'Your centralized brand knowledge base',
    phase: 'Fase 7',
    comingSoonDescription: 'A searchable library of all your brand knowledge: documents, research findings, brand guidelines, and AI-generated insights.',
  },
  'brand-alignment': {
    title: 'Brand Alignment',
    subtitle: 'Check consistency across all brand assets',
    phase: 'Fase 8',
    comingSoonDescription: 'Automated brand consistency checker that identifies misalignments across your brand assets and provides AI-powered fix suggestions.',
  },
  'research-hub': {
    title: 'Research Hub',
    subtitle: 'Plan and manage brand research activities',
    phase: 'Fase 9',
    comingSoonDescription: 'Your research command center: plan studies, manage participants, analyze results, and track validation progress across all brand assets.',
  },
  'research-bundles': {
    title: 'Research Bundles',
    subtitle: 'Pre-configured research packages',
    phase: 'Fase 9',
    comingSoonDescription: 'Purchase pre-configured research bundles that combine multiple validation methods for comprehensive brand insights.',
  },
  'custom-validations': {
    title: 'Custom Validations',
    subtitle: 'Build custom research configurations',
    phase: 'Fase 9',
    comingSoonDescription: 'Design custom validation workflows tailored to your specific research needs and brand objectives.',
  },
  'settings': {
    title: 'Settings',
    subtitle: 'Account, team, billing, and preferences',
    phase: 'Fase 12',
    comingSoonDescription: 'Manage your account settings, team members, billing, notifications, and appearance preferences.',
  },
  'help': {
    title: 'Help & Support',
    subtitle: 'Documentation, tutorials, and contact support',
    phase: 'Fase 12',
    comingSoonDescription: 'Browse help articles, watch tutorials, and contact our support team for assistance.',
  },
};

// ─── DASHBOARD TOKENS (S8) ─────────────────────────────────

export const DASHBOARD_TOKENS = {
  /** Decision Readiness widget */
  decisionReadiness: {
    container: 'bg-white rounded-lg border border-gray-200 p-6',
    percentage: {
      high: 'text-green-600',
      medium: 'text-yellow-500',
      low: 'text-red-500',
    },
    progressBar: {
      track: 'w-full bg-gray-100 rounded-full h-3',
      high: 'bg-green-500',
      medium: 'bg-yellow-500',
      low: 'bg-red-500',
    },
  },

  /** Dashboard stats cards (5 KPIs) */
  dashboardStats: {
    container: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4',
    card: 'bg-white rounded-lg border border-gray-200 p-4 text-left hover:shadow-md transition-shadow cursor-pointer',
    iconContainer: 'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
    value: 'text-2xl font-bold text-gray-900',
    label: 'text-xs text-gray-500 mt-0.5',
  },

  /** Attention list ("What Needs Your Attention") */
  attentionList: {
    container: 'bg-white rounded-lg border border-gray-200 p-5',
    item: 'flex items-center gap-4 py-3',
    fixBtn: 'px-3 py-1.5 text-xs font-medium rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100',
    actionBtn: 'px-3 py-1.5 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100',
  },

  /** Recommended action card */
  recommendedAction: {
    container: 'bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-5',
    badge: 'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-200 text-green-800 rounded-full',
    actionBtn: 'inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors',
  },

  /** Quick access cards */
  quickAccess: {
    container: 'grid grid-cols-1 sm:grid-cols-3 gap-3',
    card: 'bg-white rounded-lg border border-gray-200 p-4 text-left hover:shadow-md transition-shadow cursor-pointer',
  },

  /** Active campaigns preview */
  activeCampaignsPreview: {
    container: 'bg-white rounded-lg border border-gray-200 p-5',
    newCampaignBtn: 'w-full flex items-center justify-center gap-2 py-2 border border-green-200 text-green-600 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors',
  },

  /** Onboarding wizard modal */
  onboardingWizard: {
    overlay: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center',
    container: 'bg-white rounded-xl w-[520px] max-w-[95vw] p-8 text-center shadow-2xl',
    stepDot: { active: 'bg-green-600', inactive: 'bg-gray-300' },
    primaryBtn: 'px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors',
  },

  /** Quick start widget */
  quickStartWidget: {
    container: 'bg-white rounded-lg border border-gray-200 p-4',
    checkboxChecked: 'w-5 h-5 rounded-full bg-green-600 flex items-center justify-center',
    checkboxUnchecked: 'w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-400',
    labelChecked: 'text-sm text-gray-400 line-through',
    labelUnchecked: 'text-sm text-gray-700',
  },

  /** Readiness thresholds */
  thresholds: {
    low:    { min: 0,  max: 49, color: 'red',    label: 'Unusable' },
    medium: { min: 50, max: 79, color: 'yellow', label: 'Limited' },
    high:   { min: 80, max: 100, color: 'green',  label: 'Ready' },
  },
} as const;

// ─── HELPER: cn() ──────────────────────────────────────────
// Utility om meerdere class strings samen te voegen (simpele versie)
// Voor productie: gebruik clsx of tailwind-merge

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================================
// PATTERN LIBRARY TOKENS — Gesynchroniseerd met Figma Reference
// ============================================================

// --- MODULE GRADIENTS ---
export const MODULE_GRADIENTS = {
  'dashboard':         { from: 'from-[#1FD1B2]', to: 'to-emerald-500',  icon: 'LayoutDashboard' },
  'brand-foundation':  { from: 'from-[#5252E3]', to: 'to-purple-600',   icon: 'Shield' },
  'business-strategy': { from: 'from-blue-500',   to: 'to-indigo-600',   icon: 'Target' },
  'brandstyle':        { from: 'from-purple-500',  to: 'to-pink-600',     icon: 'Palette' },
  'personas':          { from: 'from-[#5252E3]', to: 'to-[#1FD1B2]',   icon: 'Users' },
  'products':          { from: 'from-orange-500',  to: 'to-amber-600',    icon: 'Package' },
  'market-insights':   { from: 'from-green-500',   to: 'to-emerald-600',  icon: 'TrendingUp' },
  'knowledge':         { from: 'from-blue-500',    to: 'to-indigo-600',   icon: 'BookOpen' },
  'brand-alignment':   { from: 'from-[#1FD1B2]', to: 'to-emerald-500',  icon: 'GitCompare' },
  'campaigns':         { from: 'from-[#5252E3]', to: 'to-purple-600',   icon: 'Megaphone' },
  'content-library':   { from: 'from-purple-500',  to: 'to-pink-600',     icon: 'FileText' },
  'research':          { from: 'from-green-500',   to: 'to-emerald-600',  icon: 'FlaskConical' },
  'settings':          { from: 'from-gray-500',    to: 'to-gray-600',     icon: 'Settings' },
  'help':              { from: 'from-blue-500',    to: 'to-indigo-600',   icon: 'HelpCircle' },
} as const;

export type ModuleKey = keyof typeof MODULE_GRADIENTS;

// --- SPACING TOKENS ---
export const SPACING = {
  page: {
    padding: 'px-8 py-8',
    paddingX: 'px-8',
    paddingY: 'py-8',
  },
  header: {
    padding: 'px-8 py-6',
    paddingCompact: 'px-8 py-4',
  },
  section: {
    marginBottom: 'mb-8',
    marginBottomSmall: 'mb-6',
  },
  card: {
    padding: 'p-6',
    paddingSmall: 'p-4',
    paddingLarge: 'p-8',
    gap: 'space-y-4',
  },
  grid: {
    gap: 'gap-4',
    cols2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    cols3: 'grid grid-cols-1 md:grid-cols-3 gap-4',
    cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
  },
  component: {
    gap: 'gap-2',
    gapLarge: 'gap-4',
  },
} as const;

// --- ICON SIZES ---
export const ICON_SIZES = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
  '2xl': 'h-10 w-10',
  '3xl': 'h-12 w-12',
} as const;

// --- ICON CONTAINERS ---
export const ICON_CONTAINERS = {
  small:  'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
  medium: 'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
  large:  'h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
} as const;

// --- LAYOUT PATTERNS ---
export const LAYOUT_PATTERNS = {
  fullPage: 'h-full overflow-auto bg-background',
  centeredContentSm: 'max-w-3xl mx-auto',
  centeredContentMd: 'max-w-5xl mx-auto',
  centeredContentXl: 'max-w-7xl mx-auto',
  centeredContentFull: 'max-w-[1800px] mx-auto',
} as const;

// --- HEADER PATTERNS ---
export const HEADER_PATTERNS = {
  sticky: {
    wrapper: 'sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10',
    container: 'flex items-center justify-between',
    left: 'flex items-center gap-4',
    right: 'flex items-center gap-3',
  },
  backButton: 'flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4',
  section: {
    wrapper: 'flex items-center justify-between',
    title: 'text-xl font-semibold',
  },
} as const;

// --- CARD VARIANTS ---
export const CARD_VARIANTS = {
  default: 'bg-card rounded-xl border border-border p-6',
  interactive: 'bg-card rounded-xl border border-border p-6 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer',
  highlighted: 'bg-card rounded-xl border-2 border-primary/20 p-6 shadow-sm',
  compact: 'bg-card rounded-xl border border-border p-4',
  status: {
    success: 'bg-card rounded-xl border border-green-200 p-6',
    warning: 'bg-card rounded-xl border border-yellow-200 p-6',
    error: 'bg-card rounded-xl border border-red-200 p-6',
  },
} as const;

// --- STATUS COLORS ---
export const STATUS_COLORS = {
  success: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  error:   { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  info:    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  neutral: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' },
} as const;

// --- ANIMATION TOKENS ---
export const ANIMATION = {
  fadeIn: 'animate-in fade-in duration-200',
  fadeInUp: 'animate-in fade-in slide-in-from-bottom-2 duration-300',
  fadeInScale: 'animate-in fade-in zoom-in-95 duration-200',
  hover: {
    scale: 'transition-transform hover:scale-[1.02]',
    shadow: 'transition-shadow hover:shadow-md',
    all: 'transition-all duration-200',
  },
} as const;

// --- EFFECTS ---
export const EFFECTS = {
  shadow: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  },
  backdrop: 'backdrop-blur-sm',
  ring: 'ring-2 ring-primary/20 ring-offset-2',
} as const;

// --- FILTER PATTERNS ---
export const FILTER_PATTERNS = {
  contentFilterBar: 'flex flex-col sm:flex-row gap-4 items-start sm:items-center',
  tabsContainer: 'flex items-center gap-1 bg-muted rounded-lg p-1',
  tabItem: 'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
  tabItemActive: 'bg-background shadow-sm text-foreground',
  tabItemInactive: 'text-muted-foreground hover:text-foreground',
} as const;

// --- HELPER: Get gradient classes for a module ---
export function getModuleGradient(moduleKey: ModuleKey): string {
  const gradient = MODULE_GRADIENTS[moduleKey];
  return `bg-gradient-to-br ${gradient.from} ${gradient.to}`;
}

// --- HELPER: Get status color set ---
export function getStatusColors(status: keyof typeof STATUS_COLORS) {
  return STATUS_COLORS[status];
}

// --- SELECTION STATES (voor SelectionCard) ---
export const SELECTION_STATES = {
  default: 'rounded-xl border border-border p-4 hover:border-primary/40 cursor-pointer transition-all',
  selected: 'rounded-xl border-2 border-primary bg-primary/5 p-4',
  disabled: 'rounded-xl border border-border p-4 opacity-50 cursor-not-allowed',
} as const;

// --- SEVERITY COLORS (voor IssueCard, Brand Alignment) ---
export const SEVERITY_COLORS = {
  critical: {
    badge: 'bg-red-100 text-red-700',
    border: 'border-l-4 border-l-red-500',
    dot: 'bg-red-500',
  },
  warning: {
    badge: 'bg-orange-100 text-orange-700',
    border: 'border-l-4 border-l-orange-500',
    dot: 'bg-orange-500',
  },
  suggestion: {
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-l-4 border-l-blue-500',
    dot: 'bg-blue-500',
  },
} as const;

// --- CONFIDENCE COLORS (voor validation methods) ---
export const CONFIDENCE_COLORS = {
  low:         { badge: 'bg-red-50 text-red-700 border border-red-200' },
  medium:      { badge: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  'medium-high': { badge: 'bg-teal-50 text-teal-700 border border-teal-200' },
  high:        { badge: 'bg-green-50 text-green-700 border border-green-200' },
} as const;

// --- RECOMMENDATION BLOCK (voor AI aanbevelingen) ---
export const RECOMMENDATION_BLOCK = {
  wrapper: 'bg-primary/5 rounded-lg p-4 mt-4',
  icon: 'text-primary',
  label: 'text-sm font-semibold text-primary',
  text: 'text-sm text-muted-foreground mt-1',
} as const;
