/**
 * LocalStorage Persistence Utility
 * 
 * Provides type-safe localStorage operations with error handling.
 * Automatically handles JSON serialization/deserialization.
 */

import { logger } from './logger';

const STORAGE_VERSION = '1.0';
const STORAGE_PREFIX = 'research_app_';

export const StorageKeys = {
  BRAND_ASSETS: `${STORAGE_PREFIX}brand_assets`,
  PERSONAS: `${STORAGE_PREFIX}personas`,
  RESEARCH_PLAN: `${STORAGE_PREFIX}research_plan`,
  ACTIVE_RESEARCH_PLAN: `${STORAGE_PREFIX}active_research_plan`,
  SHARED_ASSETS: `${STORAGE_PREFIX}shared_assets`,
  UI_STATE: `${STORAGE_PREFIX}ui_state`,
  VERSION: `${STORAGE_PREFIX}version`,
} as const;

/**
 * Save data to localStorage with error handling
 */
export function saveToStorage<T>(key: string, data: T): boolean {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    logger.debug(`Saved to localStorage: ${key}`, { dataSize: serialized.length });
    return true;
  } catch (error) {
    logger.error(`Failed to save to localStorage: ${key}`, error);
    return false;
  }
}

/**
 * Load data from localStorage with error handling
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      logger.debug(`No data found in localStorage: ${key}`);
      return defaultValue;
    }
    
    const parsed = JSON.parse(item) as T;
    logger.debug(`Loaded from localStorage: ${key}`);
    return parsed;
  } catch (error) {
    logger.error(`Failed to load from localStorage: ${key}`, error);
    return defaultValue;
  }
}

/**
 * Remove data from localStorage
 */
export function removeFromStorage(key: string): boolean {
  try {
    localStorage.removeItem(key);
    logger.debug(`Removed from localStorage: ${key}`);
    return true;
  } catch (error) {
    logger.error(`Failed to remove from localStorage: ${key}`, error);
    return false;
  }
}

/**
 * Clear all app data from localStorage
 */
export function clearAllStorage(): boolean {
  try {
    Object.values(StorageKeys).forEach(key => {
      localStorage.removeItem(key);
    });
    logger.info('Cleared all app data from localStorage');
    return true;
  } catch (error) {
    logger.error('Failed to clear localStorage', error);
    return false;
  }
}

/**
 * Check storage version and migrate if needed
 */
export function checkStorageVersion(): boolean {
  const currentVersion = loadFromStorage(StorageKeys.VERSION, '0.0');
  
  if (currentVersion !== STORAGE_VERSION) {
    logger.info(`Storage version mismatch. Current: ${currentVersion}, Expected: ${STORAGE_VERSION}`);
    // TODO: Add migration logic here if needed
    saveToStorage(StorageKeys.VERSION, STORAGE_VERSION);
    return false;
  }
  
  return true;
}

/**
 * Get storage size in bytes
 */
export function getStorageSize(): number {
  let total = 0;
  
  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          total += key.length + value.length;
        }
      }
    }
  } catch (error) {
    logger.error('Failed to calculate storage size', error);
  }
  
  return total;
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    logger.warn('localStorage is not available', error);
    return false;
  }
}