// Dutch UI strings — `common` namespace.
const common = {
  brand: {
    name: 'Branddock',
  },
  appearance: {
    title: 'Weergave',
    displayLanguageTitle: 'Weergavetaal',
    displayLanguageHelp:
      'Taal voor menu’s, knoppen en labels in Branddock. Dit verandert niet de taal waarin je content wordt geschreven.',
    scopeOnlyYou: 'Alleen jij',
    saved: 'Weergavetaal bijgewerkt',
    saveFailed: 'Kon de weergavetaal niet bijwerken',
  },
  auth: {
    resetPasswordTitle: 'Wachtwoord resetten',
    resetPasswordSubtitle: 'Voer je e-mailadres in en we sturen je een resetlink.',
    resetSent: 'Als er een account met dit e-mailadres bestaat, ontvang je een resetlink.',
    backToLogin: 'Terug naar inloggen',
    emailLabel: 'E-mail',
    emailPlaceholder: 'naam@bedrijf.com',
    sending: 'Versturen…',
    sendResetLink: 'Resetlink versturen',
    signIn: 'Inloggen',
    register: 'Registreren',
    passwordLabel: 'Wachtwoord',
    forgotPassword: 'Wachtwoord vergeten?',
    passwordPlaceholder: 'Voer wachtwoord in',
    signingIn: 'Inloggen…',
    nameLabel: 'Naam',
    namePlaceholder: 'Je volledige naam',
    passwordMinPlaceholder: 'Minimaal 8 tekens',
    creating: 'Aanmaken…',
    createAccount: 'Account aanmaken',
    loginFailed: 'Inloggen mislukt',
    registrationFailed: 'Registratie mislukt',
    resetNotConfigured: 'Wachtwoord resetten is nog niet geconfigureerd. Neem contact op met support.',
    genericError: 'Er ging iets mis. Probeer het opnieuw.',
  },
} as const;

export default common;
