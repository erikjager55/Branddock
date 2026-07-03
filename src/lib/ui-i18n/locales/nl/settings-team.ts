// Dutch UI strings — `settings-team` namespace.
const settingsTeam = {
  title: 'Teambeheer',
  subtitle: 'Beheer je teamleden, uitnodigingen en rolrechten.',
  roles: {
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer',
  },
  plan: {
    seatsUsed: '{{used}} van {{limit}} plekken gebruikt',
    unlimited: 'Onbeperkt',
    inviteMember: 'Lid uitnodigen',
    upgradePlan: 'Plan upgraden',
    unlimitedSeatsBeta: 'Onbeperkt aantal plekken tijdens de beta',
  },
  membersTable: {
    title: 'Teamleden ({{total}})',
    empty: {
      title: 'Nog geen teamleden',
      description:
        'Nodig teamleden uit om samen aan je merkstrategie te werken.',
    },
    columns: {
      member: 'Lid',
      role: 'Rol',
      status: 'Status',
      joined: 'Lid sinds',
      actions: 'Acties',
    },
  },
  memberRow: {
    active: 'Actief',
    inactive: 'Inactief',
    changeRole: 'Rol wijzigen',
    remove: 'Verwijderen',
  },
  pending: {
    title: 'Openstaande uitnodigingen',
    empty: 'Geen openstaande uitnodigingen',
    sent: 'Verzonden {{date}}',
    expiresIn_one: 'Verloopt over {{count}} dag',
    expiresIn_other: 'Verloopt over {{count}} dagen',
    expired: 'Verlopen',
    resend: 'Opnieuw versturen',
    cancel: 'Annuleren',
  },
  invite: {
    title: 'Teamlid uitnodigen',
    subtitle: 'Stuur een uitnodiging om samen te werken in je Workspace.',
    cancel: 'Annuleren',
    send: 'Uitnodiging versturen',
    emailLabel: 'E-mailadres',
    emailPlaceholder: 'collega@bedrijf.nl',
    roleLabel: 'Rol',
    rolePlaceholder: 'Kies een rol...',
    errorAlreadyInvited: 'Dit e-mailadres is al uitgenodigd.',
    errorSeatLimit:
      'Maximale aantal plekken bereikt. Upgrade je plan om meer leden uit te nodigen.',
    errorSendFailed: 'Uitnodiging versturen mislukt',
  },
  permissions: {
    title: 'Rolrechten',
    permission: 'Recht',
    canManageMembers: 'Leden beheren',
    canManageBilling: 'Facturatie beheren',
    canDeleteWorkspace: 'Workspace verwijderen',
    canInvite: 'Uitnodigen',
    canEditContent: 'Content bewerken',
    canViewContent: 'Content bekijken',
  },
} as const;

export default settingsTeam;
