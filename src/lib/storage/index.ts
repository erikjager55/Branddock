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
    if (isR2Configured()) {
      _provider = new R2StorageProvider();
    } else if (process.env.NODE_ENV === 'production') {
      // Serverless (Vercel) heeft geen persistente fs → LocalStorageProvider
      // schrijft naar ephemeral/read-only disk. Fail-closed in prod zodat
      // uploads luid falen i.p.v. stil te verdwijnen.
      throw new Error(
        'R2 object storage is niet geconfigureerd in productie. Zet R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.',
      );
    } else {
      _provider = new LocalStorageProvider();
    }
  }
  return _provider;
}
