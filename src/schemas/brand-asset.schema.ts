/**
 * Brand Asset Schema
 * 
 * Zod validation schema for brand assets.
 * Provides runtime validation and type safety.
 * 
 * IMPORTANT: Run `npm install zod` before using this schema!
 */

import { z } from 'zod';

// Research Method Type Schema
export const ResearchMethodTypeSchema = z.enum([
  'workshop',
  'interviews',
  'questionnaire',
  'ai-exploration',
]);

// Research Method Schema
export const ResearchMethodSchema = z.object({
  type: ResearchMethodTypeSchema,
  status: z.enum(['not-started', 'in-progress', 'completed']),
  completedAt: z.string().optional(),
  insights: z.array(z.string()).optional(),
});

// Brand Asset Status Schema
export const BrandAssetStatusSchema = z.enum([
  'not-started',
  'in-progress', 
  'completed',
  'approved',
]);

// Brand Asset Schema
export const BrandAssetSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Asset name is required'),
  description: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  status: BrandAssetStatusSchema.default('not-started'),
  researchMethods: z.array(ResearchMethodSchema).default([]),
  lastUpdated: z.string().optional(),
  createdAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

// Array of Brand Assets Schema
export const BrandAssetsArraySchema = z.array(BrandAssetSchema);

// Type inference (auto-generate TypeScript types from schema)
export type BrandAssetSchemaType = z.infer<typeof BrandAssetSchema>;
export type ResearchMethodSchemaType = z.infer<typeof ResearchMethodSchema>;
export type ResearchMethodTypeSchemaType = z.infer<typeof ResearchMethodTypeSchema>;
export type BrandAssetStatusSchemaType = z.infer<typeof BrandAssetStatusSchema>;

/**
 * Validate brand asset data
 */
export function validateBrandAsset(data: unknown) {
  return BrandAssetSchema.safeParse(data);
}

/**
 * Validate array of brand assets
 */
export function validateBrandAssets(data: unknown) {
  return BrandAssetsArraySchema.safeParse(data);
}

/**
 * Parse brand asset data (throws on error)
 */
export function parseBrandAsset(data: unknown) {
  return BrandAssetSchema.parse(data);
}

/**
 * Parse array of brand assets (throws on error)
 */
export function parseBrandAssets(data: unknown) {
  return BrandAssetsArraySchema.parse(data);
}
