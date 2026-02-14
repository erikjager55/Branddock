/**
 * Central Validation Type Definitions
 * 
 * Single source of truth for all validation method, status, and quality types.
 * This file consolidates previously scattered type definitions from:
 * - /types/brand-asset.ts (ResearchMethodType, ResearchMethodStatus)
 * - /config/validation-methods.ts (ValidationMethodId)
 * - Various component files
 * 
 * @see /types/brand-asset.ts - Asset-specific types
 * @see /config/validation-methods.ts - Validation method configurations
 */

// ============================================================================
// Method Identifiers
// ============================================================================

/**
 * Unique identifier for each validation/research method
 * Used across the application for method identification
 */
export type ValidationMethodId = 
  | 'ai-exploration'
  | 'canvas-workshop'
  | 'interviews'
  | 'questionnaire'
  | 'competitive-analysis'
  | 'customer-research'
  | 'market-trends'
  | 'brand-audit'
  | 'surveys'           // Persona-specific
  | 'user-testing';     // Persona-specific

/**
 * @deprecated Use ValidationMethodId instead
 * Kept for backwards compatibility
 */
export type ResearchMethodType = ValidationMethodId;

// ============================================================================
// Status Types
// ============================================================================

/**
 * Status of a validation method in its lifecycle
 * - available: Method is ready to start
 * - running: Method is currently being executed
 * - completed: Method has been completed successfully
 * - locked: Method requires upgrade to unlock
 */
export type ValidationMethodStatus = 
  | 'available' 
  | 'running' 
  | 'completed' 
  | 'locked';

/**
 * @deprecated Use ValidationMethodStatus instead
 * Kept for backwards compatibility
 */
export type ResearchMethodStatus = ValidationMethodStatus;

/**
 * @deprecated ValidationMethodUIStatus is now merged with ValidationMethodStatus
 * Use ValidationMethodStatus instead
 */
export type ValidationMethodUIStatus = ValidationMethodStatus;

// ============================================================================
// Unlock & Tier Types
// ============================================================================

/**
 * Unlock tier required to access a validation method
 * Determines payment wall and feature access
 */
export type UnlockTier = 'free' | 'basic' | 'pro' | 'premium' | 'enterprise';

/**
 * @deprecated Use 'pro' instead of 'premium'
 * Some configs still use 'premium', map to 'pro' for consistency
 */
export type LegacyUnlockTier = 'free' | 'basic' | 'premium' | 'enterprise';

// ============================================================================
// Decision Quality Types
// ============================================================================

/**
 * Overall decision quality based on completed validation methods
 * - safe: Sufficient research completed (80%+)
 * - at-risk: Some research completed (40-79%)
 * - blocked: Insufficient research (<40%)
 */
export type DecisionQuality = 'safe' | 'at-risk' | 'blocked';

/**
 * Confidence level for individual insights
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// ============================================================================
// Validation Method Interfaces
// ============================================================================

/**
 * Core validation method data structure
 * Used in brand assets to track research progress
 */
export interface ValidationMethod {
  id: ValidationMethodId;
  name: string;
  status: ValidationMethodStatus;
  duration?: string;
  impact?: string;
  unlocksPotential?: number;
  unlockLevel?: UnlockTier;
}

/**
 * Extended validation method with metadata
 * Used when tracking detailed method execution
 */
export interface ValidationMethodWithMetadata extends ValidationMethod {
  progress?: number; // 0-100 if in-progress
  completedAt?: string;
  metadata?: ValidationMethodMetadata;
  artifacts?: string[]; // IDs of generated content
}

/**
 * Metadata associated with validation method execution
 */
export interface ValidationMethodMetadata {
  participants?: number;
  sessions?: number;
  responses?: number;
  facilitator?: string;
  notes?: string;
  tags?: string[];
}

/**
 * Reference to a validation method from content sections
 * Links generated content back to its research source
 */
export interface ValidationMethodReference {
  methodType: ValidationMethodId;
  sessionId?: string;
  contribution?: string;
  confidenceLevel?: ConfidenceLevel;
}

// ============================================================================
// UI Component Props Types
// ============================================================================

/**
 * Props for validation method display components
 * Used in buttons, cards, and status indicators
 */
export interface ValidationMethodDisplayProps {
  id: ValidationMethodId;
  label: string;
  description?: string;
  status: ValidationMethodUIStatus;
  icon?: any; // LucideIcon
  duration?: string;
  impact?: 'high' | 'medium' | 'low';
  unlockLevel?: UnlockTier;
  progress?: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a status is a valid ValidationMethodStatus
 */
export function isValidationMethodStatus(status: string): status is ValidationMethodStatus {
  return ['available', 'running', 'completed', 'locked'].includes(status);
}

/**
 * Type guard to check if an ID is a valid ValidationMethodId
 */
export function isValidationMethodId(id: string): id is ValidationMethodId {
  return [
    'ai-exploration',
    'canvas-workshop',
    'interviews',
    'questionnaire',
    'competitive-analysis',
    'customer-research',
    'market-trends',
    'brand-audit',
    'surveys',
    'user-testing'
  ].includes(id);
}

/**
 * Type guard to check if tier is a valid UnlockTier
 */
export function isUnlockTier(tier: string): tier is UnlockTier {
  return ['free', 'basic', 'pro', 'premium', 'enterprise'].includes(tier);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Map database/API status to UI display status
 */
export function mapToUIStatus(
  methodStatus: ValidationMethodStatus,
  isLocked: boolean,
  isAvailable: boolean = true
): ValidationMethodUIStatus {
  if (isLocked) return 'locked';
  if (!isAvailable) return 'unavailable';
  
  switch (methodStatus) {
    case 'completed':
      return 'completed';
    case 'running':
      return 'running';
    case 'available':
      return 'available';
    case 'locked':
      return 'locked';
    default:
      return 'available';
  }
}

/**
 * Convert legacy 'premium' tier to 'pro'
 */
export function normalizeUnlockTier(tier: LegacyUnlockTier | UnlockTier): UnlockTier {
  return tier === 'premium' ? 'pro' : tier as UnlockTier;
}

/**
 * Get completion percentage for a set of validation methods
 */
export function calculateCompletionRate(methods: ValidationMethod[]): number {
  if (methods.length === 0) return 0;
  const completed = methods.filter(m => m.status === 'completed').length;
  return Math.round((completed / methods.length) * 100);
}

/**
 * Determine decision quality based on completion rate
 */
export function getDecisionQuality(completionRate: number): DecisionQuality {
  if (completionRate >= 80) return 'safe';
  if (completionRate >= 40) return 'at-risk';
  return 'blocked';
}