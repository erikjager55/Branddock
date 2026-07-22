'use client';

// Invite-accept landingspagina. Dit was de ontbrekende helft van de
// uitnodigingsflow: de invite-mail linkt sinds dag één naar
// /invite/accept?token=..., maar deze pagina bestond nooit — elke uitnodiging
// eindigde dus op een 404. Exact dezelfde klasse als de reset-password-bug
// (zie het comment in ../../reset-password/page.tsx): mail-link verzonnen,
// landingspagina nooit gebouwd.
//
// De accept-API is POST-only en sessie-gebonden. Deze pagina vertaalt die
// takken naar een scherm en regelt zelf het aanmelden van genodigden zonder
// account — bewuste keuze (Erik, 2026-07-22) om AuthGate/App.tsx, het pad waar
// iedereen doorheen moet, niet te raken.
//
// Taal komt uit `?lang` (meegegeven door de mail) en NIET uit i18next: de
// ontvanger heeft nog geen account en dus geen UI-taalvoorkeur, terwijl de
// `branddock-ui-locale`-cookie van een toevallig ingelogde andere gebruiker
// juist de verkeerde taal zou opleveren. De I18nProvider omhult deze pagina
// wél (root-layout) — we gebruiken hem hier bewust niet.

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Lock, User } from 'lucide-react';
import { authClient, signIn, signOut, signUp } from '@/lib/auth-client';
import { trackBrowserEvent } from '@/lib/analytics/posthog-browser';

type Lang = 'nl' | 'en';

const STRINGS = {
  en: {
    checking: 'Checking your invitation…',
    invitedTo: (target: string) => `You're invited to ${target}`,
    roles: { owner: 'owner', admin: 'admin', member: 'member', viewer: 'viewer' },
    asRole: (role: string) => `You'll join as ${role}.`,
    allSet: 'You can get started right away.',
    createAccount: 'Create your account to accept.',
    haveAccount: 'Already have a Branddock account? Sign in',
    newAccount: 'No account yet? Create one',
    signInTitle: 'Sign in to accept.',
    yourName: 'Your name',
    email: 'Email',
    emailLocked: 'This invitation is tied to this address.',
    password: 'Password',
    submitSignUp: 'Create account & accept',
    submitSignIn: 'Sign in & accept',
    working: 'One moment…',
    joined: (target: string) => `You've joined ${target}`,
    already: (target: string) => `You're already part of ${target}`,
    goToApp: 'Go to Branddock',
    pwTooShort: 'Password must be at least 8 characters.',
    signUpFailed: 'We could not create your account. Please try again.',
    signUpExists: 'You already have an account with this address — sign in below to accept.',
    signInFailed: 'Signing in failed. Check your password and try again.',
    tooManyAttempts: 'Too many attempts. Please wait a minute and try again.',
    errInvalid: 'This invitation link is not valid.',
    errInvalidHint: 'Ask your teammate to send a new invitation.',
    errExpired: 'This invitation has expired.',
    errExpiredHint: 'Invitations are valid for 7 days. Ask for a new one.',
    errUsed: 'This invitation has already been used.',
    errUsedHint: 'If this was you, just sign in.',
    errCancelled: 'This invitation was withdrawn.',
    errCancelledHint: 'Ask your teammate to send a new one.',
    retryHint: 'Almost there — press the button once more to accept.',
    errWrongEmail: 'This invitation was sent to a different email address.',
    errWrongEmailHint: 'Sign out and try again with the invited address.',
    errWorkspaceGone: 'The workspace for this invitation no longer exists.',
    errWorkspaceGoneHint: 'Ask your teammate for a new invitation.',
    errGeneric: 'Something went wrong while accepting this invitation.',
    signOutRetry: 'Sign out and try again',
    signOutFailed: 'Signing out failed. Please clear your cookies and retry.',
    backToSignIn: 'Go to sign in',
  },
  nl: {
    checking: 'Je uitnodiging wordt gecontroleerd…',
    invitedTo: (target: string) => `Je bent uitgenodigd voor ${target}`,
    roles: { owner: 'eigenaar', admin: 'beheerder', member: 'lid', viewer: 'kijker' },
    asRole: (role: string) => `Je doet mee als ${role}.`,
    allSet: 'Je kunt meteen aan de slag.',
    createAccount: 'Maak je account om te accepteren.',
    haveAccount: 'Heb je al een Branddock-account? Inloggen',
    newAccount: 'Nog geen account? Maak er een aan',
    signInTitle: 'Log in om te accepteren.',
    yourName: 'Je naam',
    email: 'E-mailadres',
    emailLocked: 'Deze uitnodiging hoort bij dit adres.',
    password: 'Wachtwoord',
    submitSignUp: 'Account maken & accepteren',
    submitSignIn: 'Inloggen & accepteren',
    working: 'Momentje…',
    joined: (target: string) => `Je hoort nu bij ${target}`,
    already: (target: string) => `Je hoort al bij ${target}`,
    goToApp: 'Naar Branddock',
    pwTooShort: 'Het wachtwoord moet minstens 8 tekens zijn.',
    signUpFailed: 'We konden je account niet aanmaken. Probeer het opnieuw.',
    signUpExists: 'Je hebt al een account met dit adres — log hieronder in om te accepteren.',
    signInFailed: 'Inloggen is mislukt. Controleer je wachtwoord.',
    tooManyAttempts: 'Te veel pogingen. Wacht een minuut en probeer het opnieuw.',
    errInvalid: 'Deze uitnodigingslink is niet geldig.',
    errInvalidHint: 'Vraag je collega om een nieuwe uitnodiging te sturen.',
    errExpired: 'Deze uitnodiging is verlopen.',
    errExpiredHint: 'Uitnodigingen zijn 7 dagen geldig. Vraag om een nieuwe.',
    errUsed: 'Deze uitnodiging is al gebruikt.',
    errUsedHint: 'Was jij dat? Dan kun je gewoon inloggen.',
    errCancelled: 'Deze uitnodiging is ingetrokken.',
    errCancelledHint: 'Vraag je collega om een nieuwe te sturen.',
    retryHint: 'Bijna klaar — klik nog één keer op de knop om te accepteren.',
    errWrongEmail: 'Deze uitnodiging is naar een ander e-mailadres gestuurd.',
    errWrongEmailHint: 'Log uit en probeer het opnieuw met het uitgenodigde adres.',
    errWorkspaceGone: 'De workspace uit deze uitnodiging bestaat niet meer.',
    errWorkspaceGoneHint: 'Vraag je collega om een nieuwe uitnodiging.',
    errGeneric: 'Er ging iets mis bij het accepteren van deze uitnodiging.',
    signOutRetry: 'Uitloggen en opnieuw proberen',
    signOutFailed: 'Uitloggen is mislukt. Wis je cookies en probeer het opnieuw.',
    backToSignIn: 'Naar inloggen',
  },
} as const;

type Strings = (typeof STRINGS)[Lang];

// Het token gaat uit de adresbalk (zie het effect hieronder) maar moet een
// reload overleven: zonder deze stash liep "uitloggen en opnieuw proberen" —
// de enige uitweg uit het verkeerd-adres-scherm — dood op "link niet geldig",
// en gaf een simpele F5 hetzelfde valse alarm. sessionStorage blijft
// same-origin en sterft met het tabblad; de URL doet dat allebei niet.
//
// `lang` blijft bewust WÉL in de URL staan: die wordt server-side gerenderd,
// dus hem uit storage lezen zou server ('en') en client ('nl') laten
// verschillen — een hydration-mismatch op precies de reload-tak.
const TOKEN_KEY = 'branddock-invite-token';
const JOINED_KEY = 'branddock-invite-joined';

function readStored(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Private mode / quota — fail-soft; de flow werkt dan alleen zonder reload.
  }
}

interface AcceptResponse {
  requiresAuth?: boolean;
  email?: string;
  targetName?: string;
  role?: string;
  alreadyMember?: boolean;
  organizationId?: string;
  error?: string;
  code?: string;
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'needsAuth'; email: string; targetName: string; role: string }
  | { kind: 'done'; targetName: string; already: boolean }
  | { kind: 'error'; title: string; hint: string; offerSignOut?: boolean };

/**
 * Vertaal een niet-OK accept-respons naar een leesbaar scherm. Stuurt op de
 * `code` uit de route — een eerdere versie matchte op de Engelse fouttekst,
 * waardoor elke onbekende 400 als "al gebruikt" werd getoond.
 */
function toErrorPhase(status: number, data: AcceptResponse, s: Strings): Phase {
  switch (data.code) {
    case 'NOT_FOUND':
      return { kind: 'error', title: s.errInvalid, hint: s.errInvalidHint };
    case 'EXPIRED':
      return { kind: 'error', title: s.errExpired, hint: s.errExpiredHint };
    case 'NOT_PENDING':
      return { kind: 'error', title: s.errUsed, hint: s.errUsedHint };
    case 'CANCELLED':
      return { kind: 'error', title: s.errCancelled, hint: s.errCancelledHint };
    case 'WORKSPACE_GONE':
      return { kind: 'error', title: s.errWorkspaceGone, hint: s.errWorkspaceGoneHint };
    case 'EMAIL_MISMATCH':
      return {
        kind: 'error',
        title: s.errWrongEmail,
        hint: s.errWrongEmailHint,
        offerSignOut: true,
      };
  }
  if (status === 404) return { kind: 'error', title: s.errInvalid, hint: s.errInvalidHint };
  if (status === 403) {
    return { kind: 'error', title: s.errWrongEmail, hint: s.errWrongEmailHint, offerSignOut: true };
  }
  return { kind: 'error', title: s.errGeneric, hint: s.errInvalidHint };
}

/** Better Auth-fouten naar iets dat een genodigde begrijpt. */
function toAuthMessage(
  error: { message?: string; code?: string; status?: number },
  mode: 'signUp' | 'signIn',
  s: Strings,
): { message: string; switchToSignIn: boolean } {
  const raw = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  if (mode === 'signUp' && /already\s*exist|user_already/.test(raw)) {
    return { message: s.signUpExists, switchToSignIn: true };
  }
  if (error.status === 429 || /too many|rate limit/.test(raw)) {
    return { message: s.tooManyAttempts, switchToSignIn: false };
  }
  return {
    message: mode === 'signUp' ? s.signUpFailed : s.signInFailed,
    switchToSignIn: false,
  };
}

function ResultCard({
  icon,
  title,
  hint,
  children,
  testId,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <div className="text-center py-4" data-testid={testId}>
      {icon}
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-6">{hint}</p>
      {children}
    </div>
  );
}

function InviteAccept() {
  const params = useSearchParams();
  // Token en taal één keer vastleggen: het token wordt hieronder uit de
  // adresbalk gestript, waarna `params` hem niet meer bevat. Bij een reload
  // komt hij uit sessionStorage.
  const [token] = useState(() => params.get('token') ?? readStored(TOKEN_KEY));
  const lang: Lang = params.get('lang') === 'nl' ? 'nl' : 'en';
  const s = STRINGS[lang];

  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [mode, setMode] = useState<'signUp' | 'signIn'>('signUp');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const attempted = useRef(false);

  // Het uitnodigingstoken is 7 dagen lang een bearer-credential (het
  // ontgrendelt accountaanmaak op dit e-mailadres). PostHog draait met
  // `capture_pageview: true` en zou `?token=…` als `$current_url` naar een
  // externe store sturen. Dit effect draait als child-effect vóór het
  // parent-effect van PostHogProvider dat de client initialiseert, dus de
  // capture ziet alleen de opgeschoonde URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('token')) return;
    if (token) writeStored(TOKEN_KEY, token);
    // Nieuwe uitnodiging in hetzelfde tabblad: de onthouden naam van een
    // vórige join mag niet blijven hangen.
    writeStored(JOINED_KEY, null);
    // Alléén het token weghalen; `lang` blijft staan (zie comment bij
    // TOKEN_KEY — anders hydration-mismatch na een reload).
    url.searchParams.delete('token');
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, [token]);

  const accept = useCallback(async (): Promise<Phase> => {
    if (!token) return { kind: 'error', title: s.errInvalid, hint: s.errInvalidHint };
    try {
      const res = await fetch('/api/organization/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data: AcceptResponse = await res.json().catch(() => ({}));

      if (res.status === 401 && data.requiresAuth) {
        return {
          kind: 'needsAuth',
          email: data.email ?? '',
          targetName: data.targetName ?? '',
          role: data.role ?? 'member',
        };
      }
      if (!res.ok) return toErrorPhase(res.status, data, s);

      // Zonder dit landt een net-aangemelde genodigde in zijn eigen (lege)
      // auto-org en lijkt de uitnodiging mislukt. setActive retourneert
      // `{ error }` i.p.v. te gooien, dus expliciet loggen.
      if (data.organizationId) {
        const { error } = await authClient.organization.setActive({
          organizationId: data.organizationId,
        });
        if (error) {
          console.warn('[invite/accept] setActive mislukt', { message: error.message });
        }
      }
      return {
        kind: 'done',
        targetName: data.targetName ?? '',
        already: Boolean(data.alreadyMember),
      };
    } catch {
      return { kind: 'error', title: s.errGeneric, hint: s.errInvalidHint };
    }
  }, [token, s]);

  // Een verbruikt token hoort uit storage: anders POST een Back-navigatie
  // vanuit de app opnieuw en krijgt een net toegetreden gebruiker "al
  // gebruikt" te zien. De onthouden naam laat dat scherm kloppend blijven.
  const applyPhase = useCallback((next: Phase) => {
    if (next.kind === 'done') {
      writeStored(TOKEN_KEY, null);
      // Lege naam niet onthouden: dat zou "Je hoort al bij " opleveren.
      if (next.targetName) writeStored(JOINED_KEY, next.targetName);
    }
    setPhase(next);
  }, []);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    // Via dezelfde async-weg als `accept()`: een synchrone setState hier zou
    // de eerste render client-side anders maken dan server-side (de
    // sessionStorage bestaat op de server niet) — precies de mismatch die we
    // bij `lang` net hebben weggenomen.
    const joined = !token ? readStored(JOINED_KEY) : null;
    const run: Promise<Phase> =
      joined !== null
        ? Promise.resolve({ kind: 'done', targetName: joined, already: true })
        : accept();
    void run.then(applyPhase);
  }, [accept, applyPhase, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase.kind !== 'needsAuth' || busy) return;
    if (password.length < 8) {
      setFormError(s.pwTooShort);
      return;
    }
    setBusy(true);
    setFormError(null);

    // try/finally: een afgebroken netwerkcall liet `busy` anders voorgoed op
    // true staan, waarmee de knop permanent uitgeschakeld raakte.
    try {
      const { error } =
        mode === 'signUp'
          ? await signUp.email({ email: phase.email, password, name })
          : await signIn.email({ email: phase.email, password });

      if (error) {
        const mapped = toAuthMessage(error, mode, s);
        setFormError(mapped.message);
        if (mapped.switchToSignIn) setMode('signIn');
        return;
      }

      // Funnel-event (KPI Fase 0): zonder dit telt een via-uitnodiging
      // aangemelde gebruiker niet mee in de aanmeld-instroom.
      void trackBrowserEvent(mode === 'signUp' ? 'signup_completed' : 'login_succeeded', {
        method: 'invite',
      }).catch(() => {});

      const next = await accept();
      // Kan opnieuw `needsAuth` zijn als de sessiecookie nog niet zichtbaar
      // is; zonder melding zou de gebruiker een onveranderd formulier zien.
      if (next.kind === 'needsAuth') setFormError(s.retryHint);
      applyPhase(next);
    } catch {
      setFormError(mode === 'signUp' ? s.signUpFailed : s.signInFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);
    // signOut resolvet met `{ error }` i.p.v. te gooien — alleen een catch
    // zou de fout dus missen en tóch herladen.
    try {
      const { error } = await signOut();
      if (error) {
        setFormError(s.signOutFailed);
        setBusy(false);
        return;
      }
    } catch {
      setFormError(s.signOutFailed);
      setBusy(false);
      return;
    }
    // Navigeer expliciet mét token in plaats van reload(): die leunde op de
    // sessionStorage-stash, en juist in private mode faalt die stil — dan
    // logde deze knop de gebruiker uit én gooide hij de uitnodiging weg.
    const target = token
      ? `/invite/accept?token=${encodeURIComponent(token)}&lang=${lang}`
      : `/invite/accept?lang=${lang}`;
    window.location.replace(target);
  };

  const ctaClass =
    'inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90';
  const inputClass =
    'w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

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
          {phase.kind === 'loading' ? (
            <p className="text-sm text-gray-500 text-center py-4" role="status" aria-live="polite">
              {s.checking}
            </p>
          ) : phase.kind === 'error' ? (
            <ResultCard
              testId="invite-error"
              icon={
                <AlertCircle
                  aria-hidden="true"
                  className="w-10 h-10 text-amber-500 mx-auto mb-3"
                />
              }
              title={phase.title}
              hint={phase.hint}
            >
              {phase.offerSignOut ? (
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={busy}
                  aria-busy={busy}
                  className={`${ctaClass} disabled:opacity-50`}
                >
                  {busy ? s.working : s.signOutRetry}
                </button>
              ) : (
                <Link href="/" className={ctaClass}>
                  {s.backToSignIn}
                </Link>
              )}
              {formError ? (
                <p role="alert" className="mt-4 text-sm text-red-700">
                  {formError}
                </p>
              ) : null}
            </ResultCard>
          ) : phase.kind === 'done' ? (
            <ResultCard
              testId="invite-accepted"
              icon={
                <CheckCircle aria-hidden="true" className="w-10 h-10 text-primary mx-auto mb-3" />
              }
              title={phase.already ? s.already(phase.targetName) : s.joined(phase.targetName)}
              hint={s.allSet}
            >
              <Link href="/" className={ctaClass}>
                {s.goToApp}
              </Link>
            </ResultCard>
          ) : (
            <form onSubmit={handleSubmit} data-testid="invite-auth-form">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {s.invitedTo(phase.targetName)}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {s.asRole(s.roles[phase.role as keyof Strings['roles']] ?? phase.role)}{' '}
                {mode === 'signUp' ? s.createAccount : s.signInTitle}
              </p>

              {formError ? (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  <AlertCircle aria-hidden="true" className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              ) : null}

              <label className="block mb-4">
                <span className="block text-sm font-medium text-gray-700 mb-1">{s.email}</span>
                <input
                  type="email"
                  value={phase.email}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
                <span className="block text-xs text-gray-500 mt-1">{s.emailLocked}</span>
              </label>

              {mode === 'signUp' ? (
                <label className="block mb-4">
                  <span className="block text-sm font-medium text-gray-700 mb-1">{s.yourName}</span>
                  <div className="relative">
                    <User
                      aria-hidden="true"
                      className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                    />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                      className={inputClass}
                    />
                  </div>
                </label>
              ) : null}

              <label className="block mb-6">
                <span className="block text-sm font-medium text-gray-700 mb-1">{s.password}</span>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                    required
                    minLength={8}
                    className={inputClass}
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={busy}
                aria-busy={busy}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {busy ? s.working : mode === 'signUp' ? s.submitSignUp : s.submitSignIn}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signUp' ? 'signIn' : 'signUp');
                  setFormError(null);
                }}
                className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
              >
                {mode === 'signUp' ? s.haveAccount : s.newAccount}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  // useSearchParams vereist een Suspense-boundary in de App Router.
  return (
    <Suspense fallback={null}>
      <InviteAccept />
    </Suspense>
  );
}
