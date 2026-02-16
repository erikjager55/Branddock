import { Persona } from '../types/persona';

export const mockPersonas: Persona[] = [
  {
    id: 'persona-1',
    name: 'Sarah the Startup Founder',
    tagline: 'Ambitious entrepreneur building her first SaaS company',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    avatarSource: 'MANUAL_URL',
    age: '28-35',
    gender: null,
    location: 'Amsterdam, Netherlands',
    occupation: 'Founder & CEO',
    education: "Master's in Business Administration",
    income: '€60k-€80k',
    familyStatus: 'Single, no children',
    personalityType: 'Driven, analytical, creative, perfectionist',
    coreValues: ['Innovation', 'Transparency', 'Growth', 'Authenticity'],
    interests: ['Tech trends', 'Leadership', 'Design thinking', 'Productivity'],
    goals: [
      'Build a successful SaaS product',
      'Secure Series A funding',
      'Grow team from 5 to 20 people',
      'Establish strong brand identity'
    ],
    motivations: [
      'Create lasting impact in her industry',
      "Build a company culture she's proud of",
      'Prove herself as a capable leader',
      'Financial independence'
    ],
    frustrations: [
      'Limited budget for professional services',
      'Lack of branding expertise in team',
      'Time constraints - wearing too many hats',
      'Difficulty articulating company vision'
    ],
    behaviors: [
      'Works 60+ hours per week',
      'Active on LinkedIn and Twitter',
      'Attends startup networking events',
      'Reads business books and podcasts',
      'Prefers self-service tools over agencies'
    ],
    strategicImplications: null,
    isLocked: false,
    lockedBy: null,
    lockedAt: null,
    validationPercentage: 50,
    researchMethods: [
      {
        id: 'rm-p1-1',
        method: 'AI_EXPLORATION',
        status: 'not-started',
        progress: 0,
        completedAt: null,
        artifactsCount: 0
      },
      {
        id: 'rm-p1-2',
        method: 'INTERVIEWS',
        status: 'completed',
        progress: 100,
        completedAt: '2025-01-15',
        artifactsCount: 8
      },
      {
        id: 'rm-p1-3',
        method: 'QUESTIONNAIRE',
        status: 'in-progress',
        progress: 65,
        completedAt: null,
        artifactsCount: 3
      },
      {
        id: 'rm-p1-4',
        method: 'USER_TESTING',
        status: 'not-started',
        progress: 0,
        completedAt: null,
        artifactsCount: 0
      }
    ],
    createdBy: { name: 'Erik Jager', avatarUrl: null },
    createdAt: '2024-12-01',
    updatedAt: '2025-01-15'
  },
  {
    id: 'persona-2',
    name: 'Marcus the Marketing Director',
    tagline: 'Experienced CMO at mid-size tech company',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    avatarSource: 'MANUAL_URL',
    age: '40-50',
    gender: null,
    location: 'London, UK',
    occupation: 'Chief Marketing Officer',
    education: "Master's in Marketing",
    income: '€100k-€150k',
    familyStatus: 'Married, 2 children',
    personalityType: 'Strategic, diplomatic, results-oriented, collaborative',
    coreValues: ['Data', 'Innovation', 'Team success', 'Accountability'],
    interests: ['Marketing trends', 'Brand strategy', 'Leadership', 'Analytics'],
    goals: [
      'Rebrand company to compete with enterprise players',
      'Increase brand awareness by 40%',
      'Align marketing with sales for better conversion',
      'Build high-performing marketing team'
    ],
    motivations: [
      'Career advancement to VP level',
      'Recognition in the industry',
      "Prove marketing's business impact",
      'Leave a legacy brand'
    ],
    frustrations: [
      'Brand inconsistency across channels',
      "Executive team doesn't understand marketing ROI",
      'Limited resources compared to competitors',
      'Outdated brand positioning'
    ],
    behaviors: [
      'Data-driven decision making',
      'Delegates execution, focuses on strategy',
      'Attends marketing conferences',
      'Networks with other CMOs',
      'Prefers agencies with proven track record'
    ],
    strategicImplications: null,
    isLocked: false,
    lockedBy: null,
    lockedAt: null,
    validationPercentage: 50,
    researchMethods: [
      {
        id: 'rm-p2-1',
        method: 'AI_EXPLORATION',
        status: 'not-started',
        progress: 0,
        completedAt: null,
        artifactsCount: 0
      },
      {
        id: 'rm-p2-2',
        method: 'INTERVIEWS',
        status: 'completed',
        progress: 100,
        completedAt: '2025-01-15',
        artifactsCount: 8
      },
      {
        id: 'rm-p2-3',
        method: 'QUESTIONNAIRE',
        status: 'in-progress',
        progress: 65,
        completedAt: null,
        artifactsCount: 3
      },
      {
        id: 'rm-p2-4',
        method: 'USER_TESTING',
        status: 'not-started',
        progress: 0,
        completedAt: null,
        artifactsCount: 0
      }
    ],
    createdBy: { name: 'Erik Jager', avatarUrl: null },
    createdAt: '2024-12-10',
    updatedAt: '2025-01-10'
  },
  {
    id: 'persona-3',
    name: 'Lisa the Freelance Designer',
    tagline: 'Independent brand designer for small businesses',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    avatarSource: 'MANUAL_URL',
    age: '25-32',
    gender: null,
    location: 'Berlin, Germany',
    occupation: 'Freelance Brand Designer',
    education: 'Bachelor in Graphic Design',
    income: '€35k-€50k',
    familyStatus: 'In a relationship, no children',
    personalityType: 'Creative, empathetic, detail-oriented, independent',
    coreValues: ['Creativity', 'Quality', 'Flexibility', 'Continuous learning'],
    interests: ['Design trends', 'Brand strategy', 'Entrepreneurship', 'Creative tools'],
    goals: [
      'Offer more strategic services to clients',
      'Increase project rates',
      'Build recurring revenue streams',
      'Establish thought leadership'
    ],
    motivations: [
      'Creative freedom and flexibility',
      'Help small businesses succeed',
      'Continuous learning and growth',
      'Work-life balance'
    ],
    frustrations: [
      'Clients undervalue strategic work',
      'Difficult to scale freelance business',
      'Time spent on client education',
      'Inconsistent project pipeline'
    ],
    behaviors: [
      'Active in design communities',
      'Shares work on Instagram and Behance',
      'Takes online courses regularly',
      'Prefers affordable, easy-to-use tools',
      'Word-of-mouth for finding new tools'
    ],
    strategicImplications: null,
    isLocked: false,
    lockedBy: null,
    lockedAt: null,
    validationPercentage: 25,
    researchMethods: [
      {
        id: 'rm-p3-1',
        method: 'AI_EXPLORATION',
        status: 'not-started',
        progress: 0,
        completedAt: null,
        artifactsCount: 0
      },
      {
        id: 'rm-p3-2',
        method: 'INTERVIEWS',
        status: 'in-progress',
        progress: 30,
        completedAt: null,
        artifactsCount: 3
      },
      {
        id: 'rm-p3-3',
        method: 'QUESTIONNAIRE',
        status: 'not-started',
        progress: 0,
        completedAt: null,
        artifactsCount: 0
      }
    ],
    createdBy: { name: 'Erik Jager', avatarUrl: null },
    createdAt: '2025-01-05',
    updatedAt: '2025-01-18'
  }
];
