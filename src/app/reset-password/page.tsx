'use client';

// Reset-password landing page. Dit was de ontbrekende helft van de
// forgot-password-flow: AuthPage stuurt redirectTo:'/reset-password' mee,
// Better Auth verifieert de token op /api/auth/reset-password/:token en
// redirect hierheen met ?token=... (of ?error=INVALID_TOKEN) — maar deze
// pagina bestond nooit, dus elke reset-link eindigde op een 404.

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token');
  const urlError = params.get('error');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const invalidLink = !token || urlError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (resetError) {
        setError(resetError.message || 'Something went wrong. Please request a new reset link.');
      } else {
        setDone(true);
      }
    } catch {
      setError('Something went wrong. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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
          {invalidLink ? (
            <div className="text-center py-4">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                This reset link is invalid or expired
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Request a new link from the sign-in page and try again within an hour.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
              >
                Back to sign in
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-4" data-testid="reset-done">
              <CheckCircle className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Password updated</h2>
              <p className="text-sm text-gray-500 mb-6">
                You can now sign in with your new password.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Choose a new password</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter a new password for your Branddock account.
              </p>

              {error ? (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <label className="block mb-4">
                <span className="block text-sm font-medium text-gray-700 mb-1">New password</span>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              </label>

              <label className="block mb-6">
                <span className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm new password
                </span>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams vereist een Suspense-boundary in de App Router.
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
