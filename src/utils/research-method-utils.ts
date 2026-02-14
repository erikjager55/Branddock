import { ResearchMethod, ResearchMethodType } from '../types/brand-asset';
import { VALIDATION_METHODS } from '../config/validation-methods';
import { MethodStatus, MethodImpact, MethodConfidence, UnlockStatus } from '../components/research/ResearchMethodCard';

/**
 * Central utility functions for research method data transformation
 * Ensures consistency across all components
 */

/**
 * Convert ResearchMethod status to MethodStatus
 * Handles locked state logic consistently
 */
export function getMethodStatus(
  method: ResearchMethod,
  isLocked: boolean = false
): MethodStatus {
  if (isLocked) {
    return 'locked';
  }
  
  if (method.status === 'completed') {
    return 'completed';
  }
  
  if (method.status === 'in-progress') {
    return 'running';
  }
  
  // Check if method requires unlock
  const validationMethod = VALIDATION_METHODS.find(m => m.id === method.type);
  if (validationMethod && validationMethod.unlockLevel !== 'free') {
    return 'locked';
  }
  
  return 'available';
}

/**
 * Get impact value for a method
 * Can be extended to derive from method metadata
 */
export function getMethodImpact(method: ResearchMethod): MethodImpact {
  // Check if method has impact in metadata
  if (method.metadata?.impact) {
    return method.metadata.impact as MethodImpact;
  }
  
  // Default impact based on method type
  const highImpactMethods: ResearchMethodType[] = [
    'competitor-analysis',
    'audience-survey',
    'social-listening'
  ];
  
  const mediumImpactMethods: ResearchMethodType[] = [
    'trend-analysis',
    'influencer-analysis',
    'sentiment-analysis'
  ];
  
  if (highImpactMethods.includes(method.type)) {
    return 'high';
  }
  
  if (mediumImpactMethods.includes(method.type)) {
    return 'medium';
  }
  
  return 'high'; // Default to high
}

/**
 * Get quality score for a method
 */
export function getMethodQualityScore(method: ResearchMethod): number | undefined {
  if (method.status !== 'completed') {
    return undefined;
  }
  
  // Check if method has quality score in metadata
  if (method.metadata?.qualityScore !== undefined) {
    return method.metadata.qualityScore;
  }
  
  // Default quality score for completed methods
  return 95;
}

/**
 * Get confidence level for a method
 */
export function getMethodConfidence(method: ResearchMethod): MethodConfidence | undefined {
  if (method.status !== 'completed') {
    return undefined;
  }
  
  // Check if method has confidence in metadata
  if (method.metadata?.confidence) {
    return method.metadata.confidence as MethodConfidence;
  }
  
  // Default confidence for completed methods
  return 'high';
}

/**
 * Get unlock status from validation method
 */
export function getMethodUnlockStatus(methodType: ResearchMethodType): UnlockStatus {
  const validationMethod = VALIDATION_METHODS.find(m => m.id === methodType);
  return (validationMethod?.unlockLevel as UnlockStatus) || 'free';
}

/**
 * Get action button label based on status
 * Ensures consistent labels across all components
 */
export function getMethodActionLabel(status: MethodStatus, methodType?: ResearchMethodType): string {
  switch (status) {
    case 'completed':
      // AI Exploration gets special label since it opens chat interface, not results
      if (methodType === 'ai-exploration') {
        return 'View Analysis';
      }
      return 'View Results';
    case 'running':
      return 'View Progress';
    case 'locked':
      return 'Unlock';
    case 'available':
    default:
      return 'Start Research';
  }
}

/**
 * Get secondary action label based on status
 */
export function getMethodSecondaryActionLabel(status: MethodStatus): string | undefined {
  switch (status) {
    case 'completed':
      return 'Export Data';
    case 'running':
      return 'Pause';
    default:
      return undefined;
  }
}

/**
 * Convert ResearchMethod to standardized format for ResearchMethodCard
 * This is the SINGLE SOURCE OF TRUTH for method data transformation
 */
export interface StandardizedMethodData {
  methodId: ResearchMethodType;
  title: string;
  description: string;
  duration?: string;
  category?: string;
  unlockStatus: UnlockStatus;
  progressState: MethodStatus;
  progressValue?: number;
  impactValue?: MethodImpact;
  qualityScore?: number;
  confidence?: MethodConfidence;
  icon: any; // LucideIcon
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  completedAt?: string;
}

export function standardizeMethodData(
  method: ResearchMethod,
  isLocked: boolean = false
): StandardizedMethodData | null {
  // Get validation method config
  const validationMethod = VALIDATION_METHODS.find(m => m.id === method.type);
  if (!validationMethod) {
    return null;
  }
  
  const progressState = getMethodStatus(method, isLocked);
  
  return {
    methodId: method.type,
    title: validationMethod.name,
    description: validationMethod.description,
    duration: validationMethod.duration,
    category: validationMethod.category,
    unlockStatus: getMethodUnlockStatus(method.type),
    progressState,
    progressValue: method.progress,
    impactValue: getMethodImpact(method),
    qualityScore: getMethodQualityScore(method),
    confidence: getMethodConfidence(method),
    icon: validationMethod.icon,
    primaryActionLabel: getMethodActionLabel(progressState, method.type),
    secondaryActionLabel: getMethodSecondaryActionLabel(progressState),
    completedAt: method.completedAt,
  };
}