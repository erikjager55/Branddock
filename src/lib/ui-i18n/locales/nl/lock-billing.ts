// Dutch UI strings — `lock-billing` namespace. Same key shape as en/.
const ns = {
  cardIndicator: {
    locked: 'Vergrendeld',
  },
  lockBanner: {
    title: 'Dit item is vergrendeld',
    lockedBy: 'Vergrendeld door {{name}}',
    unlock: 'Ontgrendelen',
  },
  pill: {
    locked: 'Vergrendeld',
    editable: 'Bewerkbaar',
    tooltip: 'Vergrendeld door {{name}} — {{time}}',
    time: {
      justNow: 'zojuist',
      minAgo: '{{minutes}} min geleden',
      hoursAgo: '{{hours}} u geleden',
      daysAgo_one: '{{count}} dag geleden',
      daysAgo_other: '{{count}} dagen geleden',
    },
  },
  shield: {
    lockAria: 'Dit item vergrendelen',
    unlockAria: 'Dit item ontgrendelen',
  },
  confirmDialog: {
    header: {
      lockTitle: 'Item vergrendelen',
      unlockTitle: 'Item ontgrendelen',
      lockAria: 'Vergrendel {{name}}',
      unlockAria: 'Ontgrendel {{name}}',
    },
    sections: {
      willBeBlocked: 'Wordt geblokkeerd',
      willBeEnabled: 'Wordt ingeschakeld',
      willBeHidden: 'Wordt verborgen',
      willBeVisible: 'Wordt zichtbaar',
      alwaysAvailable: 'Altijd beschikbaar',
    },
    blocked: {
      editContent: 'Content bewerken',
      deleteTrend: 'Trend verwijderen',
      activateDismissTrend: 'Trend activeren of afwijzen',
      deleteItem: 'Item verwijderen',
      aiGeneration: 'AI-generatie & regeneratie',
      startAiExploration: 'AI Exploration starten',
      startNewConversation: 'Nieuw gesprek starten',
      startResearchMethods: 'Onderzoeksmethoden starten',
    },
    hidden: {
      emptySections: 'Lege/onvolledige secties',
      aiTools: 'AI-tools & generatieknoppen',
    },
    alwaysAvailableItems: {
      duplicate: 'Dupliceren (maakt ontgrendelde kopie)',
      export: 'Exporteren (PDF, JSON)',
      viewSections: 'Voltooide secties bekijken',
    },
    cancel: 'Annuleren',
    lock: 'Vergrendelen',
    unlock: 'Ontgrendelen',
  },
  billingBanner: {
    freeBetaTitle: 'Gratis beta — alle functies ontgrendeld',
    freeBetaSubtitle: 'Volledige toegang tijdens de betaperiode',
    limitReachedTitle: 'AI-tokenlimiet bereikt',
    percentUsedTitle: '{{percent}}% van AI-tokens gebruikt',
    limitReachedSubtitle: 'Upgrade je abonnement om AI-functies te blijven gebruiken',
    warningSubtitle: 'Overweeg te upgraden om onderbrekingen te voorkomen',
    upgrade: 'Upgraden',
  },
  planBadge: {
    beta: 'BETA',
  },
  // planName/planFeatures zijn hier verwijderd — ze liepen stil uit de pas
  // met PLAN_CONFIGS (src/lib/constants/plan-limits.ts) zodra die veranderde
  // (bv. AGENCY toonde "10 workspaces"/"25 teamleden" i.p.v. de echte 15/10).
  // t('planName.*', { defaultValue }) / t('planFeatures.*', { defaultValue })
  // vallen al terug op de live PLAN_CONFIGS-waarden als er geen key bestaat —
  // die fallback is nu wat altijd rendert, dus kan niet meer gaan afwijken.
  upgradeModal: {
    title: 'Kies je abonnement',
    subtitle: 'Kies het abonnement dat bij je past',
    monthly: 'Maandelijks',
    yearly: 'Jaarlijks',
    save: '20% korting',
    popular: 'Populair',
    current: 'Huidig',
    perMonthShort: 'mnd',
    perYearShort: 'jr',
    currentPlan: 'Huidig abonnement',
    free: 'Gratis',
    redirecting: 'Doorsturen...',
    upgrade: 'Upgraden',
    trialNote: 'Start met een gratis proefperiode van {{days}} dagen — {{credits}} credits inbegrepen, geen creditcard nodig.',
  },
  usageMeter: {
    title: 'AI Tokens',
    compact: '{{used}} / {{limit}} AI-tokens',
    used: '{{used}} / {{limit}} gebruikt',
  },
} as const;

export default ns;
