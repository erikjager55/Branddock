// =============================================================
// GET /api/auth/providers — List enabled OAuth providers
//
// Returns which social login providers are configured.
// Used by SocialLoginButtons to conditionally show buttons.
// No auth required (shown on login page).
// =============================================================

import { NextResponse } from 'next/server';
import { getEnabledProviders } from '@/lib/auth/oauth-config';

export async function GET() {
  const providers = getEnabledProviders();
  return NextResponse.json({ providers });
}
