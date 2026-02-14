export interface KnowledgeResource {
  // Basic Info
  id: string;
  type: 'book' | 'video' | 'website' | 'image' | 'document' | 'podcast' | 'article' | 'course';
  title: string;
  description: string;
  author: string;
  
  // Categorization
  category: string;
  tags: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  
  // Media
  url: string;
  thumbnail?: string;
  fileSize?: string;
  format?: string; // PDF, MP4, EPUB, etc.
  
  // Metadata
  publicationDate?: string;
  isbn?: string;
  estimatedDuration?: string;
  pageCount?: number;
  
  // Ratings & Quality
  rating: number;
  reviewCount?: number;
  qualityScore?: number;
  
  // Status
  status: 'available' | 'archived' | 'pending' | 'unavailable';
  dateAdded: string;
  dateUpdated?: string;
  addedBy?: string;
  
  // Progress & Engagement
  views?: number;
  favorites?: number;
  completions?: number;
  
  // Relations
  relatedTrends?: string[];
  relatedPersonas?: string[];
  relatedAssets?: string[];
  relatedResources?: string[];
  collectionIds?: string[];
  
  // AI & Smart Features
  aiSummary?: string;
  aiKeyTakeaways?: string[];
  
  // User specific (would come from context in real app)
  isFavorite?: boolean;
  readingProgress?: number; // 0-100
  personalNotes?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  resourceIds: string[];
  type: 'learning-path' | 'research-bundle' | 'custom';
  order?: number;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  tags?: string[];
  color?: string;
}

export interface ReadingProgress {
  resourceId: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed';
  timeSpent: number;
  lastAccessed: string;
  notes?: string;
  bookmarks?: number[];
}

export const mockKnowledgeResources: KnowledgeResource[] = [
  {
    id: 'kr-1',
    type: 'book',
    title: 'Building Better Brands',
    description: 'Comprehensive guide to modern brand strategy and implementation in the digital age. Covers everything from brand positioning to visual identity systems.',
    author: 'Sarah Johnson',
    category: 'Brand Strategy',
    tags: ['Branding', 'Strategy', 'Digital', 'Marketing'],
    difficulty: 'intermediate',
    language: 'en',
    url: 'https://example.com/book',
    isbn: '978-1234567890',
    estimatedDuration: '6 hours',
    pageCount: 320,
    rating: 4.8,
    reviewCount: 234,
    qualityScore: 92,
    status: 'available',
    dateAdded: '2024-07-20',
    views: 1250,
    favorites: 89,
    completions: 45,
    relatedTrends: ['trend-1', 'trend-2'],
    aiSummary: 'Essential guide covering brand strategy fundamentals, positioning frameworks, and practical implementation steps for digital-first brands.',
    aiKeyTakeaways: [
      'Brand positioning requires deep customer understanding',
      'Visual consistency drives brand recognition',
      'Digital channels demand adaptive brand strategies'
    ],
    publicationDate: '2024-01-15'
  },
  {
    id: 'kr-2',
    type: 'video',
    title: 'The Future of Digital Marketing',
    description: 'Expert panel discussion on emerging trends in digital marketing and customer engagement. Features insights from leading CMOs and marketing technologists.',
    author: 'Marketing Summit 2025',
    category: 'Marketing',
    tags: ['Digital Marketing', 'Trends', 'Customer Engagement', 'AI'],
    difficulty: 'intermediate',
    language: 'en',
    url: 'https://youtube.com/watch?v=example',
    estimatedDuration: '45 minutes',
    format: 'MP4',
    rating: 4.6,
    reviewCount: 567,
    qualityScore: 88,
    status: 'available',
    dateAdded: '2024-12-19',
    views: 3420,
    favorites: 234,
    completions: 198,
    relatedTrends: ['trend-3', 'trend-4'],
    aiSummary: 'Panel discussion exploring AI-driven marketing, personalization at scale, and the evolving role of data privacy in customer engagement.',
    aiKeyTakeaways: [
      'AI is transforming customer personalization',
      'Privacy-first marketing is becoming essential',
      'Omnichannel experiences drive engagement'
    ],
    publicationDate: '2024-11-10'
  },
  {
    id: 'kr-3',
    type: 'website',
    title: 'Design System Gallery',
    description: 'Curated collection of best-in-class design systems from leading technology companies. Includes component libraries, design tokens, and documentation.',
    author: 'DesignSystems.com',
    category: 'Design',
    tags: ['Design Systems', 'UI/UX', 'Best Practices', 'Components'],
    difficulty: 'advanced',
    language: 'en',
    url: 'https://designsystems.com',
    estimatedDuration: '2 hours',
    rating: 4.9,
    reviewCount: 892,
    qualityScore: 95,
    status: 'available',
    dateAdded: '2024-12-18',
    views: 5670,
    favorites: 445,
    relatedTrends: ['trend-5'],
    aiSummary: 'Comprehensive gallery showcasing production design systems from companies like Airbnb, Shopify, and IBM with detailed documentation.',
    aiKeyTakeaways: [
      'Consistency is key in design systems',
      'Documentation drives adoption',
      'Tokens enable scalable theming'
    ],
    publicationDate: '2024-06-01'
  },
  {
    id: 'kr-4',
    type: 'document',
    title: 'AI Implementation Guide',
    description: 'Step-by-step guide for implementing AI solutions in business processes and customer experiences. Includes case studies, technical requirements, and ROI frameworks.',
    author: 'TechStrategy Inc.',
    category: 'Technology',
    tags: ['AI', 'Implementation', 'Business Strategy', 'Automation'],
    difficulty: 'advanced',
    language: 'en',
    url: '/documents/ai-implementation-guide.pdf',
    format: 'PDF',
    fileSize: '4.2 MB',
    estimatedDuration: '3 hours',
    pageCount: 87,
    rating: 4.7,
    reviewCount: 156,
    qualityScore: 90,
    status: 'available',
    dateAdded: '2024-12-17',
    views: 890,
    favorites: 123,
    completions: 67,
    aiSummary: 'Practical guide covering AI strategy, vendor selection, implementation roadmaps, and change management for enterprise AI adoption.',
    aiKeyTakeaways: [
      'Start with clear business objectives',
      'Data quality is critical for AI success',
      'Change management drives adoption'
    ],
    publicationDate: '2024-09-15'
  },
  {
    id: 'kr-5',
    type: 'article',
    title: 'Brand Color Psychology Deep Dive',
    description: 'In-depth exploration of color psychology and its impact on brand perception and consumer behavior. Backed by neuroscience research and A/B testing data.',
    author: 'Visual Brand Lab',
    category: 'Brand Psychology',
    tags: ['Color Psychology', 'Branding', 'Research', 'Neuroscience'],
    difficulty: 'beginner',
    language: 'en',
    url: 'https://medium.com/visual-brand-lab/color-psychology',
    estimatedDuration: '15 minutes',
    rating: 4.5,
    reviewCount: 234,
    qualityScore: 85,
    status: 'available',
    dateAdded: '2024-12-16',
    views: 2340,
    favorites: 189,
    completions: 156,
    relatedTrends: ['trend-1'],
    aiSummary: 'Research-backed article explaining how different colors influence emotions, purchase decisions, and brand recall.',
    aiKeyTakeaways: [
      'Colors evoke specific emotional responses',
      'Cultural context affects color perception',
      'Consistency in color usage builds recognition'
    ],
    publicationDate: '2024-10-05'
  },
  {
    id: 'kr-6',
    type: 'video',
    title: 'Customer Journey Mapping Workshop',
    description: 'Interactive workshop on creating effective customer journey maps for better user experiences. Includes templates, real-world examples, and facilitation tips.',
    author: 'UX Masters',
    category: 'User Experience',
    tags: ['Customer Journey', 'UX', 'Workshop', 'Mapping'],
    difficulty: 'intermediate',
    language: 'en',
    url: 'https://vimeo.com/example',
    estimatedDuration: '90 minutes',
    format: 'MP4',
    rating: 4.8,
    reviewCount: 345,
    qualityScore: 91,
    status: 'available',
    dateAdded: '2024-12-15',
    views: 1890,
    favorites: 167,
    completions: 98,
    relatedPersonas: ['persona-1', 'persona-2'],
    aiSummary: 'Hands-on workshop teaching journey mapping methodology, stakeholder alignment, and actionable insights extraction.',
    aiKeyTakeaways: [
      'Journey maps reveal pain points and opportunities',
      'Stakeholder alignment is crucial',
      'Maps should drive actionable improvements'
    ],
    publicationDate: '2024-08-20'
  },
  {
    id: 'kr-7',
    type: 'course',
    title: 'Data-Driven Marketing Masterclass',
    description: 'Complete course on leveraging analytics and data science for marketing optimization. Covers attribution modeling, predictive analytics, and campaign optimization.',
    author: 'DataMarketing Academy',
    category: 'Marketing',
    tags: ['Analytics', 'Data Science', 'Marketing', 'Attribution', 'ROI'],
    difficulty: 'advanced',
    language: 'en',
    url: 'https://academy.datamarketing.com/masterclass',
    estimatedDuration: '12 hours',
    rating: 4.9,
    reviewCount: 678,
    qualityScore: 96,
    status: 'available',
    dateAdded: '2024-12-10',
    views: 4560,
    favorites: 567,
    completions: 234,
    relatedTrends: ['trend-3'],
    aiSummary: 'Comprehensive course teaching advanced analytics techniques for marketing measurement, optimization, and predictive modeling.',
    aiKeyTakeaways: [
      'Attribution models reveal true marketing impact',
      'Predictive analytics enable proactive optimization',
      'A/B testing drives continuous improvement'
    ],
    publicationDate: '2024-07-01'
  },
  {
    id: 'kr-8',
    type: 'podcast',
    title: 'The Brand Strategy Podcast',
    description: 'Weekly podcast featuring interviews with top brand strategists, CMOs, and agency leaders. Deep dives into successful brand transformations.',
    author: 'Brand Strategy Institute',
    category: 'Brand Strategy',
    tags: ['Podcast', 'Branding', 'Strategy', 'Interviews', 'Case Studies'],
    difficulty: 'beginner',
    language: 'en',
    url: 'https://podcasts.apple.com/brand-strategy',
    estimatedDuration: '45 minutes/episode',
    rating: 4.7,
    reviewCount: 1234,
    qualityScore: 89,
    status: 'available',
    dateAdded: '2024-12-05',
    views: 8900,
    favorites: 890,
    relatedTrends: ['trend-1', 'trend-2'],
    aiSummary: 'Insightful podcast series exploring brand strategy frameworks, transformation case studies, and expert perspectives.',
    aiKeyTakeaways: [
      'Brand strategy requires long-term commitment',
      'Customer insights drive effective positioning',
      'Internal alignment enables brand success'
    ],
    publicationDate: '2024-01-01'
  },
  {
    id: 'kr-9',
    type: 'book',
    title: 'The Psychology of Persuasion',
    description: 'Classic text on influence and persuasion psychology. Essential reading for marketers, designers, and business leaders.',
    author: 'Dr. Robert Cialdini',
    category: 'Psychology',
    tags: ['Psychology', 'Persuasion', 'Marketing', 'Influence', 'Behavioral Science'],
    difficulty: 'intermediate',
    language: 'en',
    url: 'https://amazon.com/psychology-persuasion',
    isbn: '978-0061241895',
    estimatedDuration: '8 hours',
    pageCount: 336,
    rating: 4.9,
    reviewCount: 5678,
    qualityScore: 98,
    status: 'available',
    dateAdded: '2024-11-20',
    views: 12340,
    favorites: 1234,
    completions: 567,
    aiSummary: 'Seminal work explaining six universal principles of influence: reciprocity, commitment, social proof, authority, liking, and scarcity.',
    aiKeyTakeaways: [
      'Six principles drive human persuasion',
      'Social proof influences decisions',
      'Reciprocity creates obligation'
    ],
    publicationDate: '1984-01-01'
  },
  {
    id: 'kr-10',
    type: 'website',
    title: 'Trend Watching Platform',
    description: 'Real-time trend intelligence platform tracking emerging consumer behaviors, technology shifts, and market movements across industries.',
    author: 'TrendWatch.io',
    category: 'Trends',
    tags: ['Trends', 'Market Intelligence', 'Consumer Behavior', 'Innovation'],
    difficulty: 'intermediate',
    language: 'en',
    url: 'https://trendwatch.io',
    estimatedDuration: 'Ongoing',
    rating: 4.6,
    reviewCount: 456,
    qualityScore: 87,
    status: 'available',
    dateAdded: '2024-11-15',
    views: 6780,
    favorites: 345,
    relatedTrends: ['trend-1', 'trend-3', 'trend-4', 'trend-5'],
    aiSummary: 'Comprehensive platform providing weekly trend reports, industry analysis, and predictive insights across multiple sectors.',
    aiKeyTakeaways: [
      'Early trend detection provides competitive advantage',
      'Cross-industry patterns reveal opportunities',
      'Consumer signals predict market shifts'
    ],
    publicationDate: '2024-01-01'
  }
];

export const mockCollections: Collection[] = [
  {
    id: 'col-1',
    name: 'Getting Started with Brand Strategy',
    description: 'Essential resources for building a strong brand foundation',
    resourceIds: ['kr-1', 'kr-5', 'kr-8'],
    type: 'learning-path',
    order: 1,
    createdAt: '2024-12-01',
    updatedAt: '2024-12-15',
    tags: ['Branding', 'Beginner'],
    color: '#3B82F6'
  },
  {
    id: 'col-2',
    name: 'Advanced UX Research Methods',
    description: 'Deep dive into customer research and journey mapping',
    resourceIds: ['kr-6', 'kr-7'],
    type: 'research-bundle',
    order: 2,
    createdAt: '2024-11-20',
    updatedAt: '2024-12-10',
    tags: ['UX', 'Research'],
    color: '#8B5CF6'
  },
  {
    id: 'col-3',
    name: 'AI in Marketing - Complete Guide',
    description: 'Everything you need to know about AI-driven marketing',
    resourceIds: ['kr-2', 'kr-4', 'kr-7'],
    type: 'learning-path',
    order: 3,
    createdAt: '2024-11-15',
    updatedAt: '2024-12-20',
    tags: ['AI', 'Marketing', 'Technology'],
    color: '#10B981'
  },
  {
    id: 'col-4',
    name: 'Design System Resources',
    description: 'Best practices and examples for building design systems',
    resourceIds: ['kr-3'],
    type: 'custom',
    createdAt: '2024-11-10',
    updatedAt: '2024-11-10',
    tags: ['Design', 'Systems'],
    color: '#F59E0B'
  }
];
