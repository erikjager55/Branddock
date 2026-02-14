import {
  Brain,
  Users,
  MessageCircle,
  FileText,
  BarChart3,
  Target,
  TrendingUp,
  Layers,
  ClipboardList,
  TestTube,
} from 'lucide-react';
import type { ValidationMethodId, UnlockTier } from '../types/validation';

// Re-export for convenience
export type { ValidationMethodId };

export interface ValidationMethod {
  id: ValidationMethodId;
  name: string;
  description: string;
  icon: any;
  category: string;
  duration: string;
  unlockLevel: UnlockTier;
}

/**
 * Centralized validation methods configuration
 * Used across the application for consistency:
 * - Asset detail pages (research methods)
 * - Brand assets view (validation methods)
 * - Research dashboard
 * - Bundle configuration
 */
export const VALIDATION_METHODS: ValidationMethod[] = [
  {
    id: 'ai-exploration',
    name: 'AI Exploration',
    description: 'AI-assisted analysis and ideation for brand strategy and positioning',
    icon: Brain,
    category: 'AI-Powered',
    duration: '1-2 days',
    unlockLevel: 'free'
  },
  {
    id: 'canvas-workshop',
    name: 'Workshop',
    description: 'Collaborative workshop sessions with stakeholders to explore and define brand elements',
    icon: Users,
    category: 'Collaborative',
    duration: '2-4 hours',
    unlockLevel: 'free'
  },
  {
    id: 'interviews',
    name: 'Interviews',
    description: 'One-on-one deep-dive interviews with key stakeholders and customers',
    icon: MessageCircle,
    category: 'Qualitative',
    duration: '45-60 min',
    unlockLevel: 'basic'
  },
  {
    id: 'questionnaire',
    name: 'Questionnaire',
    description: 'Comprehensive surveys distributed to broader audience for quantitative insights',
    icon: FileText,
    category: 'Quantitative',
    duration: '1-2 weeks',
    unlockLevel: 'basic'
  },
  {
    id: 'competitive-analysis',
    name: 'Competitive Analysis',
    description: 'In-depth analysis of competitors and market positioning',
    icon: BarChart3,
    category: 'Strategic',
    duration: '1 week',
    unlockLevel: 'pro'
  },
  {
    id: 'customer-research',
    name: 'Customer Research',
    description: 'Direct research with target customers to understand perceptions and needs',
    icon: Target,
    category: 'Customer-Centric',
    duration: '2-3 weeks',
    unlockLevel: 'pro'
  },
  {
    id: 'market-trends',
    name: 'Market Trends Analysis',
    description: 'Analysis of market trends and emerging opportunities in your industry',
    icon: TrendingUp,
    category: 'Strategic',
    duration: '1-2 weeks',
    unlockLevel: 'enterprise'
  },
  {
    id: 'brand-audit',
    name: 'Brand Audit',
    description: 'Comprehensive audit of current brand performance and perception',
    icon: Layers,
    category: 'Quantitative',
    duration: '1-2 weeks',
    unlockLevel: 'enterprise'
  },
  // Persona-specific methods
  {
    id: 'surveys',
    name: 'Surveys',
    description: 'Structured survey for broad stakeholder input',
    icon: ClipboardList,
    category: 'Quantitative',
    duration: '1-2 weeks',
    unlockLevel: 'basic'
  },
  {
    id: 'user-testing',
    name: 'User Testing',
    description: 'Observe users interacting with product to validate assumptions',
    icon: TestTube,
    category: 'Behavioral',
    duration: '1 week',
    unlockLevel: 'pro'
  },
];

/**
 * Get a validation method by ID
 */
export function getValidationMethod(id: ValidationMethodId): ValidationMethod | undefined {
  return VALIDATION_METHODS.find(method => method.id === id);
}

/**
 * Get validation methods by unlock level
 */
export function getValidationMethodsByLevel(level: 'free' | 'basic' | 'pro' | 'enterprise'): ValidationMethod[] {
  const levels = { free: 0, basic: 1, pro: 2, enterprise: 3 };
  const targetLevel = levels[level];
  return VALIDATION_METHODS.filter(method => levels[method.unlockLevel] <= targetLevel);
}

/**
 * Get validation methods by category
 */
export function getValidationMethodsByCategory(category: string): ValidationMethod[] {
  return VALIDATION_METHODS.filter(method => method.category === category);
}