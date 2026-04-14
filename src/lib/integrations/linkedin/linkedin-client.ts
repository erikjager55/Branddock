// =============================================================
// LinkedIn Direct Client — Community Management API v2
//
// Direct posting to LinkedIn personal profiles and company pages.
// Replaces the Ayrshare middleman for LinkedIn publishing.
//
// API docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
// =============================================================

const LINKEDIN_API = 'https://api.linkedin.com';

export interface LinkedInPostContent {
  text: string;
  mediaUrl?: string;
  articleUrl?: string;
  articleTitle?: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
}

export interface LinkedInPostResult {
  postId: string;
  postUrl: string;
}

export interface LinkedInProfile {
  profileId: string;
  profileName: string;
  profileType: 'personal' | 'page';
  avatarUrl?: string;
  vanityName?: string;
}

/**
 * List available LinkedIn profiles and organization pages for the authenticated user.
 */
export async function listLinkedInProfiles(accessToken: string, userId: string): Promise<LinkedInProfile[]> {
  const profiles: LinkedInProfile[] = [];

  // 1. Personal profile (always available)
  const userInfo = await fetchUserProfile(accessToken);
  profiles.push({
    profileId: userId,
    profileName: userInfo.name ?? 'Personal Profile',
    profileType: 'personal',
    avatarUrl: userInfo.picture,
    vanityName: userInfo.vanityName,
  });

  // 2. Organization pages the user administers
  try {
    const orgs = await fetchOrganizationPages(accessToken);
    profiles.push(...orgs);
  } catch (err) {
    // w_organization_social scope may not be granted — that's OK, user just can't post as org
    console.warn('[linkedin] Could not fetch organization pages:', err instanceof Error ? err.message : err);
  }

  return profiles;
}

/**
 * Publish a post to LinkedIn (personal profile or organization page).
 */
export async function publishToLinkedIn(
  accessToken: string,
  authorUrn: string,
  content: LinkedInPostContent,
): Promise<LinkedInPostResult> {
  // Build the post body per LinkedIn Community Management API v2
  const postBody: Record<string, unknown> = {
    author: authorUrn,
    commentary: content.text,
    visibility: content.visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
  };

  // Image attachment
  if (content.mediaUrl) {
    const imageUrn = await uploadImage(accessToken, authorUrn, content.mediaUrl);
    postBody.content = {
      media: { id: imageUrn, altText: '' },
    };
  }

  // Article (link) attachment
  if (content.articleUrl && !content.mediaUrl) {
    postBody.content = {
      article: {
        source: content.articleUrl,
        title: content.articleTitle ?? '',
      },
    };
  }

  const res = await fetch(`${LINKEDIN_API}/rest/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LinkedIn post failed (${res.status}): ${body.slice(0, 300)}`);
  }

  // LinkedIn returns the post URN in the x-restli-id header
  const postUrn = res.headers.get('x-restli-id') ?? '';
  const postId = postUrn.replace('urn:li:share:', '').replace('urn:li:ugcPost:', '');

  // Build the public URL
  const authorId = authorUrn.split(':').pop() ?? '';
  const isOrg = authorUrn.includes('organization');
  const postUrl = isOrg
    ? `https://www.linkedin.com/feed/update/${postUrn}`
    : `https://www.linkedin.com/feed/update/${postUrn}`;

  return { postId: postId || postUrn, postUrl };
}

/**
 * Delete a post from LinkedIn.
 */
export async function deleteLinkedInPost(accessToken: string, postUrn: string): Promise<void> {
  const res = await fetch(`${LINKEDIN_API}/rest/posts/${encodeURIComponent(postUrn)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`LinkedIn delete failed: ${res.status}`);
  }
}

// ─── Internal Helpers ─────────────────────────────────────────

async function fetchUserProfile(accessToken: string): Promise<{
  name?: string;
  picture?: string;
  vanityName?: string;
}> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return {};
  const data = await res.json();
  return {
    name: data.name ?? `${data.given_name ?? ''} ${data.family_name ?? ''}`.trim(),
    picture: data.picture,
    vanityName: data.vanity_name,
  };
}

async function fetchOrganizationPages(accessToken: string): Promise<LinkedInProfile[]> {
  // List organizations where the user has ADMINISTRATOR role
  const res = await fetch(
    `${LINKEDIN_API}/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(id,localizedName,logoV2(original~:playableStreams))))`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LinkedIn org list failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const elements = data.elements ?? [];

  return elements.map((el: Record<string, unknown>) => {
    const org = el['organization~'] as Record<string, unknown> | undefined;
    const orgId = String(org?.id ?? '');
    const orgName = String(org?.localizedName ?? 'Organization');

    return {
      profileId: orgId,
      profileName: orgName,
      profileType: 'page' as const,
      avatarUrl: undefined, // Logo URL extraction is complex, skip for now
    };
  });
}

/**
 * Upload an image to LinkedIn for attachment to a post.
 * Uses the Images API: initialize upload → PUT binary → get image URN.
 */
async function uploadImage(accessToken: string, ownerUrn: string, imageUrl: string): Promise<string> {
  // Step 1: Initialize upload
  const initRes = await fetch(`${LINKEDIN_API}/rest/images?action=initializeUpload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: ownerUrn,
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!initRes.ok) {
    const body = await initRes.text().catch(() => '');
    throw new Error(`LinkedIn image init failed (${initRes.status}): ${body.slice(0, 200)}`);
  }

  const initData = await initRes.json();
  const uploadUrl = initData.value?.uploadUrl;
  const imageUrn = initData.value?.image;

  if (!uploadUrl || !imageUrn) {
    throw new Error('LinkedIn image init returned no upload URL');
  }

  // Step 2: Download the image
  const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
  if (!imageRes.ok) throw new Error(`Failed to download image: ${imageRes.status}`);
  const imageBuffer = await imageRes.arrayBuffer();

  // Step 3: Upload binary to LinkedIn
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: imageBuffer,
    signal: AbortSignal.timeout(60_000),
  });

  if (!putRes.ok) {
    throw new Error(`LinkedIn image upload failed: ${putRes.status}`);
  }

  return imageUrn;
}
