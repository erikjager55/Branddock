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
        { key: 'overview', label: 'Overview', icon: 'LayoutDashboard', href: '/' },
      ],
    },
    {
      label: 'STRATEGY',
      items: [
        { key: 'campaigns', label: 'Active Campaigns', icon: 'Megaphone', href: '/strategy/campaigns' },
        { key: 'content-library', label: 'Content Library', icon: 'FileText', href: '/strategy/content-library' },
      ],
    },
    {
      label: 'KNOWLEDGE',
      items: [
        { key: 'brand-foundation', label: 'Brand Foundation', icon: 'Lightbulb', href: '/knowledge/brand-foundation', badge: true, badgeColor: 'orange' },
        { key: 'business-strategy', label: 'Business Strategy', icon: 'Target', href: '/knowledge/business-strategy' },
        { key: 'brand-style', label: 'Brandstyle', icon: 'Palette', href: '/knowledge/brand-style' },
        { key: 'personas', label: 'Personas', icon: 'Users', href: '/knowledge/personas' },
        { key: 'products', label: 'Products & Services', icon: 'Package', href: '/knowledge/products' },
        { key: 'market-insights', label: 'Market Insights', icon: 'TrendingUp', href: '/knowledge/market-insights' },
        { key: 'knowledge-library', label: 'Knowledge Library', icon: 'BookOpen', href: '/knowledge/library' },
        { key: 'brand-alignment', label: 'Brand Alignment', icon: 'Shield', href: '/knowledge/brand-alignment', badge: true, badgeColor: 'pink' },
      ],
    },
    {
      label: 'VALIDATION',
      items: [
        { key: 'research-hub', label: 'Research Hub', icon: 'FlaskConical', href: '/validation/research-hub' },
        { key: 'research-bundles', label: 'Research Bundles', icon: 'Layers', href: '/validation/research-bundles' },
        { key: 'custom-validations', label: 'Custom Validations', icon: 'Settings2', href: '/validation/custom-validations' },
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
  'content-library':   { icon: 'FileText',        bgColor: 'bg-indigo-50',  iconColor: 'text-indigo-500' },
  'brand-foundation':  { icon: 'Lightbulb',       bgColor: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  'business-strategy': { icon: 'Target',          bgColor: 'bg-teal-50',    iconColor: 'text-teal-500' },
  'brand-style':       { icon: 'Palette',         bgColor: 'bg-pink-50',    iconColor: 'text-pink-500' },
  'personas':          { icon: 'Users',           bgColor: 'bg-violet-50',  iconColor: 'text-violet-500' },
  'products':          { icon: 'Package',         bgColor: 'bg-orange-50',  iconColor: 'text-orange-500' },
  'market-insights':   { icon: 'TrendingUp',      bgColor: 'bg-cyan-50',    iconColor: 'text-cyan-500' },
  'knowledge-library': { icon: 'BookOpen',         bgColor: 'bg-amber-50',   iconColor: 'text-amber-500' },
  'brand-alignment':   { icon: 'Shield',          bgColor: 'bg-rose-50',    iconColor: 'text-rose-500' },
  'research-hub':      { icon: 'FlaskConical',    bgColor: 'bg-lime-50',    iconColor: 'text-lime-600' },
  'research-bundles':  { icon: 'Layers',          bgColor: 'bg-sky-50',     iconColor: 'text-sky-500' },
  'custom-validations':{ icon: 'Settings2',       bgColor: 'bg-slate-50',   iconColor: 'text-slate-500' },
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

// ─── HELPER: cn() ──────────────────────────────────────────
// Utility om meerdere class strings samen te voegen (simpele versie)
// Voor productie: gebruik clsx of tailwind-merge

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
