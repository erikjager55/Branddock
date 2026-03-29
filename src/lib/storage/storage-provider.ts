export interface UploadOptions {
  workspaceId: string;
  fileName: string;
  contentType: string;
  generateThumbnail?: boolean;
}

export interface UploadResult {
  url: string;
  fileSize: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export interface StorageProvider {
  upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult>;
  delete(url: string): Promise<void>;
  getUrl(key: string): string;
}
