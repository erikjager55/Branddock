/**
 * Research Plan Schema
 * 
 * Zod validation schema for research plans.
 * Provides runtime validation and type safety.
 * 
 * IMPORTANT: Run `npm install zod` before using this schema!
 */

import { z } from 'zod';

// Entry Mode Schema
export const EntryModeSchema = z.enum(['asset', 'bundle', 'questionnaire']);

// Research Plan Schema
export const ResearchPlanSchema = z.object({
  id: z.string(),
  method: z.string(),
  unlockedMethods: z.array(z.string()).default([]),
  unlockedAssets: z.array(z.string()).default([]),
  entryMode: EntryModeSchema,
  rationale: z.record(z.string()).optional(),
  configuration: z.any().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Shared Asset Selection Schema
export const SharedAssetSelectionSchema = z.object({
  interviews: z.array(z.string()).default([]),
  questionnaire: z.array(z.string()).default([]),
  workshop: z.array(z.string()).default([]),
});

// Type inference
export type ResearchPlanSchemaType = z.infer<typeof ResearchPlanSchema>;
export type SharedAssetSelectionSchemaType = z.infer<typeof SharedAssetSelectionSchema>;
export type EntryModeSchemaType = z.infer<typeof EntryModeSchema>;

/**
 * Validate research plan data
 */
export function validateResearchPlan(data: unknown) {
  return ResearchPlanSchema.safeParse(data);
}

/**
 * Validate shared asset selection
 */
export function validateSharedAssetSelection(data: unknown) {
  return SharedAssetSelectionSchema.safeParse(data);
}

/**
 * Parse research plan data (throws on error)
 */
export function parseResearchPlan(data: unknown) {
  return ResearchPlanSchema.parse(data);
}

/**
 * Parse shared asset selection (throws on error)
 */
export function parseSharedAssetSelection(data: unknown) {
  return SharedAssetSelectionSchema.parse(data);
}
