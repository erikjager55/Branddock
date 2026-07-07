// Canonical (source-of-truth) English UI strings — `agents` namespace.
const ns = {
  catalog: {
    title: 'Agents',
    subtitle: 'Specialist agents that take on tasks and deliver results for your approval',
    inboxButton: 'Results Inbox',
    scopeNoteTitle: 'Agents vs. Brand Assistant',
    scopeNote:
      'Agents run complete tasks and deliver their results to the inbox for your approval. For quick questions and page-aware help, use the Brand Assistant in the top bar.',
    empty: {
      title: 'No agents available yet',
      description:
        'The agent catalog is being prepared. Agents appear here as soon as they are activated for your workspace.',
    },
    error: {
      title: 'Could not load agents',
      retry: 'Try again',
    },
    card: {
      useCases: 'Use cases',
    },
  },
  detail: {
    sources: {
      title: 'Content sources',
      defaultSummary: 'Full brand context (default)',
      customSummary: '{{count}} sources selected',
      customSummary_one: '{{count}} source selected',
      reset: 'Reset to default',
      emptyError: 'Select at least one content source, or reset to the default.',
      hint: 'Choose which workspace sources this run may use as context. Removing the brand modules also removes the brand foundation from the prompt.',
    },
    back: 'Back to Agents',
    chatButton: 'Chat with {{name}}',
    inboxButton: 'Results Inbox',
    useCasesTitle: 'What can {{name}} do for you?',
    useCasesSubtitle: 'Pick a task to get started',
    notFound: {
      title: 'Agent not found',
      description: 'This agent is not registered in the catalog.',
    },
    form: {
      inputLabel: 'Assignment',
      inputPlaceholder: 'Describe the topic or assignment...',
      run: 'Run task',
      running: 'Working on it — this can take a few minutes. The result lands in the Results Inbox.',
      inputRequired: 'Describe your assignment first.',
      startError: 'Could not start the run',
    },
    result: {
      completedTitle: 'Task completed',
      failedTitle: 'Task failed',
      awaitingTitle: 'Result waiting for your approval',
      artifacts_one: '{{count}} result',
      artifacts_other: '{{count}} results',
      viewInInbox: 'View in inbox',
    },
    recentRuns: {
      title: 'Recent runs',
      empty: 'No runs yet — pick a use case above to start one.',
      viewAll: 'View all in inbox',
    },
  },
  inbox: {
    title: 'Results Inbox',
    subtitle: 'Runs and results from all agents in this workspace',
    backToCatalog: 'All agents',
    empty: {
      title: 'No agent runs yet',
      description: 'Give an agent a task and its results land here for your review.',
      cta: 'Browse agents',
    },
    error: {
      title: 'Could not load runs',
      retry: 'Try again',
    },
    run: {
      cost: 'Cost',
      duration: 'Duration',
      truncated: 'Stopped early by a run guard',
      staleNote:
        'This run has been marked as running for over 15 minutes and may be stuck. It is safe to start a new run.',
      artifacts_one: '{{count}} result',
      artifacts_other: '{{count}} results',
      noArtifacts: 'This run produced no results',
      detailError: 'Could not load run details',
      detailRetry: 'Try again',
      draftPreview:
        'This is a concept preview — the final, brand-fidelity-scored version is generated after you approve the proposal.',
    },
    status: {
      QUEUED: 'Queued',
      RUNNING: 'Running',
      AWAITING_CONFIRMATION: 'Needs approval',
      COMPLETED: 'Completed',
      FAILED: 'Failed',
      stale: 'Possibly stuck',
    },
  },
  artifact: {
    accept: 'Accept',
    dismiss: 'Dismiss',
    accepted: 'Accepted',
    dismissed: 'Dismissed',
    savedToLibrary: 'Saved in Knowledge Library',
    openInLibrary: 'Open in Knowledge Library',
    actionError: 'Could not update the result',
    fidelityScore: 'Brand fidelity',
    table: {
      invalid: 'This table could not be displayed — the underlying data is malformed.',
      empty: 'The query returned no rows.',
      rowCount_one: '{{count}} row',
      rowCount_other: '{{count}} rows',
      sortHint: 'Sort by {{column}}',
    },
    findings: {
      flagged: 'Below the brand threshold — review before use.',
      passed: 'On brand',
      suggestion: 'Suggestion',
      noFindings: 'No individual findings were reported.',
    },
    link: {
      open: 'Open',
      unavailable: 'No direct link is available for this item yet.',
    },
    proposal: {
      title: 'Proposed change',
      approve: 'Approve',
      reject: 'Reject',
      approveNote: 'Approving executes this change in your workspace.',
      current: 'Current',
      proposed: 'Proposed',
      emptyValue: 'Empty',
      alreadyResolved: 'This proposal was already resolved — refreshing the result.',
      confirmError: 'Could not process the confirmation',
      approved: 'Change applied',
      rejected: 'Proposal rejected — nothing was changed',
    },
  },
} as const;

export default ns;
