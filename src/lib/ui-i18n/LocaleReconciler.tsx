'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/lib/auth-client';
import { useAppearance } from '@/hooks/use-settings';
import { resolveUiLocale } from './config';
import { writeUiLocaleCookie } from './cookie';

/**
 * After login, reconcile the active UI locale to the per-user
 * `AppearancePreference.language` so the DB pref wins over the cookie/default
 * guess (e.g. a user who set Dutch on device A logging in on device B).
 * One-time, never an ongoing override.
 */
export function LocaleReconciler() {
  const { i18n } = useTranslation();
  const { data: session } = useSession();
  const { data: appearance } = useAppearance({ enabled: !!session });
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current || !session) return;
    const pref = appearance?.appearance?.language;
    if (!pref) return;
    doneRef.current = true;
    const resolved = resolveUiLocale(pref);
    if (resolved !== i18n.language) {
      void i18n.changeLanguage(resolved);
      writeUiLocaleCookie(resolved);
    }
  }, [session, appearance, i18n]);

  return null;
}
