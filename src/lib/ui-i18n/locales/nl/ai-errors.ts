// Dutch UI strings — `ai-errors` namespace. Same key shape as en/.
//
// Copy voor de "model offline"-melding: de inline notice, de toast en de
// twee knoplabels. Stond tot 2026-08-18 hardcoded in het Engels in
// src/lib/ai/ai-error-client.ts, terwijl de rest van de UI Nederlands is.
const ns = {
  unavailable: {
    default: {
      title: 'Het AI-model is nu niet beschikbaar',
      body: 'Genereren lukt op dit moment niet. Dat ligt aan de AI-aanbieder, niet aan jouw invoer. Probeer het zo nog eens.',
      toastDescription: 'Genereren lukt nu niet — probeer het zo nog eens.',
    },
    authentication: {
      title: 'AI-model niet geconfigureerd',
      body: 'Er is iets mis met de AI-configuratie. Neem contact op met je beheerder.',
      toastDescription: 'Probleem met de AI-configuratie — neem contact op met je beheerder.',
    },
    rate_limit: {
      title: 'Te veel aanvragen',
      body: 'Er zijn te veel aanvragen verstuurd. Wacht even en probeer het opnieuw.',
      toastDescription: 'Wacht even en probeer het opnieuw.',
    },
  },
  toastTitle: 'AI-model niet beschikbaar',
  genericError: 'Er ging iets mis. Probeer het opnieuw.',
  retry: 'Opnieuw proberen',
  retrying: 'Even geduld, bezig met opnieuw proberen…',
} as const;

export default ns;
