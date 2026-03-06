/**
 * 🔒 PROTECTED COMPONENT REGISTRY
 * =================================
 * 
 * IMMUTABLE LOCK SYSTEM for all base components and design styles.
 * This system prevents future edits from going outside the defined variants.
 *
 * 🚨 CRITICAL WARNING:
 * These components are LOCKED and may ONLY be modified via:
 * 1. The variant system (adding new variants)
 * 2. Design system tokens from /constants/design-system.ts
 * 3. Formal design system updates via governance process
 *
 * NO DIRECT CLASSNAME OVERRIDES ALLOWED!
 */

import { SPACING, COLORS, TYPOGRAPHY, EFFECTS } from './design-system';

// ============================================================================
// PROTECTION LEVELS
// ============================================================================

export enum ProtectionLevel {
  /** LOCKED - Cannot be modified without design system approval */
  LOCKED = 'LOCKED',
  /** RESTRICTED - Only variant extensions allowed */
  RESTRICTED = 'RESTRICTED',
  /** MONITORED - Warnings on custom styling */
  MONITORED = 'MONITORED',
  /** FLEXIBLE - Freely customizable (with best practices) */
  FLEXIBLE = 'FLEXIBLE',
}

export enum ComponentCategory {
  CORE = 'CORE',           // Button, Card, Badge
  LAYOUT = 'LAYOUT',       // Container, Stack, Grid, Flex
  FORM = 'FORM',           // Input, Select, Checkbox, etc.
  NAVIGATION = 'NAVIGATION', // Sidebar, Breadcrumb, etc.
  FEEDBACK = 'FEEDBACK',   // Alert, Toast, Dialog
  TYPOGRAPHY = 'TYPOGRAPHY', // Headings, Text, etc.
  UTILITY = 'UTILITY',     // Separator, Spacer, etc.
}

// ============================================================================
// PROTECTED COMPONENT DEFINITION
// ============================================================================

export interface ProtectedComponent {
  /** Component name */
  name: string;
  /** File location */
  path: string;
  /** Protection level */
  protection: ProtectionLevel;
  /** Component category */
  category: ComponentCategory;
  /** Allowed variants (whitelist) */
  allowedVariants: string[];
  /** Allowed props (whitelist) */
  allowedProps: string[];
  /** Forbidden className overrides (blacklist patterns) */
  forbiddenClassNames: RegExp[];
  /** Design system tokens that must be used (hint for developers) */
  requiredTokens: {
    colors?: string;
    spacing?: string;
    typography?: string;
    effects?: string;
  };
  /** Last review date */
  lastReviewed: string;
  /** Responsible team */
  owner: 'design-system' | 'frontend' | 'platform';
}

// ============================================================================
// PROTECTED COMPONENTS REGISTRY
// ============================================================================

export const PROTECTED_COMPONENTS: Record<string, ProtectedComponent> = {
  // ====================================
  // CORE COMPONENTS - HIGHEST PROTECTION
  // ====================================
  
  Button: {
    name: 'Button',
    path: '/components/ui/button.tsx',
    protection: ProtectionLevel.LOCKED,
    category: ComponentCategory.CORE,
    allowedVariants: [
      'default', 'destructive', 'outline', 'secondary', 'ghost', 'link',
      'success', 'warning', 'gradient'
    ],
    allowedProps: [
      'variant', 'size', 'fullWidth', 'asChild', 'disabled', 'onClick',
      'type', 'children', 'className' // className only for spacing/layout
    ],
    forbiddenClassNames: [
      /bg-(?!transparent)/,  // No background overrides except transparent
      /text-(?!inherit)/,    // No text color overrides except inherit
      /border-(?!0|none)/,   // No border overrides except removal
      /rounded-/,            // No border-radius overrides
      /shadow-/,             // No shadow overrides
      /hover:bg-/,           // No hover background overrides
      /hover:text-/,         // No hover text overrides
    ],
    requiredTokens: {
      colors: 'primary',
      spacing: 'spacing',
      effects: 'shadows',
    },
    lastReviewed: '2025-01-15',
    owner: 'design-system',
  },

  Card: {
    name: 'Card',
    path: '/components/ui/card.tsx',
    protection: ProtectionLevel.LOCKED,
    category: ComponentCategory.CORE,
    allowedVariants: [
      'default', 'interactive', 'highlighted',
      'success', 'warning', 'error', 'info', 'gradient'
    ],
    allowedProps: [
      'variant', 'padding', 'hover', 'onClick', 'children', 'className'
    ],
    forbiddenClassNames: [
      /bg-(?!transparent)/,
      /border-(?!0|none)/,
      /rounded-/,
      /shadow-/,
      /hover:shadow-/,
      /hover:border-/,
    ],
    requiredTokens: {
      colors: 'neutral',
      spacing: 'spacing',
      effects: 'shadows',
    },
    lastReviewed: '2025-01-15',
    owner: 'design-system',
  },

  Badge: {
    name: 'Badge',
    path: '/components/ui/badge.tsx',
    protection: ProtectionLevel.LOCKED,
    category: ComponentCategory.CORE,
    allowedVariants: [
      'default', 'secondary', 'destructive', 'outline',
      'success', 'warning', 'error', 'info',
      'purple', 'orange', 'pink', 'gradient', 'premium'
    ],
    allowedProps: [
      'variant', 'size', 'shape', 'asChild', 'children', 'className'
    ],
    forbiddenClassNames: [
      /bg-(?!transparent)/,
      /text-(?!inherit)/,
      /border-/,
      /rounded-/,
      /px-/,
      /py-/,
    ],
    requiredTokens: {
      colors: 'semantic',
      spacing: 'spacing',
    },
    lastReviewed: '2025-01-15',
    owner: 'design-system',
  },

  // ====================================
  // LAYOUT COMPONENTS - RESTRICTED
  // ====================================

  Stack: {
    name: 'Stack',
    path: '/components/ui/Stack.tsx',
    protection: ProtectionLevel.RESTRICTED,
    category: ComponentCategory.LAYOUT,
    allowedVariants: [],
    allowedProps: [
      'direction', 'gap', 'align', 'justify', 'wrap', 'fullWidth', 'children', 'className', 'as'
    ],
    forbiddenClassNames: [
      /flex-(?!col|row|wrap|nowrap)/,  // Only basic flex allowed
    ],
    requiredTokens: {
      spacing: 'spacing',
    },
    lastReviewed: '2025-01-15',
    owner: 'design-system',
  },

  Grid: {
    name: 'Grid',
    path: '/components/ui/Grid.tsx',
    protection: ProtectionLevel.RESTRICTED,
    category: ComponentCategory.LAYOUT,
    allowedVariants: [],
    allowedProps: [
      'cols', 'rows', 'gap', 'align', 'justify', 'children', 'className', 'as'
    ],
    forbiddenClassNames: [
      /grid-cols-(?!1|2|3|4|5|6|12)/,  // Only standard grid columns
      /grid-rows-/,                     // Must use rows prop
    ],
    requiredTokens: {
      spacing: 'spacing',
    },
    lastReviewed: '2025-01-15',
    owner: 'design-system',
  },

  Container: {
    name: 'Container',
    path: '/components/ui/Container.tsx',
    protection: ProtectionLevel.RESTRICTED,
    category: ComponentCategory.LAYOUT,
    allowedVariants: [],
    allowedProps: [
      'maxWidth', 'paddingX', 'paddingY', 'center', 'children', 'className', 'as'
    ],
    forbiddenClassNames: [
      /max-w-/,      // Must use maxWidth prop
      /px-/,         // Must use paddingX prop
      /py-/,         // Must use paddingY prop
    ],
    requiredTokens: {
      spacing: 'spacing',
    },
    lastReviewed: '2025-01-15',
    owner: 'design-system',
  },

  Flex: {
    name: 'Flex',
    path: '/components/ui/Flex.tsx',
    protection: ProtectionLevel.RESTRICTED,
    category: ComponentCategory.LAYOUT,
    allowedVariants: [],
    allowedProps: [
      'direction', 'gap', 'align', 'justify', 'wrap', 'children', 'className', 'as'
    ],
    forbiddenClassNames: [
      /flex-(?!row|col|wrap|nowrap)/,
    ],
    requiredTokens: {
      spacing: 'spacing',
    },
    lastReviewed: '2025-01-15',
    owner: 'design-system',
  },

  // ====================================
  // UI COMPONENTS - MONITORED
  // ====================================

  PageHeader: {
    name: 'PageHeader',
    path: '/components/ui/PageHeader.tsx',
    protection: ProtectionLevel.MONITORED,
    category: ComponentCategory.UTILITY,
    allowedVariants: [],
    allowedProps: [
      'icon', 'iconGradient', 'title', 'subtitle', 'actions', 'breadcrumbs', 'className'
    ],
    forbiddenClassNames: [],
    requiredTokens: {
      spacing: 'spacing',
      typography: 'fontSize',
    },
    lastReviewed: '2025-01-15',
    owner: 'frontend',
  },

  SectionHeader: {
    name: 'SectionHeader',
    path: '/components/ui/SectionHeader.tsx',
    protection: ProtectionLevel.MONITORED,
    category: ComponentCategory.UTILITY,
    allowedVariants: [],
    allowedProps: [
      'title', 'subtitle', 'actions', 'icon', 'badge', 'className'
    ],
    forbiddenClassNames: [],
    requiredTokens: {
      spacing: 'spacing',
      typography: 'fontSize',
    },
    lastReviewed: '2025-01-15',
    owner: 'frontend',
  },

  IconContainer: {
    name: 'IconContainer',
    path: '/components/ui/IconContainer.tsx',
    protection: ProtectionLevel.MONITORED,
    category: ComponentCategory.UTILITY,
    allowedVariants: [],
    allowedProps: [
      'size', 'gradient', 'color', 'children', 'className'
    ],
    forbiddenClassNames: [],
    requiredTokens: {
      spacing: 'spacing',
      colors: 'gradients',
    },
    lastReviewed: '2025-01-15',
    owner: 'frontend',
  },

  StatusBadge: {
    name: 'StatusBadge',
    path: '/components/ui/StatusBadge.tsx',
    protection: ProtectionLevel.MONITORED,
    category: ComponentCategory.FEEDBACK,
    allowedVariants: [],
    allowedProps: [
      'status', 'layer', 'children', 'className'
    ],
    forbiddenClassNames: [],
    requiredTokens: {
      colors: 'semantic',
    },
    lastReviewed: '2025-01-15',
    owner: 'frontend',
  },
};

// ============================================================================
// PROTECTED DESIGN TOKENS
// ============================================================================

export interface ProtectedToken {
  /** Token name */
  name: string;
  /** Token category */
  category: 'color' | 'spacing' | 'typography' | 'effect';
  /** Protection level */
  protection: ProtectionLevel;
  /** Token value(s) */
  values: Record<string, string | number>;
  /** Usage instructions */
  usage: string;
  /** Last review */
  lastReviewed: string;
}

export const PROTECTED_TOKENS: Record<string, ProtectedToken> = {
  // ====================================
  // COLOR TOKENS
  // ====================================
  
  primary: {
    name: 'Primary Color',
    category: 'color',
    protection: ProtectionLevel.LOCKED,
    values: {
      DEFAULT: COLORS.primary,
    },
    usage: 'Primary brand color (Minty Green #1FD1B2). Use for primary actions, highlights.',
    lastReviewed: '2025-01-15',
  },

  semantic: {
    name: 'Semantic Colors',
    category: 'color',
    protection: ProtectionLevel.LOCKED,
    values: {
      success: COLORS.status.success.text,
      warning: COLORS.status.warning.text,
      error: COLORS.status.error.text,
      info: COLORS.status.info.text,
    },
    usage: 'Status and feedback colors. Use for success/warning/error/info states.',
    lastReviewed: '2025-01-15',
  },

  accent: {
    name: 'Accent Colors',
    category: 'color',
    protection: ProtectionLevel.LOCKED,
    values: {
      primary: COLORS.primary,
      secondary: COLORS.secondary,
    },
    usage: 'Accent colors for categories, highlights, and variety.',
    lastReviewed: '2025-01-15',
  },

  // ====================================
  // SPACING TOKENS
  // ====================================

  spacing: {
    name: 'Spacing Scale',
    category: 'spacing',
    protection: ProtectionLevel.LOCKED,
    values: SPACING.component,
    usage: 'Unified spacing scale for margins, padding, gaps. Use via props (gap="md").',
    lastReviewed: '2025-01-15',
  },

  containerPadding: {
    name: 'Container Padding',
    category: 'spacing',
    protection: ProtectionLevel.LOCKED,
    values: SPACING.page,
    usage: 'Container padding presets. Use Container component with paddingX/paddingY props.',
    lastReviewed: '2025-01-15',
  },

  // ====================================
  // TYPOGRAPHY TOKENS
  // ====================================

  fontSize: {
    name: 'Font Size Scale',
    category: 'typography',
    protection: ProtectionLevel.LOCKED,
    values: {
      body: TYPOGRAPHY.body,
      bodySmall: TYPOGRAPHY.bodySmall,
      bodyLarge: TYPOGRAPHY.bodyLarge,
      label: TYPOGRAPHY.label,
      caption: TYPOGRAPHY.caption,
    },
    usage: 'Font size scale. Do NOT use text-* classes, use variant props.',
    lastReviewed: '2025-01-15',
  },

  fontWeight: {
    name: 'Font Weight Scale',
    category: 'typography',
    protection: ProtectionLevel.LOCKED,
    values: {
      emphasis: TYPOGRAPHY.emphasis,
    },
    usage: 'Font weight scale. Do NOT use font-* classes, use variant props.',
    lastReviewed: '2025-01-15',
  },

  // ====================================
  // EFFECT TOKENS
  // ====================================

  shadows: {
    name: 'Shadow Scale',
    category: 'effect',
    protection: ProtectionLevel.LOCKED,
    values: EFFECTS.shadow,
    usage: 'Shadow presets. Use via component variants (Card hover="shadow").',
    lastReviewed: '2025-01-15',
  },

  borderRadius: {
    name: 'Border Radius Scale',
    category: 'effect',
    protection: ProtectionLevel.LOCKED,
    values: EFFECTS.radius,
    usage: 'Border radius scale. Use component defaults, NO rounded-* overrides.',
    lastReviewed: '2025-01-15',
  },
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a component is protected
 */
export function isComponentProtected(componentName: string): boolean {
  return componentName in PROTECTED_COMPONENTS;
}

/**
 * Get protection level of a component
 */
export function getProtectionLevel(componentName: string): ProtectionLevel | null {
  const component = PROTECTED_COMPONENTS[componentName];
  return component ? component.protection : null;
}

/**
 * Check if a variant is allowed
 */
export function isVariantAllowed(
  componentName: string,
  variant: string
): boolean {
  const component = PROTECTED_COMPONENTS[componentName];
  if (!component) return true; // Not protected
  return component.allowedVariants.includes(variant);
}

/**
 * Check if a className contains forbidden patterns
 */
export function hasForbiddenClassName(
  componentName: string,
  className: string
): { forbidden: boolean; violations: string[] } {
  const component = PROTECTED_COMPONENTS[componentName];
  if (!component) return { forbidden: false, violations: [] };

  const violations: string[] = [];
  const classes = className.split(' ');

  for (const cls of classes) {
    for (const pattern of component.forbiddenClassNames) {
      if (pattern.test(cls)) {
        violations.push(cls);
      }
    }
  }

  return {
    forbidden: violations.length > 0,
    violations,
  };
}

/**
 * Get component recommendations
 */
export function getComponentRecommendations(
  componentName: string
): string[] {
  const component = PROTECTED_COMPONENTS[componentName];
  if (!component) return [];

  const recommendations: string[] = [];

  recommendations.push(
    `✅ Use allowed variants: ${component.allowedVariants.join(', ')}`
  );

  recommendations.push(
    `✅ Use allowed props: ${component.allowedProps.join(', ')}`
  );

  if (component.forbiddenClassNames.length > 0) {
    recommendations.push(
      `❌ NO className overrides for: styling properties (use variants)`
    );
  }

  if (component.requiredTokens.colors) {
    recommendations.push(
      `🎨 Use ${component.requiredTokens.colors} tokens for colors`
    );
  }

  if (component.requiredTokens.spacing) {
    recommendations.push(
      `📏 Use ${component.requiredTokens.spacing} tokens for spacing`
    );
  }

  return recommendations;
}

// ============================================================================
// STATISTICS
// ============================================================================

export function getProtectionStatistics() {
  const components = Object.values(PROTECTED_COMPONENTS);
  
  return {
    total: components.length,
    byProtection: {
      locked: components.filter(c => c.protection === ProtectionLevel.LOCKED).length,
      restricted: components.filter(c => c.protection === ProtectionLevel.RESTRICTED).length,
      monitored: components.filter(c => c.protection === ProtectionLevel.MONITORED).length,
      flexible: components.filter(c => c.protection === ProtectionLevel.FLEXIBLE).length,
    },
    byCategory: {
      core: components.filter(c => c.category === ComponentCategory.CORE).length,
      layout: components.filter(c => c.category === ComponentCategory.LAYOUT).length,
      form: components.filter(c => c.category === ComponentCategory.FORM).length,
      navigation: components.filter(c => c.category === ComponentCategory.NAVIGATION).length,
      feedback: components.filter(c => c.category === ComponentCategory.FEEDBACK).length,
      typography: components.filter(c => c.category === ComponentCategory.TYPOGRAPHY).length,
      utility: components.filter(c => c.category === ComponentCategory.UTILITY).length,
    },
  };
}

