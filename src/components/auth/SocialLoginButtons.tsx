'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { signInWithProvider } from '@/lib/auth-client';
import type { OAuthProviderId, OAuthProviderConfig } from '@/lib/auth/oauth-config';

// ─── SVG Icons for OAuth providers ──────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

// ─── Provider button configs ────────────────────────────────

const PROVIDER_BUTTON_CONFIG: Record<OAuthProviderId, {
  label: string;
  icon: typeof GoogleIcon;
  className: string;
}> = {
  google: {
    label: 'Doorgaan met Google',
    icon: GoogleIcon,
    className: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
  },
  microsoft: {
    label: 'Doorgaan met Microsoft',
    icon: MicrosoftIcon,
    className: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
  },
  apple: {
    label: 'Doorgaan met Apple',
    icon: AppleIcon,
    className: 'bg-gray-900 hover:bg-gray-800 text-white border border-gray-900',
  },
};

// ─── Component ──────────────────────────────────────────────

export function SocialLoginButtons() {
  const [enabledProviders, setEnabledProviders] = useState<OAuthProviderConfig[]>([]);
  const [loadingProvider, setLoadingProvider] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/providers')
      .then((res) => res.json())
      .then((data) => setEnabledProviders(data.providers ?? []))
      .catch(() => {
        // Silently fail — no social buttons shown
      });
  }, []);

  if (enabledProviders.length === 0) {
    return null;
  }

  async function handleSocialLogin(provider: OAuthProviderId) {
    setLoadingProvider(provider);
    setError(null);

    try {
      const result = await signInWithProvider(provider, '/');

      if (result.error) {
        const message = result.error.message ?? 'Inloggen mislukt';
        if (message.includes('popup')) {
          setError('Popup geblokkeerd. Sta popups toe voor deze site.');
        } else if (message.includes('account') && message.includes('exist')) {
          setError('Dit e-mailadres is al gekoppeld aan een ander account. Probeer in te loggen met e-mail.');
        } else {
          setError(message);
        }
      }
    } catch {
      setError('Er ging iets mis. Probeer het opnieuw.');
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {enabledProviders.map((provider) => {
        const config = PROVIDER_BUTTON_CONFIG[provider.id];
        if (!config) return null;

        const Icon = config.icon;
        const isLoading = loadingProvider === provider.id;
        const isDisabled = loadingProvider !== null;

        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleSocialLogin(provider.id)}
            disabled={isDisabled}
            className={`w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${config.className}`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Icon className="w-5 h-5" />
            )}
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
