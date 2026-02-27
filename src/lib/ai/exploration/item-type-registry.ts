// ─── AI Exploration: Item-Type Registry ─────────────────────
// Central registry that maps item types to their specific
// exploration configuration (dimensions, questions, builders).
//
// To add a new item type:
// 1. Create a builder file in ./builders/
// 2. Register it in ITEM_TYPE_CONFIGS below
// ────────────────────────────────────────────────────────────

import { personaItemConfig } from './builders/persona-builder';
import { brandAssetItemConfig } from './builders/brand-asset-builder';

// ─── Types ─────────────────────────────────────────────────

export interface DimensionQuestion {
  key: string;
  title: string;
  icon: string;
  question: string;
}

export interface ItemTypeConfig {
  /** Lock guard type for requireUnlocked() */
  lockType: string;

  /** Fetch the item from the database */
  fetchItem: (
    itemId: string,
    workspaceId: string,
  ) => Promise<Record<string, unknown> | null>;

  /** Get the dimension questions for this item type. Optional item for item-specific dimensions. */
  getDimensions: (item?: Record<string, unknown>) => DimensionQuestion[];

  /** Build a text context summary of the item for LLM prompts */
  buildItemContext: (item: Record<string, unknown>) => string;

  /** Build the intro message for the exploration session */
  buildIntro: (item: Record<string, unknown>) => string;

  /** Generate insights data (report + field suggestions) after completion */
  generateInsights: (
    item: Record<string, unknown>,
    session: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;

  /** Optional: update research method status after completion */
  updateResearchMethod?: (
    itemId: string,
    workspaceId: string,
  ) => Promise<number>;
}

// ─── Registry ──────────────────────────────────────────────

const ITEM_TYPE_CONFIGS: Record<string, ItemTypeConfig> = {
  persona: personaItemConfig,
  brand_asset: brandAssetItemConfig,
  // product: productItemConfig,          // Phase 4
};

/**
 * Get the exploration config for a given item type.
 * Returns null if the item type is not registered.
 */
export function getItemTypeConfig(
  itemType: string,
): ItemTypeConfig | null {
  return ITEM_TYPE_CONFIGS[itemType] ?? null;
}

/**
 * Check if an item type is registered.
 */
export function isItemTypeSupported(itemType: string): boolean {
  return itemType in ITEM_TYPE_CONFIGS;
}

/**
 * Get all registered item types.
 */
export function getSupportedItemTypes(): string[] {
  return Object.keys(ITEM_TYPE_CONFIGS);
}
