import sharp from 'sharp';

const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_HEIGHT = 300;

export async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();
}

export async function getImageMetadata(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const meta = await sharp(buffer).metadata();
    if (meta.width && meta.height) {
      return { width: meta.width, height: meta.height };
    }
    return null;
  } catch {
    return null;
  }
}

export async function extractDominantColors(buffer: Buffer, count = 5): Promise<string[]> {
  try {
    const { dominant } = await sharp(buffer).stats();
    // sharp stats gives R, G, B of dominant color
    const hex = `#${[dominant.r, dominant.g, dominant.b].map(c => c.toString(16).padStart(2, '0')).join('')}`;

    // Generate palette by sampling resized image
    const resized = await sharp(buffer).resize(50, 50, { fit: 'cover' }).raw().toBuffer();
    const colors = new Map<string, number>();

    for (let i = 0; i < resized.length; i += 3) {
      const r = Math.round(resized[i] / 32) * 32;
      const g = Math.round(resized[i + 1] / 32) * 32;
      const b = Math.round(resized[i + 2] / 32) * 32;
      const key = `#${[r, g, b].map(c => Math.min(255, c).toString(16).padStart(2, '0')).join('')}`;
      colors.set(key, (colors.get(key) || 0) + 1);
    }

    const sorted = [...colors.entries()].sort((a, b) => b[1] - a[1]);
    const palette = sorted.slice(0, count).map(([c]) => c);

    // Ensure dominant is first
    if (!palette.includes(hex)) {
      palette.unshift(hex);
      palette.pop();
    }

    return palette.slice(0, count);
  } catch {
    return [];
  }
}
