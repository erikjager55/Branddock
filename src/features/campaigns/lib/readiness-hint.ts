// =============================================================
// Van readiness-tokens naar de zin die de gebruiker leest.
//
// De API stuurt tokens (`ReadinessSignal`), niet tekst — zie de doc-comment
// daar voor het waarom. Hier worden ze vertaald en samengevoegd, op één plek,
// zodat kaart, lijst, kalender en tijdlijn niet uit elkaar kunnen lopen.
//
// Engels is de bron (`DEFAULT_UI_LOCALE = 'en'`): elke sleutel gaat mee met een
// `defaultValue` in het Engels. Dat is niet alleen een vangnet voor ontbrekende
// vertalingen — de namespaces laden lazy, dus vóór de eerste load is de
// defaultValue letterlijk wat er op het scherm staat.
// =============================================================

import type { TFunction } from 'i18next';
import type { ReadinessSignal } from '@/features/campaigns/types/content-library.types';

/** Engelse bronteksten — tevens de fallback zolang de namespace niet geladen is. */
const EN_FALLBACK = {
  'no-content': 'No content generated',
  'variant-unchosen_one': '1 version — choose it',
  'variant-unchosen_other': '{{count}} versions — choose one',
  'pipeline-incomplete': 'Pipeline incomplete',
  'not-reviewed': 'Not reviewed',
} as const;

/**
 * Onbekende approval-statussen tonen hun rauwe waarde. Bewust: een status die
 * we niet kennen verzinnen we niet — dan is de enum-waarde het eerlijkste
 * antwoord voor wie het meldt.
 */
function statusLabel(t: TFunction, status: string): string {
  return t(`readinessHintText.status.${status}`, {
    defaultValue: t('readinessHintText.statusFallback', {
      defaultValue: 'Status: {{status}}',
      status,
    }),
  });
}

/** Eén token → één vertaalde zin. */
export function readinessSignalText(t: TFunction, signal: ReadinessSignal): string {
  switch (signal.token) {
    case 'variant-unchosen':
      return t('readinessHintText.variant-unchosen', {
        count: signal.count,
        defaultValue:
          signal.count === 1
            ? EN_FALLBACK['variant-unchosen_one']
            : EN_FALLBACK['variant-unchosen_other'].replace('{{count}}', String(signal.count)),
      });
    case 'status':
      return statusLabel(t, signal.status);
    default:
      return t(`readinessHintText.${signal.token}`, { defaultValue: EN_FALLBACK[signal.token] });
  }
}

/**
 * De volledige hint zoals hij op een kaart staat, of `null` als er niets mist.
 * Scheidingsteken blijft " · ", gelijk aan wat de server eerder samenstelde.
 */
export function formatReadinessHint(
  t: TFunction,
  signals: ReadinessSignal[] | undefined | null,
): string | null {
  if (!signals || signals.length === 0) return null;
  return signals.map((s) => readinessSignalText(t, s)).join(' · ');
}
