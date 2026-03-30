import sharp from 'sharp';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_DIMENSION = 512;
const MAX_REFERENCE_IMAGES = 20;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ImageValidationResult {
  isValid: boolean;
  width: number;
  height: number;
  mimeType: string;
  fileSize: number;
  error?: string;
}

/** Validate an image buffer for consistent model training requirements */
export async function validateTrainingImage(
  buffer: Buffer,
  declaredMimeType?: string
): Promise<ImageValidationResult> {
  const fileSize = buffer.length;

  if (fileSize > MAX_FILE_SIZE) {
    return {
      isValid: false,
      width: 0,
      height: 0,
      mimeType: declaredMimeType || 'unknown',
      fileSize,
      error: `File size ${(fileSize / 1024 / 1024).toFixed(1)}MB exceeds maximum of 10MB`,
    };
  }

  try {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      return {
        isValid: false,
        width: 0,
        height: 0,
        mimeType: declaredMimeType || 'unknown',
        fileSize,
        error: 'Could not read image dimensions',
      };
    }

    const mimeType = `image/${metadata.format === 'jpg' ? 'jpeg' : metadata.format}`;

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return {
        isValid: false,
        width: metadata.width,
        height: metadata.height,
        mimeType,
        fileSize,
        error: `File type ${mimeType} is not supported. Use JPEG, PNG, or WebP.`,
      };
    }

    if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
      return {
        isValid: false,
        width: metadata.width,
        height: metadata.height,
        mimeType,
        fileSize,
        error: `Image must be at least ${MIN_DIMENSION}x${MIN_DIMENSION}px. Got ${metadata.width}x${metadata.height}px.`,
      };
    }

    return {
      isValid: true,
      width: metadata.width,
      height: metadata.height,
      mimeType,
      fileSize,
    };
  } catch {
    return {
      isValid: false,
      width: 0,
      height: 0,
      mimeType: declaredMimeType || 'unknown',
      fileSize,
      error: 'Failed to read image file. The file may be corrupt.',
    };
  }
}

/** Strip EXIF metadata from an image to prevent leaking location/camera data */
export async function stripExifData(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // Auto-rotate based on EXIF orientation before stripping
    .toBuffer();
}

export { MAX_FILE_SIZE, MIN_DIMENSION, MAX_REFERENCE_IMAGES, ALLOWED_MIME_TYPES };
