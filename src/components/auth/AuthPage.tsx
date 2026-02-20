'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Mail, Lock, User, LogIn, UserPlus, Loader2, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { signIn, signUp, authClient } from '@/lib/auth-client';
import { SocialLoginButtons } from './SocialLoginButtons';
import { AuthDivider } from './AuthDivider';

type AuthView = 'login' | 'register' | 'forgot-password';

export function AuthPage() {
  const [activeView, setActiveView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await signIn.email({
      email,
      password,
    });

    if (authError) {
      setError(authError.message || 'Inloggen mislukt');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await signUp.email({
      email,
      password,
      name,
    });

    if (authError) {
      setError(authError.message || 'Registratie mislukt');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Better Auth exposes requestPasswordReset via Proxy (path: /request-password-reset)
      const { error: resetError } = await (authClient as unknown as {
        requestPasswordReset: (opts: { email: string; redirectTo: string }) => Promise<{ error: { message?: string } | null }>;
      }).requestPasswordReset({
        email,
        redirectTo: '/reset-password',
      });

      if (resetError) {
        const msg = resetError.message || '';
        if (msg.includes("isn't enabled")) {
          setError('Password reset is not yet configured. Please contact support.');
        } else {
          setError(msg || 'Something went wrong. Please try again.');
        }
      } else {
        setResetSent(true);
      }
    } catch {
      // Even on network error, show success to not leak info
      setResetSent(true);
    }

    setLoading(false);
  };

  const showForgotPassword = () => {
    setActiveView('forgot-password');
    setError(null);
    setResetSent(false);
  };

  const backToLogin = () => {
    setActiveView('login');
    setError(null);
    setResetSent(false);
  };

  return (
    <div data-testid="auth-page" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
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

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">

          {/* Forgot Password View */}
          {activeView === 'forgot-password' ? (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Reset password</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {resetSent ? (
                <div data-testid="reset-sent" className="text-center py-4">
                  <CheckCircle className="w-10 h-10 text-teal-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-700">
                    If an account exists with this email, you&apos;ll receive a reset link.
                  </p>
                  <button
                    type="button"
                    onClick={backToLogin}
                    className="mt-4 text-sm text-teal-600 hover:text-teal-700 hover:underline font-medium"
                  >
                    Back to login
                  </button>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          data-testid="reset-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="naam@bedrijf.nl"
                          required
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        />
                      </div>
                    </div>
                    <button
                      data-testid="reset-submit"
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={backToLogin}
                    className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to login
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  data-testid="login-tab"
                  onClick={() => { setActiveView('login'); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                    activeView === 'login'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Inloggen
                </button>
                <button
                  data-testid="register-tab"
                  onClick={() => { setActiveView('register'); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                    activeView === 'register'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Registreren
                </button>
              </div>

              {/* Social Login Buttons */}
              <SocialLoginButtons />
              <AuthDivider />

              {/* Error */}
              {error && (
                <div data-testid="auth-error" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Login Form */}
              {activeView === 'login' && (
                <form data-testid="login-form" onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        data-testid="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="naam@bedrijf.nl"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Wachtwoord</label>
                      <button
                        type="button"
                        onClick={showForgotPassword}
                        className="text-sm text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        data-testid="login-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Voer wachtwoord in"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                  </div>
                  <button
                    data-testid="login-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    {loading ? 'Bezig...' : 'Inloggen'}
                  </button>
                </form>
              )}

              {/* Register Form */}
              {activeView === 'register' && (
                <form data-testid="register-form" onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        data-testid="register-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Je volledige naam"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        data-testid="register-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="naam@bedrijf.nl"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        data-testid="register-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimaal 8 tekens"
                        required
                        minLength={8}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                  </div>
                  <button
                    data-testid="register-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {loading ? 'Bezig...' : 'Account aanmaken'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
