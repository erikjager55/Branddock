// Canonical (source-of-truth) English UI strings — `help` namespace.
const help = {
  page: {
    title: 'Help & Support',
    subtitle: 'Find answers, tutorials, and get in touch',
  },
  header: {
    title: 'How can we help you?',
    subtitle: 'Search our help center or browse topics below',
  },
  search: {
    placeholder: 'Search for articles, tutorials, and more...',
    articles: 'Articles',
    faq: 'FAQ',
  },
  quickActions: {
    gettingStarted: {
      title: 'Getting Started',
      description: 'Learn the basics and set up your workspace',
    },
    documentation: {
      title: 'Documentation',
      description: 'Browse our comprehensive documentation',
    },
    liveChat: {
      title: 'Live Chat',
      description: 'Chat with our support team in real time',
      badge: 'Available',
    },
    contactSupport: {
      title: 'Contact Support',
      description: "Send us a message and we'll get back to you",
    },
  },
  topics: {
    title: 'Browse by Topic',
    articleCount_one: '{{count}} article',
    articleCount_other: '{{count}} articles',
    fallback: {
      'getting-started': 'Getting Started',
      features: 'Features',
      'knowledge-base': 'Knowledge Base',
      'account-profile': 'Account & Profile',
      'billing-plans': 'Billing & Plans',
      troubleshooting: 'Troubleshooting',
    },
  },
  videos: {
    title: 'Video Tutorials',
    empty: 'No video tutorials available yet.',
  },
  faq: {
    title: 'Frequently Asked Questions',
    empty: 'No FAQ items available.',
    feedback: {
      thanks: 'Thanks for your feedback!',
      prompt: 'Was this helpful?',
    },
  },
  contact: {
    title: 'Contact Support',
    methods: {
      'live-chat': {
        title: 'Live Chat',
        responseTime: '~1 min response',
        badge: 'Online',
      },
      email: {
        title: 'Email Support',
        responseTime: '~4 hour response',
      },
      call: {
        title: 'Schedule a Call',
        responseTime: 'Book a time slot',
      },
    },
  },
  form: {
    submitted: {
      title: 'Request Submitted',
      description: "We'll get back to you as soon as possible.",
      another: 'Submit Another Request',
    },
    subject: {
      label: 'Subject',
      placeholder: 'Brief description of your issue',
    },
    category: {
      label: 'Category',
      placeholder: 'Select a category...',
      options: {
        GENERAL: 'General',
        TECHNICAL: 'Technical',
        BILLING: 'Billing',
        FEATURE_REQUEST: 'Feature Request',
        BUG_REPORT: 'Bug Report',
      },
    },
    description: {
      label: 'Description',
      placeholder: 'Describe your issue in detail...',
    },
    priority: {
      label: 'Priority',
      options: {
        LOW: 'Low',
        MEDIUM: 'Medium',
        HIGH: 'High',
      },
    },
    submit: 'Submit Request',
  },
  systemStatus: {
    title: 'System Status',
    overall: {
      operational: 'All Systems Operational',
      degraded: 'Degraded Performance',
      outage: 'System Outage',
    },
    service: {
      operational: 'Operational',
      degraded: 'Degraded',
      outage: 'Outage',
    },
    updated: 'Updated {{date}}',
  },
  featureRequests: {
    title: 'Feature Requests',
    request: 'Request a Feature',
    empty: 'No feature requests yet.',
    modal: {
      title: 'Request a Feature',
      subtitle: "Tell us what you'd like to see in Branddock",
      titleField: {
        label: 'Title',
        placeholder: 'What feature would you like?',
      },
      descriptionField: {
        label: 'Description',
        placeholder: 'Describe the feature in more detail (optional)...',
      },
      cancel: 'Cancel',
      submit: 'Submit Request',
    },
    status: {
      REQUESTED: 'Requested',
      PLANNED: 'Planned',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
    },
    userAlt: 'User',
    anonymous: 'Anonymous',
  },
  rating: {
    title: 'Rate Your Experience',
    thanks: 'Thank you for your feedback!',
    result: 'You rated us {{rating}} out of 5 stars.',
    placeholder: 'Tell us more about your experience (optional)...',
    submit: 'Submit',
  },
  resources: {
    title: 'Resources',
    links: {
      apiDocs: 'API Documentation',
      developerBlog: 'Developer Blog',
      communityForum: 'Community Forum',
      changelog: 'Product Changelog',
      statusPage: 'System Status Page',
      brandGuidelines: 'Brand Guidelines',
    },
  },
  chat: {
    title: 'Support Chat',
    comingSoon: 'Chat coming soon',
    comingSoonDetail: "We're working on live chat support.",
    open: 'Open chat',
    close: 'Close chat',
  },
} as const;

export default help;
