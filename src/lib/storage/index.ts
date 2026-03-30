export type { StorageProvider, UploadOptions, UploadResult } from './storage-provider';
export { LocalStorageProvider } from './local-storage';
export { R2StorageProvider, isR2Configured, uploadToR2, getR2SignedUrl, deleteFromR2, deleteR2Prefix, buildModelStorageKey, buildGenerationStorageKey } from './r2-storage';
export { generateThumbnail, getImageMetadata, extractDominantColors } from './thumbnail-generator';

import { LocalStorageProvider } from './local-storage';
import { R2StorageProvider, isR2Configured } from './r2-storage';
import type { StorageProvider } from './storage-provider';

let _provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!_provider) {
    _provider = isR2Configured()
      ? new R2StorageProvider()
      : new LocalStorageProvider();
  }
  return _provider;
}
