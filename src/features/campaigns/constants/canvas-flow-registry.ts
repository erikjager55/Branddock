// =============================================================
// Canvas Flow Registry
//
// Defines per-medium-category step flows for the Content Canvas.
// Each flow specifies which steps appear, their labels, icons,
// and which React component renders for that step.
//
// The HorizontalAccordion reads from this registry instead of
// using a hardcoded STEPS array.
// =============================================================

import type { LucideIcon } from 'lucide-react';
import { FileText, Layers, Monitor, Calendar, Video, Search } from 'lucide-react';
import type { MediumCategory } from '../types/medium-config.types';

// ─── Types ────────────────────────────────────────────────────

export interface CanvasStepDefinition {
  /** Unique step ID — used as activeStep value in the store */
  id: string;
  /** Tab label shown in the sidebar */
  title: string;
  /** Lucide icon for the tab */
  icon: LucideIcon;
  /**
   * Component key — maps to the actual React component.
   * Multiple step IDs can map to the same component key
   * (e.g. 'script' and 'variants' both use 'variants' component).
   */
  componentKey: string;
}

// ─── Flow Definitions ─────────────────────────────────────────

const DEFAULT_FLOW: CanvasStepDefinition[] = [
  { id: 'context',  title: 'Review Context',   icon: FileText, componentKey: 'context' },
  { id: 'variants', title: 'Content Variants',  icon: Layers,   componentKey: 'variants' },
  { id: 'medium',   title: 'Medium',           icon: Monitor,  componentKey: 'medium' },
  { id: 'planner',  title: 'Planner',          icon: Calendar, componentKey: 'planner' },
];

const VIDEO_FLOW: CanvasStepDefinition[] = [
  { id: 'context',       title: 'Review Context',   icon: FileText, componentKey: 'context' },
  { id: 'script',        title: 'Script Variants',  icon: Layers,   componentKey: 'variants' },
  { id: 'video-builder', title: 'Video Builder',    icon: Video,    componentKey: 'medium' },
  { id: 'planner',       title: 'Planner',          icon: Calendar, componentKey: 'planner' },
];

const WEB_PAGE_FLOW: CanvasStepDefinition[] = [
  { id: 'context',  title: 'Review Context',   icon: FileText, componentKey: 'context' },
  { id: 'seo',      title: 'SEO & Structure',  icon: Search,   componentKey: 'context' }, // SEO inputs are part of context for now
  { id: 'variants', title: 'Content Variants',  icon: Layers,   componentKey: 'variants' },
  { id: 'medium',   title: 'Medium',           icon: Monitor,  componentKey: 'medium' },
  { id: 'planner',  title: 'Planner',          icon: Calendar, componentKey: 'planner' },
];

const FLOW_REGISTRY: Record<string, CanvasStepDefinition[]> = {
  video: VIDEO_FLOW,
  'web-page': WEB_PAGE_FLOW,
};

// ─── Public API ───────────────────────────────────────────────

/** Get the step flow for a medium category. Falls back to default. */
export function getFlowForCategory(category: MediumCategory | null): CanvasStepDefinition[] {
  if (!category) return DEFAULT_FLOW;
  return FLOW_REGISTRY[category] ?? DEFAULT_FLOW;
}

/** Get the first step ID for a flow */
export function getFirstStepId(category: MediumCategory | null): string {
  return getFlowForCategory(category)[0].id;
}

/** Get the next step ID after the current one, or null if last */
export function getNextStepId(category: MediumCategory | null, currentStepId: string): string | null {
  const steps = getFlowForCategory(category);
  const idx = steps.findIndex((s) => s.id === currentStepId);
  if (idx < 0 || idx >= steps.length - 1) return null;
  return steps[idx + 1].id;
}

/** Get step definition by ID within a flow */
export function getStepDefinition(category: MediumCategory | null, stepId: string): CanvasStepDefinition | null {
  return getFlowForCategory(category).find((s) => s.id === stepId) ?? null;
}

/** All valid step IDs across all flows (for type safety) */
export const ALL_STEP_IDS = [
  'context', 'variants', 'script', 'medium', 'video-builder', 'seo', 'planner',
] as const;

export type CanvasStepId = (typeof ALL_STEP_IDS)[number];
