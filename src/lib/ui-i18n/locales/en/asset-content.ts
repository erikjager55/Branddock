// Canonical (source-of-truth) English UI strings — `asset-content` namespace.
const ns = {
  simpleText: {
    title: 'Content',
    subtitle: 'Define the core content for this asset',
    placeholder: 'Enter content...',
    empty: 'No content defined yet. Click "Edit Content" to add content.',
  },
  thinkFeelAct: {
    dimensions: {
      think: {
        title: 'Think',
        subtitle: 'Cognitive Goal',
        description: 'What you want your audience to think and believe',
      },
      feel: {
        title: 'Feel',
        subtitle: 'Emotional Goal',
        description: 'The emotions you want to evoke in your audience',
      },
      act: {
        title: 'Act',
        subtitle: 'Behavioral Goal',
        description: 'The specific actions you want to drive',
      },
    },
    placeholder: 'Enter {{dimension}} goal...',
    empty: 'No {{dimension}} goal defined yet.',
  },
  esg: {
    dimensions: {
      environmental: {
        title: 'Environmental',
        description: 'Environmental sustainability and ecological impact',
      },
      social: {
        title: 'Social',
        description: 'Social responsibility and community impact',
      },
      governance: {
        title: 'Governance',
        description: 'Corporate governance and ethical practices',
      },
    },
    impact: {
      high: 'high impact',
      medium: 'medium impact',
      low: 'low impact',
    },
    placeholder: 'Enter {{dimension}} commitment...',
    empty: 'No {{dimension}} commitment defined yet.',
  },
} as const;

export default ns;
