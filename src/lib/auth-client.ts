import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;

/**
 * Social sign-in helper.
 * Redirects the user to the OAuth provider's authorization page.
 *
 * @param provider - The OAuth provider id ('google' | 'microsoft' | 'apple')
 * @param callbackURL - URL to redirect to after successful auth (default: '/')
 */
export function signInWithProvider(
  provider: 'google' | 'microsoft' | 'apple',
  callbackURL = '/',
) {
  return signIn.social({
    provider,
    callbackURL,
  });
}
