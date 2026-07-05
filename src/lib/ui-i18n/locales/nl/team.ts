// Dutch UI strings — `team` namespace. Same key shape as en/team.ts.
const ns = {
  page: {
    title: 'Team',
    subtitle: 'Beheer teamleden en rechten',
    back: 'Instellingen',
    invite: '+ Lid uitnodigen',
  },
  loading: 'Team laden...',
  retry: 'Opnieuw',
  errors: {
    load: 'Kon teamleden niet laden',
    invite: 'Uitnodiging versturen mislukt',
  },
  confirmRemove: 'Weet je zeker dat je dit teamlid wilt verwijderen?',
  stats: {
    owners: 'Eigenaren',
    admins: 'Admins',
    members: 'Leden',
    viewers: 'Kijkers',
  },
  search: {
    placeholder: 'Zoek teamleden...',
  },
  inviteForm: {
    title: 'Teamlid uitnodigen',
    subtitle: 'Stuur een uitnodiging om lid te worden van je organisatie',
    emailLabel: 'E-mailadres',
    emailPlaceholder: 'collega@voorbeeld.nl',
    roleLabel: 'Rol',
    roleViewer: 'Kijker',
    roleMember: 'Lid',
    roleAdmin: 'Admin',
    send: 'Uitnodiging versturen',
    cancel: 'Annuleren',
  },
  invitations: {
    heading: 'Openstaande uitnodigingen ({{count}})',
    invitedAs: 'Uitgenodigd als {{role}} · Verloopt {{date}}',
    pending: 'In afwachting',
    cancelTitle: 'Uitnodiging annuleren',
  },
  membersList: {
    heading: 'Teamleden ({{count}})',
    active: 'Actief',
    inactive: 'Inactief',
    joined: 'Lid sinds {{date}}',
    emptyTitle: 'Geen teamleden gevonden',
    emptySearch: 'Pas je zoekopdracht aan',
    emptyDefault: 'Nodig teamleden uit om te beginnen',
  },
  permissions: {
    heading: 'Rolrechten',
    owner: {
      title: 'Eigenaar',
      description: 'Volledige toegang tot alle functies, facturatie en teambeheer',
    },
    admin: {
      title: 'Admin',
      description: 'Beheer teamleden, Workspaces en organisatie-instellingen',
    },
    member: {
      title: 'Lid',
      description: 'Maak en bewerk content, strategieën en onderzoek',
    },
    viewer: {
      title: 'Kijker',
      description: 'Alleen-lezen toegang tot content en rapporten',
    },
  },
} as const;

export default ns;
