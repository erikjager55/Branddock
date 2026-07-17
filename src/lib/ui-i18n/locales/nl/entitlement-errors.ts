// Dutch UI strings — `entitlement-errors` namespace. Same key shape as en/.
const ns = {
  code: {
    WORKSPACE_LIMIT_REACHED: 'Workspace-limiet bereikt ({{limit}}) op het {{tier}}-abonnement. Upgrade voor meer.',
    SEAT_LIMIT_REACHED: 'Gebruikerslimiet bereikt ({{limit}}) op het {{tier}}-abonnement. Upgrade om meer mensen uit te nodigen.',
    PLAN_LIMIT_REACHED: 'Abonnementslimiet bereikt op het {{tier}}-abonnement. Upgrade om door te gaan.',
    NOT_MEMBER: 'Je bent geen lid van deze organisatie.',
    NOT_OWNER_OR_ADMIN: 'Alleen eigenaren en beheerders kunnen dit doen.',
    ONLY_OWNER_CAN_INVITE_OWNER: 'Alleen een eigenaar kan een andere eigenaar uitnodigen.',
    ALREADY_MEMBER: 'Deze persoon is al lid van je organisatie.',
    INVITE_ALREADY_PENDING: 'Dit e-mailadres is al uitgenodigd.',
    WORKSPACE_NAME_TAKEN: 'Er bestaat al een workspace met deze naam.',
    WORKSPACE_NAME_RESERVED: 'Deze workspace-naam is gereserveerd — kies een andere.',
    NO_ACTIVE_ORG: 'Geen actieve organisatie gevonden.',
  },
  upgradeCta: 'Upgrade abonnement',
} as const;

export default ns;
