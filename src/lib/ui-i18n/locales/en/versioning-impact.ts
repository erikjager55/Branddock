// Canonical (source-of-truth) English UI strings — `versioning-impact` namespace.
const ns = {
  versioning: {
    pill: {
      versions_one: '{{count}} version',
      versions_other: '{{count}} versions',
    },
    panel: {
      title: 'Version History',
      empty: 'No versions yet',
      emptyHint: 'Versions are created when you save, lock, or use AI features.',
      current: 'Current',
      fieldsChanged_one: '{{count}} field changed',
      fieldsChanged_other: '{{count}} fields changed',
      restorePrompt: 'Restore to this version?',
      restoring: 'Restoring...',
      confirm: 'Confirm',
      cancel: 'Cancel',
      restore: 'Restore',
    },
    // Render-edge labels for the VersionChangeType map — keyed on the enum value.
    changeType: {
      MANUAL_SAVE: 'Saved',
      AUTO_SAVE: 'Auto-saved',
      LOCK_BASELINE: 'Locked',
      AI_GENERATED: 'AI Generated',
      RESTORE: 'Restored',
      IMPORT: 'Imported',
    },
  },
  impact: {
    notification: {
      title: 'Newer strategic input available',
      singleAsset:
        'The asset <b>{{name}}</b> has been updated with new research since this campaign was configured.',
      multipleAssets_one:
        '{{count}} asset has been updated with new research since this campaign was configured.',
      multipleAssets_other:
        '{{count}} assets have been updated with new research since this campaign was configured.',
      moreChanges_one: '+{{count}} more change',
      moreChanges_other: '+{{count}} more changes',
      recalculate: 'Recalculate with new input',
      reviewLater: 'Review later',
    },
    compact: {
      summary_one: '{{count}} asset has new strategic input',
      summary_other: '{{count}} assets have new strategic input',
      viewDetails: 'View details',
    },
    decision: {
      title: 'Recent changes',
      newBadge: '{{count}} new',
      empty: 'No recent changes with impact on decisions',
    },
    summary: {
      heading: 'What does this change mean?',
      showMore_one: 'Show {{count}} more change',
      showMore_other: 'Show {{count}} more changes',
      showLess: 'Show less',
    },
  },
} as const;

export default ns;
