// Dutch UI strings — `auth-chrome` namespace.
const ns = {
  orgSwitcher: {
    selectOrganization: 'Selecteer organisatie',
    organizationsHeading: 'Organisaties',
    workspacesHeading: 'Workspaces',
    newWorkspacePlaceholder: 'Naam workspace…',
    add: 'Toevoegen',
    newWorkspace: 'Nieuwe workspace',
    createFailed: 'Kon workspace niet aanmaken',
    newWorkspaceLimitReached: 'Workspace-limiet bereikt ({{current}}/{{limit}}) — upgrade je abonnement voor meer.',
  },
  socialProviders: {
    google: 'Doorgaan met Google',
    microsoft: 'Doorgaan met Microsoft',
    apple: 'Doorgaan met Apple',
  },
  socialLogin: {
    loginFailed: 'Inloggen mislukt',
    popupBlocked: 'Pop-up geblokkeerd. Sta pop-ups toe voor deze site.',
    accountExists:
      'Dit e-mailadres is al gekoppeld aan een ander account. Probeer in te loggen met e-mail.',
    genericError: 'Er ging iets mis. Probeer het opnieuw.',
  },
  divider: {
    orWithEmail: 'of log in met e-mail',
  },
} as const;

export default ns;
