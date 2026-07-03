// Canonical (source-of-truth) English UI strings — `campaigns-cards` namespace.
// Data-driven labels rendered on Create-section cards (campaign + content cards):
// traffic-light readiness, content status, type pill, quality tier.
const campaignsCards = {
  trafficLight: {
    completed: 'Completed',
    archived: 'Archived',
    noContent: 'No content',
    inProgress: 'In progress',
    percentComplete: '{{progress}}% complete',
  },
  contentStatus: {
    published: 'Published',
    scheduled: 'Scheduled',
    ready: 'Ready',
    notStarted: 'Not started',
    needsReview: 'Needs review',
    inProgress: 'In progress',
  },
  overdue: 'overdue',
  typePill: {
    creative: 'Creative',
    strategic: 'Strategic',
    format: 'Format',
    quick: 'Quick',
  },
  quality: {
    excellent: 'Excellent',
    good: 'Good',
    needsWork: 'Needs Work',
  },
} as const;

export default campaignsCards;
