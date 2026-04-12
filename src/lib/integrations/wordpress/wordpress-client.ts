// =============================================================
// WordPress REST API Client
//
// Publishes blog posts and pages via the WordPress REST API.
// Uses Application Passwords for authentication.
// Docs: https://developer.wordpress.org/rest-api/
//
// Credentials from PublishChannel:
//   credentials: { siteUrl, username, appPassword }
// =============================================================

export interface WordPressPostBody {
  /** Post title */
  title: string;
  /** HTML content */
  content: string;
  /** Excerpt / meta description */
  excerpt?: string;
  /** Post status */
  status?: 'draft' | 'publish' | 'future' | 'pending';
  /** Schedule for future publication (ISO 8601) */
  date?: string;
  /** Featured image media ID (if pre-uploaded) */
  featured_media?: number;
  /** Category IDs */
  categories?: number[];
  /** Tag IDs */
  tags?: number[];
  /** Post format */
  format?: 'standard' | 'aside' | 'image' | 'video' | 'quote' | 'link';
}

export interface WordPressPostResult {
  id: number;
  link: string;
  status: string;
  title: { rendered: string };
  date: string;
}

/**
 * Create a post on a WordPress site via REST API.
 *
 * @param siteUrl — WordPress site URL (e.g. https://yourdomain.com)
 * @param username — WordPress username
 * @param appPassword — Application Password (Settings → Users → Application Passwords)
 * @param body — post content
 */
export async function createWordPressPost(
  siteUrl: string,
  username: string,
  appPassword: string,
  body: WordPressPostBody,
): Promise<WordPressPostResult> {
  const baseUrl = siteUrl.replace(/\/+$/, '');
  const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

  const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`WordPress API error ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  return response.json();
}

/**
 * Upload an image to WordPress media library.
 * Returns the media ID which can be used as featured_media.
 */
export async function uploadWordPressImage(
  siteUrl: string,
  username: string,
  appPassword: string,
  imageUrl: string,
  filename: string,
): Promise<{ id: number; source_url: string }> {
  const baseUrl = siteUrl.replace(/\/+$/, '');
  const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

  // Download the image first
  const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  if (!imageRes.ok) throw new Error(`Failed to download image: ${imageRes.status}`);
  const imageBuffer = await imageRes.arrayBuffer();

  const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg';

  const response = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
    body: imageBuffer,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`WordPress media upload error ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const data = await response.json();
  return { id: data.id, source_url: data.source_url };
}

/**
 * Convert markdown content to WordPress-compatible HTML.
 */
export function contentToWordPressHtml(content: string): string {
  return content
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\n\n/g, '\n\n<!-- wp:paragraph -->\n<p>')
    .replace(/\n(?!<)/g, '<br>\n');
}
