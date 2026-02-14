import { Persona } from '../types/persona';

export const mockPersonas: Persona[] = [
  {
    id: 'persona-1',
    name: 'Sarah the Startup Founder',
    tagline: 'Ambitious entrepreneur building her first SaaS company',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    demographics: {
      age: '28-35',
      location: 'Amsterdam, Netherlands',
      occupation: 'Founder & CEO',
      education: 'Master\'s in Business Administration',
      income: '€60k-€80k',
      familyStatus: 'Single, no children'
    },
    goals: [
      'Build a successful SaaS product',
      'Secure Series A funding',
      'Grow team from 5 to 20 people',
      'Establish strong brand identity'
    ],
    frustrations: [
      'Limited budget for professional services',
      'Lack of branding expertise in team',
      'Time constraints - wearing too many hats',
      'Difficulty articulating company vision'
    ],
    motivations: [
      'Create lasting impact in her industry',
      'Build a company culture she\'s proud of',
      'Prove herself as a capable leader',
      'Financial independence'
    ],
    behaviors: [
      'Works 60+ hours per week',
      'Active on LinkedIn and Twitter',
      'Attends startup networking events',
      'Reads business books and podcasts',
      'Prefers self-service tools over agencies'
    ],
    personality: 'Driven, analytical, creative, perfectionist',
    values: ['Innovation', 'Transparency', 'Growth', 'Authenticity'],
    interests: ['Tech trends', 'Leadership', 'Design thinking', 'Productivity'],
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'not-started'
      },
      {
        type: 'interviews',
        status: 'completed',
        completedAt: '2025-01-15',
        participantCount: 8,
        insights: [
          'Values speed and efficiency over perfection',
          'Prefers educational content over sales pitches',
          'Makes quick decisions when value is clear'
        ]
      },
      {
        type: 'surveys',
        status: 'in-progress',
        progress: 65,
        participantCount: 24
      },
      {
        type: 'user-testing',
        status: 'not-started'  // Will show as 'locked' in UI based on unlockLevel
      }
    ],
    researchCoverage: 50,
    validationScore: 68,
    status: 'in-research',
    createdAt: '2024-12-01',
    lastUpdated: '2025-01-15',
    tags: ['B2B', 'SaaS', 'Startup', 'Decision Maker']
  },
  {
    id: 'persona-2',
    name: 'Marcus the Marketing Director',
    tagline: 'Experienced CMO at mid-size tech company',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    demographics: {
      age: '40-50',
      location: 'London, UK',
      occupation: 'Chief Marketing Officer',
      education: 'Master\'s in Marketing',
      income: '€100k-€150k',
      familyStatus: 'Married, 2 children'
    },
    goals: [
      'Rebrand company to compete with enterprise players',
      'Increase brand awareness by 40%',
      'Align marketing with sales for better conversion',
      'Build high-performing marketing team'
    ],
    frustrations: [
      'Brand inconsistency across channels',
      'Executive team doesn\'t understand marketing ROI',
      'Limited resources compared to competitors',
      'Outdated brand positioning'
    ],
    motivations: [
      'Career advancement to VP level',
      'Recognition in the industry',
      'Prove marketing\'s business impact',
      'Leave a legacy brand'
    ],
    behaviors: [
      'Data-driven decision making',
      'Delegates execution, focuses on strategy',
      'Attends marketing conferences',
      'Networks with other CMOs',
      'Prefers agencies with proven track record'
    ],
    personality: 'Strategic, diplomatic, results-oriented, collaborative',
    values: ['Data', 'Innovation', 'Team success', 'Accountability'],
    interests: ['Marketing trends', 'Brand strategy', 'Leadership', 'Analytics'],
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'not-started'
      },
      {
        type: 'interviews',
        status: 'completed',
        completedAt: '2025-01-15',
        participantCount: 8,
        insights: [
          'Values speed and efficiency over perfection',
          'Prefers educational content over sales pitches',
          'Makes quick decisions when value is clear'
        ]
      },
      {
        type: 'surveys',
        status: 'in-progress',
        progress: 65,
        participantCount: 24
      },
      {
        type: 'user-testing',
        status: 'not-started'  // Will show as 'locked' in UI based on unlockLevel
      }
    ],
    researchCoverage: 50,
    validationScore: 68,
    status: 'in-research',
    createdAt: '2024-12-10',
    lastUpdated: '2025-01-10',
    tags: ['B2B', 'Enterprise', 'Marketing', 'Decision Maker']
  },
  {
    id: 'persona-3',
    name: 'Lisa the Freelance Designer',
    tagline: 'Independent brand designer for small businesses',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    demographics: {
      age: '25-32',
      location: 'Berlin, Germany',
      occupation: 'Freelance Brand Designer',
      education: 'Bachelor in Graphic Design',
      income: '€35k-€50k',
      familyStatus: 'In a relationship, no children'
    },
    goals: [
      'Offer more strategic services to clients',
      'Increase project rates',
      'Build recurring revenue streams',
      'Establish thought leadership'
    ],
    frustrations: [
      'Clients undervalue strategic work',
      'Difficult to scale freelance business',
      'Time spent on client education',
      'Inconsistent project pipeline'
    ],
    motivations: [
      'Creative freedom and flexibility',
      'Help small businesses succeed',
      'Continuous learning and growth',
      'Work-life balance'
    ],
    behaviors: [
      'Active in design communities',
      'Shares work on Instagram and Behance',
      'Takes online courses regularly',
      'Prefers affordable, easy-to-use tools',
      'Word-of-mouth for finding new tools'
    ],
    personality: 'Creative, empathetic, detail-oriented, independent',
    values: ['Creativity', 'Quality', 'Flexibility', 'Continuous learning'],
    interests: ['Design trends', 'Brand strategy', 'Entrepreneurship', 'Creative tools'],
    researchMethods: [
      {
        type: 'ai-exploration',
        status: 'not-started'
      },
      {
        type: 'interviews',
        status: 'in-progress',
        progress: 30,
        participantCount: 3
      },
      {
        type: 'surveys',
        status: 'not-started'
      }
    ],
    researchCoverage: 25,
    validationScore: 45,
    status: 'draft',
    createdAt: '2025-01-05',
    lastUpdated: '2025-01-18',
    tags: ['B2C', 'Freelancer', 'Design', 'Influencer']
  }
];