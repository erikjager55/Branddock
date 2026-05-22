// =============================================================
// GET /api/ad-accounts/meta/callback
//
// Meta redirects here with ?code=<authcode>&state=<csrf>. We:
//   1. Consume state (CSRF check + look up workspace+user)
//   2. Exchange code → short-lived → long-lived token
//   3. Fetch ad-accounts the user has access to
//   4. Store pending-session (token + accounts) in memory
//   5. 302 user to the UI selection page with ?session=<id>
//
// We do NOT yet write ConnectedAdAccount — that happens after the
// user picks an account via POST /select. Until then, abandonment
// loses the token (good — no orphan rows).
// =============================================================

import { NextResponse } from 'next/server';
import {
  exchangeCodeForShortLivedToken,
  convertToLongLivedToken,
} from '@/lib/ad-providers/meta/oauth';
import { fetchAdAccounts } from '@/lib/ad-providers/meta/client';
import { MetaApiError } from '@/lib/ad-providers/meta/types';
import { MetaConfigError, META_OAUTH_SCOPES } from '@/lib/ad-providers/meta/config';
import { consumeAdOAuthState } from '@/lib/ad-tokens/oauth-state';
import { storePendingAdAccountSession } from '@/lib/ad-tokens/pending-tokens';

const SELECTION_PAGE = '/settings/integrations/ad-accounts/select';

function redirectToError(code: string, detail?: string): NextResponse {
  const url = new URL(SELECTION_PAGE, process.env.BETTER_AUTH_URL ?? 'http://localhost:3000');
  url.searchParams.set('error', code);
  if (detail) url.searchParams.set('detail', detail);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');

    if (oauthError) {
      return redirectToError(oauthError, url.searchParams.get('error_description') ?? undefined);
    }
    if (!code || !state) {
      return redirectToError('missing_params');
    }

    const stateEntry = consumeAdOAuthState(state);
    if (!stateEntry || stateEntry.platform !== 'meta') {
      return redirectToError('invalid_state');
    }

    const shortLived = await exchangeCodeForShortLivedToken(code);
    const longLived = await convertToLongLivedToken(shortLived.access_token);

    const accounts = await fetchAdAccounts(longLived.access_token);
    if (accounts.length === 0) {
      return redirectToError('no_ad_accounts');
    }

    const sessionId = storePendingAdAccountSession({
      workspaceId: stateEntry.workspaceId,
      platform: 'meta',
      userId: stateEntry.userId,
      accessToken: longLived.access_token,
      tokenExpiresAt: Date.now() + longLived.expires_in * 1000,
      scopes: [...META_OAUTH_SCOPES],
      availableAccounts: accounts,
    });

    const target = new URL(SELECTION_PAGE, process.env.BETTER_AUTH_URL ?? 'http://localhost:3000');
    target.searchParams.set('session', sessionId);
    return NextResponse.redirect(target);
  } catch (err) {
    if (err instanceof MetaConfigError) {
      return redirectToError('not_configured', err.message);
    }
    if (err instanceof MetaApiError) {
      return redirectToError('meta_api_error', err.message);
    }
    console.error('[ad-accounts/meta/callback]', err);
    return redirectToError('internal_error');
  }
}
