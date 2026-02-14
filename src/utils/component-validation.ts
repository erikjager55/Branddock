/**
 * 🛡️ RUNTIME VALIDATION GUARDS
 * ==============================
 * 
 * Runtime validatie systeem dat component usage controleert en
 * waarschuwingen/errors genereert bij violations van het protection system.
 * 
 * FEATURES:
 * - Runtime className validation
 * - Variant whitelist checking
 * - Development warnings (console)
 * - Production silent mode (optional logging)
 * - Violation reporting
 */

import { useEffect, useRef } from 'react';
import {
  PROTECTED_COMPONENTS,
  ProtectionLevel,
  isComponentProtected,
  getProtectionLevel,
  isVariantAllowed,
  hasForbiddenClassName,
  getComponentRecommendations,
} from './protected-components';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ValidationConfig {
  /** Enable/disable runtime validation */
  enabled: boolean;
  /** Show console warnings in development */
  showWarnings: boolean;
  /** Show console errors for LOCKED components */
  showErrors: boolean;
  /** Log violations to analytics/monitoring */
  logViolations: boolean;
  /** Strict mode: throw errors on violations */
  strictMode: boolean;
}

const DEFAULT_CONFIG: ValidationConfig = {
  enabled: process.env.NODE_ENV === 'development',
  showWarnings: true,
  showErrors: true,
  logViolations: true,
  strictMode: false, // Set to true to throw errors
};

let validationConfig: ValidationConfig = { ...DEFAULT_CONFIG };

/**
 * Update validation configuration
 */
export function configureValidation(config: Partial<ValidationConfig>) {
  validationConfig = { ...validationConfig, ...config };
}

/**
 * Get current validation configuration
 */
export function getValidationConfig(): ValidationConfig {
  return { ...validationConfig };
}

// ============================================================================
// VIOLATION TRACKING
// ============================================================================

export interface Violation {
  componentName: string;
  type: 'forbidden-className' | 'invalid-variant' | 'invalid-prop';
  severity: 'error' | 'warning' | 'info';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  stackTrace?: string;
}

const violations: Violation[] = [];

/**
 * Record a violation
 */
function recordViolation(violation: Omit<Violation, 'timestamp' | 'stackTrace'>) {
  const fullViolation: Violation = {
    ...violation,
    timestamp: new Date(),
    stackTrace: validationConfig.strictMode ? new Error().stack : undefined,
  };

  violations.push(fullViolation);

  // Log to console if enabled
  if (validationConfig.showWarnings && violation.severity === 'warning') {
    console.warn(
      `🔒 [Component Protection] ${violation.componentName}: ${violation.message}`,
      violation.details
    );
  }

  if (validationConfig.showErrors && violation.severity === 'error') {
    console.error(
      `🚨 [Component Protection] ${violation.componentName}: ${violation.message}`,
      violation.details
    );
  }

  // Log to analytics if enabled
  if (validationConfig.logViolations) {
    logViolationToAnalytics(fullViolation);
  }

  // Throw error in strict mode
  if (validationConfig.strictMode && violation.severity === 'error') {
    throw new Error(
      `[Component Protection] ${violation.componentName}: ${violation.message}`
    );
  }
}

/**
 * Get all recorded violations
 */
export function getViolations(): Violation[] {
  return [...violations];
}

/**
 * Clear violations log
 */
export function clearViolations() {
  violations.length = 0;
}

/**
 * Get violations by component
 */
export function getViolationsByComponent(componentName: string): Violation[] {
  return violations.filter(v => v.componentName === componentName);
}

/**
 * Get violation statistics
 */
export function getViolationStatistics() {
  return {
    total: violations.length,
    byType: {
      forbiddenClassName: violations.filter(v => v.type === 'forbidden-className').length,
      invalidVariant: violations.filter(v => v.type === 'invalid-variant').length,
      invalidProp: violations.filter(v => v.type === 'invalid-prop').length,
    },
    bySeverity: {
      error: violations.filter(v => v.severity === 'error').length,
      warning: violations.filter(v => v.severity === 'warning').length,
      info: violations.filter(v => v.severity === 'info').length,
    },
    byComponent: violations.reduce((acc, v) => {
      acc[v.componentName] = (acc[v.componentName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}

// ============================================================================
// ANALYTICS INTEGRATION
// ============================================================================

function logViolationToAnalytics(violation: Violation) {
  // Hook for analytics integration (e.g., Sentry, DataDog, custom analytics)
  // This is a placeholder - implement actual analytics logging as needed
  if (typeof window !== 'undefined' && (window as any).__ANALYTICS__) {
    (window as any).__ANALYTICS__.trackViolation({
      component: violation.componentName,
      type: violation.type,
      severity: violation.severity,
      message: violation.message,
    });
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  violations: Violation[];
  recommendations: string[];
}

/**
 * Validate component className prop
 */
export function validateClassName(
  componentName: string,
  className: string | undefined
): ValidationResult {
  if (!validationConfig.enabled || !className) {
    return { valid: true, violations: [], recommendations: [] };
  }

  const component = PROTECTED_COMPONENTS[componentName];
  if (!component) {
    return { valid: true, violations: [], recommendations: [] };
  }

  const result = hasForbiddenClassName(componentName, className);
  const violations: Violation[] = [];
  const recommendations = getComponentRecommendations(componentName);

  if (result.forbidden) {
    const severity = component.protection === ProtectionLevel.LOCKED ? 'error' : 'warning';
    
    const violation = {
      componentName,
      type: 'forbidden-className' as const,
      severity,
      message: `Forbidden className patterns detected: ${result.violations.join(', ')}`,
      details: {
        className,
        violations: result.violations,
        protectionLevel: component.protection,
        recommendations,
      },
    };

    recordViolation(violation);
    violations.push({
      ...violation,
      timestamp: new Date(),
    });
  }

  return {
    valid: violations.length === 0,
    violations,
    recommendations,
  };
}

/**
 * Validate component variant prop
 */
export function validateVariant(
  componentName: string,
  variant: string | undefined
): ValidationResult {
  if (!validationConfig.enabled || !variant) {
    return { valid: true, violations: [], recommendations: [] };
  }

  const component = PROTECTED_COMPONENTS[componentName];
  if (!component) {
    return { valid: true, violations: [], recommendations: [] };
  }

  const violations: Violation[] = [];
  const recommendations = getComponentRecommendations(componentName);

  if (!isVariantAllowed(componentName, variant)) {
    const severity = component.protection === ProtectionLevel.LOCKED ? 'error' : 'warning';
    
    const violation = {
      componentName,
      type: 'invalid-variant' as const,
      severity,
      message: `Invalid variant "${variant}". Allowed variants: ${component.allowedVariants.join(', ')}`,
      details: {
        variant,
        allowedVariants: component.allowedVariants,
        protectionLevel: component.protection,
        recommendations,
      },
    };

    recordViolation(violation);
    violations.push({
      ...violation,
      timestamp: new Date(),
    });
  }

  return {
    valid: violations.length === 0,
    violations,
    recommendations,
  };
}

/**
 * Validate component props
 */
export function validateProps(
  componentName: string,
  props: Record<string, any>
): ValidationResult {
  if (!validationConfig.enabled) {
    return { valid: true, violations: [], recommendations: [] };
  }

  const component = PROTECTED_COMPONENTS[componentName];
  if (!component) {
    return { valid: true, violations: [], recommendations: [] };
  }

  const violations: Violation[] = [];
  const recommendations = getComponentRecommendations(componentName);

  // Check for disallowed props (only for LOCKED components)
  if (component.protection === ProtectionLevel.LOCKED) {
    const propKeys = Object.keys(props);
    const disallowedProps = propKeys.filter(
      key => !component.allowedProps.includes(key) && key !== 'key' && key !== 'ref'
    );

    if (disallowedProps.length > 0) {
      const violation = {
        componentName,
        type: 'invalid-prop' as const,
        severity: 'warning' as const,
        message: `Potentially disallowed props detected: ${disallowedProps.join(', ')}`,
        details: {
          disallowedProps,
          allowedProps: component.allowedProps,
          protectionLevel: component.protection,
          recommendations,
        },
      };

      recordViolation(violation);
      violations.push({
        ...violation,
        timestamp: new Date(),
      });
    }
  }

  // Validate className
  if (props.className) {
    const classNameResult = validateClassName(componentName, props.className);
    violations.push(...classNameResult.violations);
  }

  // Validate variant
  if (props.variant) {
    const variantResult = validateVariant(componentName, props.variant);
    violations.push(...variantResult.violations);
  }

  return {
    valid: violations.length === 0,
    violations,
    recommendations,
  };
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook to validate component usage at runtime
 * 
 * Usage:
 * ```tsx
 * function MyButton(props: ButtonProps) {
 *   useComponentValidation('Button', props);
 *   return <button {...props} />;
 * }
 * ```
 */
export function useComponentValidation(
  componentName: string,
  props: Record<string, any>
) {
  const hasValidated = useRef(false);

  useEffect(() => {
    // Only validate once per mount in development
    if (validationConfig.enabled && !hasValidated.current) {
      validateProps(componentName, props);
      hasValidated.current = true;
    }
  }, []); // Empty deps - only validate once

  // Re-validate in strict mode when props change
  useEffect(() => {
    if (validationConfig.enabled && validationConfig.strictMode) {
      validateProps(componentName, props);
    }
  }, [componentName, props]);
}

/**
 * Hook to monitor className usage
 * 
 * Usage:
 * ```tsx
 * function MyCard({ className, ...props }: CardProps) {
 *   useClassNameMonitor('Card', className);
 *   return <div className={className} {...props} />;
 * }
 * ```
 */
export function useClassNameMonitor(
  componentName: string,
  className: string | undefined
) {
  useEffect(() => {
    if (validationConfig.enabled && className) {
      validateClassName(componentName, className);
    }
  }, [componentName, className]);
}

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

/**
 * Log component protection info to console
 */
export function logComponentInfo(componentName: string) {
  if (!isComponentProtected(componentName)) {
    console.log(`ℹ️ Component "${componentName}" is not protected`);
    return;
  }

  const component = PROTECTED_COMPONENTS[componentName];
  console.group(`🔒 Protection Info: ${componentName}`);
  console.log('Protection Level:', component.protection);
  console.log('Category:', component.category);
  console.log('Allowed Variants:', component.allowedVariants);
  console.log('Allowed Props:', component.allowedProps);
  console.log('Forbidden ClassNames:', component.forbiddenClassNames);
  console.log('Required Tokens:', component.requiredTokens);
  console.log('Last Reviewed:', component.lastReviewed);
  console.log('Owner:', component.owner);
  console.groupEnd();

  const recommendations = getComponentRecommendations(componentName);
  if (recommendations.length > 0) {
    console.group('📋 Recommendations');
    recommendations.forEach(rec => console.log(rec));
    console.groupEnd();
  }
}

/**
 * Log all protection statistics to console
 */
export function logProtectionStatistics() {
  const components = Object.values(PROTECTED_COMPONENTS);
  
  console.group('🔒 Component Protection Statistics');
  console.log('Total Protected Components:', components.length);
  console.log('By Protection Level:');
  console.log('  - LOCKED:', components.filter(c => c.protection === ProtectionLevel.LOCKED).length);
  console.log('  - RESTRICTED:', components.filter(c => c.protection === ProtectionLevel.RESTRICTED).length);
  console.log('  - MONITORED:', components.filter(c => c.protection === ProtectionLevel.MONITORED).length);
  console.log('  - FLEXIBLE:', components.filter(c => c.protection === ProtectionLevel.FLEXIBLE).length);
  console.groupEnd();

  const violationStats = getViolationStatistics();
  console.group('📊 Violation Statistics');
  console.log('Total Violations:', violationStats.total);
  console.log('By Type:', violationStats.byType);
  console.log('By Severity:', violationStats.bySeverity);
  console.log('By Component:', violationStats.byComponent);
  console.groupEnd();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  type ValidationConfig,
  type Violation,
  DEFAULT_CONFIG,
};
