export type { StorageProvider, UploadOptions, UploadResult } from './storage-provider';
export { LocalStorageProvider } from './local-storage';
export { generateThumbnail, getImageMetadata, extractDominantColors } from './thumbnail-generator';

import { LocalStorageProvider } from './local-storage';
import type { StorageProvider } from './storage-provider';

let _provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!_provider) {
    _provider = new LocalStorageProvider();
  }
  return _provider;
}
