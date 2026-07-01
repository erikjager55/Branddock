// Dutch UI strings — `settings-account` namespace. Zelfde key-shape als en/.
const settingsAccount = {
  tab: {
    title: 'Accountinstellingen',
    subtitle: 'Beheer je profiel, beveiliging en accountvoorkeuren.',
  },
  profile: {
    title: 'Profielgegevens',
    emailLabel: 'E-mail',
    verified: 'Geverifieerd',
    firstName: 'Voornaam',
    lastName: 'Achternaam',
    firstNamePlaceholder: 'Je voornaam',
    lastNamePlaceholder: 'Je achternaam',
    emailPlaceholder: 'jouw@email.com',
    jobTitle: 'Functie',
    jobTitlePlaceholder: 'bijv. Brand Strategist',
    phone: 'Telefoon',
    phonePlaceholder: '+31 6 1234 5678',
    save: 'Wijzigingen opslaan',
  },
  avatar: {
    alt: 'Avatar',
    upload: 'Uploaden',
    remove: 'Verwijderen',
    promptUrl: 'Voer avatar-URL in (demo stub):',
  },
  password: {
    title: 'Wachtwoord wijzigen',
    currentLabel: 'Huidig wachtwoord',
    currentPlaceholder: 'Voer huidig wachtwoord in',
    newLabel: 'Nieuw wachtwoord',
    newPlaceholder: 'Minimaal 8 tekens',
    confirmLabel: 'Bevestig nieuw wachtwoord',
    confirmPlaceholder: 'Voer nieuw wachtwoord opnieuw in',
    minError: 'Moet minimaal 8 tekens zijn',
    matchError: 'Wachtwoorden komen niet overeen',
    minValidation: 'Nieuw wachtwoord moet minimaal 8 tekens zijn.',
    matchValidation: 'Wachtwoorden komen niet overeen.',
    changeFailed: 'Wachtwoord wijzigen mislukt.',
    success: 'Wachtwoord succesvol bijgewerkt.',
    update: 'Wachtwoord bijwerken',
  },
  email: {
    title: 'E-mailvoorkeuren',
    toggles: {
      productUpdates: {
        label: 'Productupdates',
        description: 'Ontvang e-mails over nieuwe functies en productverbeteringen.',
      },
      researchNotifications: {
        label: 'Onderzoeksmeldingen',
        description:
          'Krijg een melding wanneer onderzoeksresultaten klaar zijn of aandacht nodig hebben.',
      },
      teamActivity: {
        label: 'Teamactiviteit',
        description: 'Blijf op de hoogte van acties van teamleden en samenwerking.',
      },
      marketing: {
        label: 'Marketing',
        description: 'Ontvang tips, best practices en promotionele content.',
      },
    },
  },
  connectedAccounts: {
    title: 'Gekoppelde accounts',
    empty: 'Nog geen gekoppelde accounts.',
    connected: 'Gekoppeld',
    connect: 'Koppelen',
    disconnect: 'Ontkoppelen',
  },
  dataExport: {
    title: 'Alle gegevens downloaden',
    description:
      "Exporteer al je Workspace-gegevens als één JSON-bestand. Inclusief brand assets, Persona's, producten, campagnes, trends, strategieën en meer.",
    exporting: 'Exporteren...',
    forbidden: 'Alleen eigenaren en beheerders kunnen Workspace-gegevens exporteren.',
    failed: 'Export mislukt. Probeer het opnieuw.',
  },
  dangerZone: {
    title: 'Account verwijderen',
    description:
      'Verwijder je account en alle bijbehorende gegevens permanent. Deze actie kan niet ongedaan worden gemaakt en verwijdert al je Workspaces, brand assets en teamlidmaatschappen.',
    deleteButton: 'Account verwijderen',
    confirmDelete:
      'Weet je zeker dat je je account wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt. Al je gegevens, Workspaces en teamlidmaatschappen worden permanent verwijderd.',
  },
} as const;

export default settingsAccount;
