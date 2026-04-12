// =============================================================
// Ayrshare Client — unified social media publishing
//
// Ayrshare provides a single API for posting to LinkedIn, Instagram,
// Facebook, TikTok, Twitter/X, Pinterest, YouTube, and more.
// Docs: https://docs.ayrshare.com
//
// Two auth modes:
// 1. Agency: AYRSHARE_API_KEY env var = master key.
//    Per-workspace profileKey in PublishChannel.credentials scopes
//    to that workspace's connected social accounts.
// 2. Direct: no env var. profileKey IS the full API key.
// =============================================================

const AYRSHARE_BASE = 'https://app.ayrshare.com/api';

/**
 * Build headers for Ayrshare API calls. In agency mode (env var set),
 * the master key goes in Authorization and the profile key goes in
 * the Profile-Key header. In direct mode, profileKey IS the API key.
 */
function buildHeaders(profileKey: string): Record<string, string> {
  const masterKey = process.env.AYRSHARE_API_KEY;
  if (masterKey) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${masterKey}`,
      'Profile-Key': profileKey,
    };
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${profileKey}`,
  };
}

export interface AyrsharePostBody {
  /** Text content of the post */
  post: string;
  /** Platforms to publish to (e.g. ['linkedin', 'instagram']) */
  platforms: string[];
  /** Image URLs to attach */
  mediaUrls?: string[];
  /** Schedule for future (ISO 8601) */
  scheduleDate?: string;
  /** LinkedIn-specific: title for article posts */
  linkedInOptions?: {
    title?: string;
    visibility?: 'anyone' | 'connectionsOnly';
  };
  /** Instagram-specific */
  instagramOptions?: {
    type?: 'post' | 'story' | 'reel';
  };
  /** TikTok-specific */
  tikTokOptions?: {
    privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  };
}

export interface AyrsharePostResponse {
  id: string;
  postIds: Array<{
    platform: string;
    postId: string;
    postUrl: string;
    status: string;
  }>;
  status: string;
  errors?: Array<{ platform: string; message: string }>;
}

/**
 * Publish a post to one or more social platforms via Ayrshare.
 *
 * @param profileKey — workspace-specific Ayrshare profile key (from PublishChannel.credentials)
 * @param body — post content + platform selection + optional scheduling
 * @returns post IDs and URLs per platform
 */
export async function publishToAyrshare(
  profileKey: string,
  body: AyrsharePostBody,
): Promise<AyrsharePostResponse> {
  const response = await fetch(`${AYRSHARE_BASE}/post`, {
    method: 'POST',
    headers: buildHeaders(profileKey),
    body: JSON.stringify({
      post: body.post,
      platforms: body.platforms,
      mediaUrls: body.mediaUrls,
      scheduleDate: body.scheduleDate,
      linkedInOptions: body.linkedInOptions,
      instagramOptions: body.instagramOptions,
      tikTokOptions: body.tikTokOptions,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Ayrshare API error ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  return response.json();
}

/**
 * Delete a previously published post.
 */
export async function deleteFromAyrshare(
  profileKey: string,
  postId: string,
): Promise<void> {
  const response = await fetch(`${AYRSHARE_BASE}/post/${postId}`, {
    method: 'DELETE',
    headers: buildHeaders(profileKey),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Ayrshare delete failed: ${response.status}`);
  }
}

/**
 * Get analytics for a published post.
 */
export async function getAyrshareAnalytics(
  profileKey: string,
  postId: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${AYRSHARE_BASE}/analytics/post`, {
    method: 'POST',
    headers: buildHeaders(profileKey),
    body: JSON.stringify({ id: postId }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Ayrshare analytics failed: ${response.status}`);
  }

  return response.json();
}
