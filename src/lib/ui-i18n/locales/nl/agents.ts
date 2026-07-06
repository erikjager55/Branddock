// Nederlandse vertaling — `agents` namespace (bron: locales/en/agents.ts).
const ns = {
  catalog: {
    title: 'Agents',
    subtitle: 'Specialistische agents die taken oppakken en resultaten opleveren voor jouw goedkeuring',
    inboxButton: 'Resultaten-inbox',
    scopeNoteTitle: 'Agents vs. Brand Assistant',
    scopeNote:
      'Agents voeren complete taken uit en leveren hun resultaten af in de inbox voor jouw goedkeuring. Voor snelle vragen en context-hulp gebruik je de Brand Assistant in de bovenbalk.',
    empty: {
      title: 'Nog geen agents beschikbaar',
      description:
        'De agent-catalogus wordt voorbereid. Agents verschijnen hier zodra ze voor jouw workspace zijn geactiveerd.',
    },
    error: {
      title: 'Kon agents niet laden',
      retry: 'Opnieuw proberen',
    },
    card: {
      useCases: 'Use-cases',
    },
  },
  detail: {
    sources: {
      title: 'Content sources',
      defaultSummary: 'Volledige merkcontext (standaard)',
      customSummary: '{{count}} bronnen geselecteerd',
      customSummary_one: '{{count}} bron geselecteerd',
      reset: 'Terug naar standaard',
      emptyError: 'Kies minstens één content source, of zet terug naar standaard.',
      hint: 'Kies welke workspace-bronnen deze run als context mag gebruiken. Verwijder je de brand-modules, dan verdwijnt ook het merkfundament uit de prompt.',
    },
    back: 'Terug naar Agents',
    chatButton: 'Chat met {{name}}',
    inboxButton: 'Resultaten-inbox',
    useCasesTitle: 'Wat kan {{name}} voor je doen?',
    useCasesSubtitle: 'Kies een taak om te starten',
    notFound: {
      title: 'Agent niet gevonden',
      description: 'Deze agent is niet geregistreerd in de catalogus.',
    },
    form: {
      inputLabel: 'Opdracht',
      inputPlaceholder: 'Beschrijf het onderwerp of de opdracht...',
      run: 'Taak uitvoeren',
      running: 'Aan het werk — dit kan enkele minuten duren. Het resultaat landt in de Resultaten-inbox.',
      inputRequired: 'Beschrijf eerst je opdracht.',
      startError: 'Kon de run niet starten',
    },
    result: {
      completedTitle: 'Taak afgerond',
      failedTitle: 'Taak mislukt',
      awaitingTitle: 'Resultaat wacht op jouw goedkeuring',
      artifacts_one: '{{count}} resultaat',
      artifacts_other: '{{count}} resultaten',
      viewInInbox: 'Bekijk in inbox',
    },
    recentRuns: {
      title: 'Recente runs',
      empty: 'Nog geen runs — kies hierboven een use-case om te starten.',
      viewAll: 'Bekijk alles in de inbox',
    },
  },
  inbox: {
    title: 'Resultaten-inbox',
    subtitle: 'Runs en resultaten van alle agents in deze workspace',
    backToCatalog: 'Alle agents',
    empty: {
      title: 'Nog geen agent-runs',
      description: 'Geef een agent een taak en de resultaten landen hier voor jouw beoordeling.',
      cta: 'Bekijk agents',
    },
    error: {
      title: 'Kon runs niet laden',
      retry: 'Opnieuw proberen',
    },
    run: {
      cost: 'Kosten',
      duration: 'Duur',
      truncated: 'Voortijdig gestopt door een run-guard',
      staleNote:
        'Deze run staat al meer dan 15 minuten op "bezig" en is mogelijk vastgelopen. Je kunt veilig een nieuwe run starten.',
      artifacts_one: '{{count}} resultaat',
      artifacts_other: '{{count}} resultaten',
      noArtifacts: 'Deze run leverde geen resultaten op',
      detailError: 'Kon run-details niet laden',
      detailRetry: 'Opnieuw proberen',
    },
    status: {
      QUEUED: 'In wachtrij',
      RUNNING: 'Bezig',
      AWAITING_CONFIRMATION: 'Wacht op goedkeuring',
      COMPLETED: 'Afgerond',
      FAILED: 'Mislukt',
      stale: 'Mogelijk vastgelopen',
    },
  },
  artifact: {
    accept: 'Accepteren',
    dismiss: 'Afwijzen',
    accepted: 'Geaccepteerd',
    dismissed: 'Afgewezen',
    savedToLibrary: 'Opgeslagen in Knowledge Library',
    openInLibrary: 'Open in Knowledge Library',
    actionError: 'Kon het resultaat niet bijwerken',
    fidelityScore: 'Brand fidelity',
    table: {
      invalid: 'Deze tabel kan niet worden weergegeven — de onderliggende data is misvormd.',
      empty: 'De query leverde geen rijen op.',
      rowCount_one: '{{count}} rij',
      rowCount_other: '{{count}} rijen',
      sortHint: 'Sorteer op {{column}}',
    },
    findings: {
      flagged: 'Onder de merkdrempel — beoordeel vóór gebruik.',
      passed: 'On-brand',
      suggestion: 'Suggestie',
      noFindings: 'Er zijn geen losse bevindingen gerapporteerd.',
    },
    link: {
      open: 'Openen',
      unavailable: 'Voor dit item is nog geen directe link beschikbaar.',
    },
    proposal: {
      title: 'Voorgestelde wijziging',
      approve: 'Goedkeuren',
      reject: 'Afwijzen',
      approveNote: 'Goedkeuren voert deze wijziging uit in je workspace.',
      current: 'Huidig',
      proposed: 'Voorgesteld',
      emptyValue: 'Leeg',
      alreadyResolved: 'Dit voorstel is al afgehandeld — resultaat wordt ververst.',
      confirmError: 'Kon de bevestiging niet verwerken',
      approved: 'Wijziging doorgevoerd',
      rejected: 'Voorstel afgewezen — er is niets gewijzigd',
    },
  },
} as const;

export default ns;
