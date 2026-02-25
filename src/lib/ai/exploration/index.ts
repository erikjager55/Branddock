// ─── AI Exploration — Server-side Barrel Export ─────────────

export { getItemTypeConfig, isItemTypeSupported, getSupportedItemTypes } from './item-type-registry';
export type { ItemTypeConfig, DimensionQuestion } from './item-type-registry';
export { personaItemConfig } from './builders/persona-builder';
export { brandAssetItemConfig, BRAND_ASSET_FIELD_MAPPING } from './builders/brand-asset-builder';
