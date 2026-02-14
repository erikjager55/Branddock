/**
 * Schema Index
 * 
 * Central export point for all Zod validation schemas.
 * 
 * IMPORTANT: Run `npm install zod` before importing from this file!
 */

export * from './brand-asset.schema';
export * from './persona.schema';
export * from './research-plan.schema';

// Re-export common validation functions
export {
  validateBrandAsset,
  validateBrandAssets,
  parseBrandAsset,
  parseBrandAssets,
} from './brand-asset.schema';

export {
  validatePersona,
  validatePersonas,
  parsePersona,
  parsePersonas,
} from './persona.schema';

export {
  validateResearchPlan,
  validateSharedAssetSelection,
  parseResearchPlan,
  parseSharedAssetSelection,
} from './research-plan.schema';
