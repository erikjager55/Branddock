/**
 * Central Design System
 * Unified design tokens for consistent layout, typography, iconography, and colors
 * across all pages (Personas, Brand Assets, Research, etc.)
 */

// ============================================================================
// LAYOUT & SPACING
// ============================================================================

export const SPACING = {
  // Page-level spacing (UNIFORM HORIZONTAL PADDING SYSTEM)
  page: {
    padding: 'p-8',           // Main page wrapper padding (UNIFORM)
    paddingX: 'px-8',         // Horizontal padding (UNIFORM - 32px)
    paddingY: 'py-8',         // Vertical padding
    gap: 'space-y-6',         // Vertical spacing between major sections
    gapLarge: 'space-y-8',    // Large vertical spacing
  },
  
  // Section-level spacing
  section: {
    margin: 'mb-8',           // Margin between sections
    marginSmall: 'mb-6',      // Small margin between sections
    gap: 'space-y-4',         // Vertical spacing within sections
    title: {
      margin: 'mb-4',         // Margin below section titles
      marginSmall: 'mb-2',    // Small margin below section titles
    },
  },
  
  // Card spacing
  card: {
    padding: 'p-6',           // Default card padding
    paddingSmall: 'p-4',      // Small card padding
    paddingLarge: 'p-8',      // Large card padding
    gap: 'space-y-4',         // Vertical spacing inside cards
    gapSmall: 'space-y-2',    // Small vertical spacing inside cards
    gapLarge: 'space-y-6',    // Large vertical spacing inside cards
  },
  
  // Grid spacing
  grid: {
    cols2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    cols3: 'grid grid-cols-1 md:grid-cols-3 gap-4',
    cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
    gap: 'gap-4',             // Standard grid gap
    gapSmall: 'gap-2',        // Small grid gap
    gapMedium: 'gap-4',       // Medium grid gap (alias)
    gapLarge: 'gap-6',        // Large grid gap
  },
  
  // Component spacing
  component: {
    gap: 'gap-4',             // Standard component gap
    gapSmall: 'gap-2',        // Small component gap
    gapLarge: 'gap-6',        // Large component gap
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const TYPOGRAPHY = {
  // Page titles
  pageTitle: 'text-3xl font-semibold',
  pageTitleLarge: 'text-4xl font-semibold',
  pageSubtitle: 'text-muted-foreground',
  
  // Section headers
  sectionTitle: 'text-xl font-semibold',
  sectionSubtitle: 'text-sm text-muted-foreground',
  
  // Card headers
  cardTitle: 'text-lg font-semibold',
  cardSubtitle: 'text-sm text-muted-foreground',
  
  // Body text
  body: 'text-base',
  bodySmall: 'text-sm',
  bodyLarge: 'text-lg',
  
  // Labels & captions
  label: 'text-sm font-medium',
  labelSmall: 'text-xs font-medium',
  caption: 'text-xs text-muted-foreground',
  
  // Metadata
  metadata: 'text-xs text-muted-foreground',
  
  // Emphasis
  emphasis: 'font-semibold',
  muted: 'text-muted-foreground',
  
  // Stats & metrics
  statLarge: 'text-3xl font-bold',
  statMedium: 'text-2xl font-bold',
  statSmall: 'text-lg font-semibold',
} as const;

// ============================================================================
// ICONOGRAPHY
// ============================================================================

export const ICON_SIZES = {
  // Standard icon sizes
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
  '2xl': 'h-10 w-10',
  '3xl': 'h-12 w-12',
  
  // Context-specific sizes
  badge: 'h-3 w-3',
  button: 'h-4 w-4',
  card: 'h-6 w-6',
  header: 'h-8 w-8',
  hero: 'h-12 w-12',
} as const;

export const ICON_CONTAINERS = {
  // Round containers for icons
  small: 'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
  medium: 'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
  large: 'h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
  xlarge: 'h-16 w-16 rounded-xl flex items-center justify-center flex-shrink-0',
  
  // With backgrounds
  mutedSmall: 'h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0',
  mutedMedium: 'h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0',
  mutedLarge: 'h-12 w-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0',
  
  // Primary containers
  primarySmall: 'h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0',
  primaryMedium: 'h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0',
  primaryLarge: 'h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0',
} as const;

// ============================================================================
// COLORS & STATUS
// ============================================================================

export const COLORS = {
  // Brand colors
  primary: '#1FD1B2',         // Minty Green
  primaryRgb: '31, 209, 178',
  secondary: '#5252E3',       // Electric Blue
  
  // Brand gradients (CONSOLIDATED - gebruik deze altijd)
  gradients: {
    // Primary brand gradients
    primary: 'bg-gradient-to-br from-[#1FD1B2] to-emerald-500',
    primarySubtle: 'bg-gradient-to-br from-[#1FD1B2]/5 to-emerald-50/50 dark:from-[#1FD1B2]/10 dark:to-emerald-950/20',
    secondary: 'bg-gradient-to-br from-[#5252E3] to-purple-600',
    combined: 'bg-gradient-to-br from-[#5252E3] to-[#1FD1B2]',
    combinedHorizontal: 'bg-gradient-to-r from-[#5252E3] to-[#1FD1B2]',
    
    // Semantic color gradients (voor icons/decoratie)
    blue: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    purple: 'bg-gradient-to-br from-purple-500 to-pink-600',
    green: 'bg-gradient-to-br from-green-500 to-emerald-600',
    orange: 'bg-gradient-to-br from-orange-500 to-amber-600',
    
    // Background gradients
    muted: 'bg-gradient-to-b from-muted/30 to-background',
    slate: 'bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800',
    
    // Colored backgrounds (voor sections)
    purpleSubtle: 'bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20',
    blueSubtle: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
    greenSubtle: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
  },
  
  // Status colors
  status: {
    success: {
      bg: 'bg-green-50/50 dark:bg-green-900/10',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-600',
      icon: 'text-green-600',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
    },
    warning: {
      bg: 'bg-yellow-50/50 dark:bg-yellow-900/10',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-600',
      icon: 'text-yellow-600',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    error: {
      bg: 'bg-red-50/50 dark:bg-red-900/10',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-600',
      icon: 'text-red-600',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
    },
    info: {
      bg: 'bg-blue-50/50 dark:bg-blue-900/10',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-600',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    neutral: {
      bg: 'bg-muted',
      border: 'border',
      text: 'text-muted-foreground',
      icon: 'text-muted-foreground',
      iconBg: 'bg-muted',
    },
  },
  
  // Decision quality colors
  quality: {
    safe: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-400',
      icon: 'text-green-600',
    },
    atRisk: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-700 dark:text-yellow-400',
      icon: 'text-yellow-600',
    },
    blocked: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-400',
      icon: 'text-red-600',
    },
  },
  
  // Badge colors
  badge: {
    free: 'bg-[#1FD1B2] text-white hover:bg-[#1FD1B2]',
    basic: 'border-gray-300 text-gray-700 bg-white',
    premium: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white',
  },
} as const;

// ============================================================================
// COMPONENT VARIANTS
// ============================================================================

export const CARD_VARIANTS = {
  // Default card
  default: 'rounded-xl border bg-card',
  
  // Interactive card
  interactive: 'rounded-xl border bg-card transition-all hover:shadow-md cursor-pointer',
  
  // Highlighted card
  highlighted: 'rounded-xl border-2 border-primary/30 bg-primary/5',
  
  // Status cards
  success: 'rounded-xl bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
  warning: 'rounded-xl bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800',
  error: 'rounded-xl bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
  info: 'rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
} as const;

export const BUTTON_VARIANTS = {
  // Primary action
  primary: 'bg-primary hover:bg-primary/90 text-white',
  
  // Secondary action
  secondary: 'border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50',
  
  // Sizes
  sm: 'h-9 px-4',
  md: 'h-10 px-6',
  lg: 'h-11 px-8',
} as const;

export const BADGE_VARIANTS = {
  // Standard badges
  default: 'px-2 py-0.5 text-xs font-medium rounded-md',
  
  // Status badges
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  inProgress: 'bg-blue-100 text-blue-700 border-blue-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  validated: 'bg-green-100 text-green-700 border-green-300',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
  
  // Access level badges
  free: 'bg-[#1FD1B2] text-white px-2 py-0 text-xs font-semibold',
  basic: 'border px-2 py-0 text-xs',
  premium: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2 py-0 text-xs',
} as const;

export const PROGRESS_BAR_VARIANTS = {
  // Standard progress bar
  default: 'h-2',
  large: 'h-3',
  
  // Themed progress bars
  primary: 'h-2 bg-primary/10',
  success: 'h-2 bg-green-100',
  warning: 'h-2 bg-yellow-100',
} as const;

// ============================================================================
// ANIMATION
// ============================================================================

export const ANIMATION = {
  // Motion presets
  fadeIn: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  },
  
  fadeInFast: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 },
  },
  
  fadeInSlow: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  },
  
  // Hover transitions
  hover: 'transition-all duration-200',
  hoverShadow: 'transition-all hover:shadow-md',
  hoverScale: 'transition-transform hover:scale-105',
} as const;

// ============================================================================
// EFFECTS (Shadows, Borders, Opacity)
// ============================================================================

export const EFFECTS = {
  // Shadow levels (CONSOLIDATED)
  shadow: {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
  },
  
  // Border radius (CONSOLIDATED)
  radius: {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    full: 'rounded-full',
  },
  
  // Border widths
  border: {
    default: 'border',
    thick: 'border-2',
    none: 'border-0',
  },
  
  // Opacity levels
  opacity: {
    disabled: 'opacity-50',
    hover: 'opacity-80',
    subtle: 'opacity-60',
    verySubtle: 'opacity-40',
  },
  
  // Backdrop effects
  backdrop: {
    blur: 'backdrop-blur-sm',
    blurMd: 'backdrop-blur-md',
    blurLg: 'backdrop-blur-lg',
  },
  
  // Ring effects (for focus states)
  ring: {
    default: 'ring-2 ring-offset-2',
    primary: 'ring-2 ring-primary/30',
    error: 'ring-2 ring-red-500/30',
    focus: 'focus:ring-2 focus:ring-primary focus:ring-offset-2',
  },
} as const;

// ============================================================================
// HEADER PATTERNS
// ============================================================================

export const HEADER_PATTERNS = {
  // Sticky page header (UNIFORM)
  sticky: {
    // Wrapper
    wrapper: 'sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10',
    
    // Inner container with uniform padding
    container: 'max-w-7xl mx-auto px-8 py-6',
    containerLarge: 'max-w-[1800px] mx-auto px-8 py-6',
    containerMedium: 'max-w-6xl mx-auto px-8 py-6',
    containerSmall: 'max-w-5xl mx-auto px-8 py-6',
    
    // Compact variant (less vertical padding)
    containerCompact: 'max-w-7xl mx-auto px-8 py-4',
    containerCompactLarge: 'max-w-[1800px] mx-auto px-8 py-4',
    containerCompactMedium: 'max-w-6xl mx-auto px-8 py-4',
    
    // Content layout
    content: 'flex items-center justify-between',
    contentWithGap: 'flex items-center justify-between gap-4',
  },
  
  // Back button pattern (CLEAN & MINIMAL)
  backButton: {
    wrapper: 'mb-4',
    button: 'text-muted-foreground hover:text-foreground transition-colors',
    icon: 'h-4 w-4',
  },
  
  // Header left side (icon + title)
  left: {
    wrapper: 'flex items-center gap-4',
    wrapperWithGap3: 'flex items-center gap-3',
    
    // Icon container (UNIFORM)
    iconContainer: 'h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
    iconContainerSmall: 'h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
    icon: 'h-6 w-6 text-white',
    iconSmall: 'h-5 w-5 text-white',
    
    // Title section
    titleWrapper: 'flex flex-col',
    title: 'text-3xl font-semibold mb-1',
    titleCompact: 'text-2xl font-semibold',
    subtitle: 'text-muted-foreground',
    subtitleSmall: 'text-sm text-muted-foreground',
  },
  
  // Header right side (actions) - CLEAN DESIGN
  right: {
    wrapper: 'flex items-center gap-3',
    wrapperCompact: 'flex items-center gap-2',
    
    // Primary action button (UNIFORM)
    primaryButton: {
      base: 'gap-2',
      size: 'default', // Use Button size="default"
      icon: 'h-4 w-4',
    },
    
    // Secondary action button
    secondaryButton: {
      base: 'gap-2',
      size: 'sm',
      icon: 'h-4 w-4',
    },
    
    // Badge/Indicator (count, status) - SUBTLE
    badge: {
      base: 'px-2.5 py-1 text-xs font-medium rounded-md bg-muted text-muted-foreground',
      withIcon: 'flex items-center gap-1.5',
    },
  },
  
  // Page header with back button (non-sticky)
  pageWithBack: {
    container: 'mb-6',
    backButton: 'mb-4',
    content: 'flex items-start justify-between',
    avatar: 'h-16 w-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0',
    info: 'flex-1',
    title: 'flex items-center space-x-2 mb-1',
    titleText: 'text-2xl font-semibold',
    subtitle: 'text-muted-foreground mb-3',
    stats: 'flex items-center space-x-6',
  },
  
  // Section header
  section: {
    container: 'flex items-center justify-between mb-4',
    title: 'text-xl font-semibold',
    subtitle: 'text-sm text-muted-foreground',
  },
} as const;

// ============================================================================
// FILTER & CONTROL PATTERNS (FOR CONTENT AREA)
// ============================================================================

export const FILTER_PATTERNS = {
  // Filter bar in content (NOT in header)
  contentFilterBar: {
    // Container
    wrapper: 'flex items-center gap-3 mb-6',
    wrapperWithBorder: 'flex items-center gap-3 pb-4 mb-6 border-b border-border',
    
    // Search input
    searchWrapper: 'flex-1 relative',
    searchIcon: 'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground',
    searchInput: 'pl-9',
    
    // Filter controls
    controlsWrapper: 'flex items-center gap-2',
    
    // View mode toggle (grid/list)
    viewToggle: {
      wrapper: 'flex items-center gap-1 p-1 bg-muted rounded-lg',
      button: 'h-8 w-8 p-0',
      icon: 'h-4 w-4',
    },
    
    // Filter dropdown
    filterButton: {
      base: 'gap-2',
      size: 'sm',
      icon: 'h-4 w-4',
      chevron: 'h-3 w-3',
    },
    
    // Sort/Category select
    select: {
      wrapper: 'w-[180px]',
    },
  },
  
  // Simple filter tabs (in content)
  tabs: {
    wrapper: 'flex items-center gap-2 mb-6',
    tab: 'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
    tabActive: 'bg-primary text-primary-foreground',
    tabInactive: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  },
} as const;

// ============================================================================
// LAYOUT PATTERNS
// ============================================================================

export const LAYOUT_PATTERNS = {
  // Container widths (WITH UNIFORM PADDING)
  maxWidth: {
    sm: 'max-w-3xl mx-auto',
    md: 'max-w-5xl mx-auto',
    lg: 'max-w-6xl mx-auto',
    xl: 'max-w-7xl mx-auto',
  },
  
  // Common layouts (UNIFORM px-8 PADDING)
  fullPage: 'h-full overflow-auto bg-background',
  centeredContent: 'max-w-7xl mx-auto px-8 py-8',
  centeredContentSm: 'max-w-3xl mx-auto px-8 py-8',
  centeredContentMd: 'max-w-5xl mx-auto px-8 py-8',
  centeredContentLg: 'max-w-6xl mx-auto px-8 py-8',
  centeredContentXl: 'max-w-7xl mx-auto px-8 py-8',
  
  // Page containers with uniform padding
  pageContainer: 'px-8 py-8',
  pageContainerNoPadding: '', // For full-width layouts
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Combine multiple class strings
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Get status color classes
 */
export function getStatusColors(status: 'success' | 'warning' | 'error' | 'info' | 'neutral') {
  return COLORS.status[status];
}

/**
 * Get quality color classes
 */
export function getQualityColors(quality: 'safe' | 'atRisk' | 'blocked') {
  return COLORS.quality[quality];
}

/**
 * Get badge variant classes for impact/quality indicators
 */
export function getBadgeVariant(impact: 'high' | 'medium' | 'low') {
  switch (impact) {
    case 'high':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-700 dark:text-green-400',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-700 dark:text-yellow-400',
      };
    case 'low':
      return {
        bg: 'bg-gray-50 dark:bg-gray-900/20',
        border: 'border-gray-200 dark:border-gray-800',
        text: 'text-gray-700 dark:text-gray-400',
      };
    default:
      return getStatusColors('neutral');
  }
}