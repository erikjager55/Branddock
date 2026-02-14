/**
 * Service for managing unlock state across the application
 */

import { saveToStorage, loadFromStorage } from '../utils/storage';

export interface UnlockedState {
  unlockedAssets: Record<string, boolean>; // assetId -> isUnlocked
  unlockedTools: Record<string, string[]>; // assetId -> toolIds[]
}

const STORAGE_KEY = 'brand-unlock-state';

class UnlockServiceClass {
  private state: UnlockedState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Load from storage or initialize with empty state
    this.state = loadFromStorage<UnlockedState>(STORAGE_KEY, {
      unlockedAssets: {},
      unlockedTools: {}
    });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Check if an asset is unlocked
   */
  isAssetUnlocked(assetId: string): boolean {
    return this.state.unlockedAssets[assetId] === true;
  }

  /**
   * Check if a tool is unlocked for a specific asset
   */
  isToolUnlocked(assetId: string, toolId: string): boolean {
    return this.state.unlockedTools[assetId]?.includes(toolId) || false;
  }

  /**
   * Get all unlocked tools for an asset
   */
  getUnlockedTools(assetId: string): string[] {
    return this.state.unlockedTools[assetId] || [];
  }

  /**
   * Unlock an entire asset
   */
  unlockAsset(assetId: string): void {
    this.state.unlockedAssets[assetId] = true;
    this.persist();
    this.notify();
  }

  /**
   * Unlock specific tools for an asset
   */
  unlockTools(assetId: string, toolIds: string[]): void {
    if (!this.state.unlockedTools[assetId]) {
      this.state.unlockedTools[assetId] = [];
    }
    
    // Add new tools (avoid duplicates)
    toolIds.forEach(toolId => {
      if (!this.state.unlockedTools[assetId].includes(toolId)) {
        this.state.unlockedTools[assetId].push(toolId);
      }
    });

    this.persist();
    this.notify();
  }

  /**
   * Get full unlocked state
   */
  getState(): UnlockedState {
    return { ...this.state };
  }

  /**
   * Persist state to storage
   */
  private persist(): void {
    saveToStorage(STORAGE_KEY, this.state);
  }

  /**
   * Reset all unlocks (for testing)
   */
  reset(): void {
    this.state = {
      unlockedAssets: {},
      unlockedTools: {}
    };
    this.persist();
    this.notify();
  }

  /**
   * Initialize demo state: unlock all brand assets, but lock some research methods
   */
  initializeDemoState(): void {
    // Unlock all brand assets (IDs 1-13)
    const allAssetIds = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
    
    allAssetIds.forEach(assetId => {
      this.state.unlockedAssets[assetId] = true;
    });

    // Unlock research methods per asset
    // For each asset, we'll unlock some methods but lock others
    allAssetIds.forEach(assetId => {
      // All assets get AI Exploration unlocked (free tier)
      const unlockedMethods = ['ai-exploration'];
      
      // Lock Workshop and Interviews for assets 1, 4, 6, 8, 9, 11 (50% of assets)
      // Unlock them for others
      const lockedAssets = ['1', '4', '6', '8', '9', '11'];
      
      if (!lockedAssets.includes(assetId)) {
        unlockedMethods.push('workshop', 'interviews');
      }
      
      // Questionnaire is locked for all assets except 2, 3, 13
      const questionnaireUnlocked = ['2', '3', '13'];
      if (questionnaireUnlocked.includes(assetId)) {
        unlockedMethods.push('questionnaire');
      }
      
      this.state.unlockedTools[assetId] = unlockedMethods;
    });

    this.persist();
    this.notify();
  }
}

export const UnlockService = new UnlockServiceClass();