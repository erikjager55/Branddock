'use client';

// =============================================================
// /oauth/login — login-stap van de OAuth-connect-flow (MCP).
//
// De Better Auth mcp-plugin redirect een niet-ingelogde gebruiker vanaf
// /api/auth/mcp/authorize hierheen, mét de volledige authorize-query
// (client_id, redirect_uri, code_challenge, state, …) als search-params.
// Na een geslaagde login (of bij een al bestaande sessie) sturen we de
// browser terug naar het authorize-endpoint met exact diezelfde query —
// de plugin ziet dan een sessie en redirect met een authorization-code
// naar de connector-callback (of naar /oauth/consent bij prompt=consent).
// =============================================================

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { authClient, signIn } from '@/lib/auth-client';

/**
 * Reconstrueert de authorize-URL uit de doorgekregen query-params.
 * Zonder client_id is deze pagina niet via de plugin bereikt — dan is de
 * app-root de enige zinnige bestemming na login.
 */
function buildContinueUrl(params: URLSearchParams): string {
  if (!params.get('client_id')) return '/';
  return `/api/auth/mcp/authorize?${params.toString()}`;
}

function OAuthLoginForm() {
  const params = useSearchParams();
  const continueUrl = buildContinueUrl(params);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // true zolang we checken of er al een sessie is (al-ingelogd → direct door).
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authClient
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.session) {
          // Al ingelogd: meteen terug de authorize-flow in.
          window.location.replace(continueUrl);
        } else {
          setCheckingSession(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [continueUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // redirect: 'manual' is essentieel: de mcp-plugin heeft een after-hook die
    // — zodra de sign-in-response een sessie-cookie zet én de oidc_login_prompt-
    // cookie bestaat — de response kaapt naar een 302 richting de connector-
    // callback. Zonder 'manual' volgt fetch die cross-origin redirect op de
    // achtergrond (levert daar al een code af, buiten de echte navigatie om)
    // en faalt vervolgens op CORS → schijn-fout bij een geslaagde login.
    // Met 'manual' wordt de Set-Cookie gewoon verwerkt maar volgt er niets;
    // succes bepalen we daarom via getSession, niet via de response zelf.
    const { error: authError } = await signIn.email({
      email,
      password,
      fetchOptions: { redirect: 'manual' },
    });

    const { data } = await authClient.getSession();
    if (data?.session) {
      window.location.replace(continueUrl);
      return;
    }

    setError(authError?.message || 'Sign in failed. Check your email and password.');
    setLoading(false);
  };

  return (
    <div data-testid="oauth-login-page" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/Logo_Branddock_RGB.png"
            alt="Branddock"
            width={220}
            height={39}
            priority
            className="mx-auto"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {checkingSession ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking your session…
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Sign in to connect
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                An external application wants to access your Branddock workspace.
                Sign in to continue the authorization.
              </p>

              {error && (
                <div
                  data-testid="oauth-login-error"
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      data-testid="oauth-login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      data-testid="oauth-login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      required
                      autoComplete="current-password"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>
                </div>
                <button
                  data-testid="oauth-login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {loading ? 'Signing in…' : 'Sign in and continue'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** /oauth/login — useSearchParams vereist een Suspense-boundary in de App Router. */
export default function OAuthLoginPage() {
  return (
    <Suspense fallback={null}>
      <OAuthLoginForm />
    </Suspense>
  );
}
