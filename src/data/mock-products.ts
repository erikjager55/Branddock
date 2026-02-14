export interface Product {
  id: string;
  name: string;
  category: 'product' | 'service';
  description: string;
  price?: string;
  features?: string[];
  targetAudience?: string;
}

export const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Premium Software Suite',
    category: 'product',
    description: 'Comprehensive business management software with AI-powered insights',
    price: '$99/month',
    features: ['Analytics Dashboard', 'Team Collaboration', 'AI Assistant', 'Mobile Apps'],
    targetAudience: 'Small to medium businesses'
  },
  {
    id: 'prod-2',
    name: 'Marketing Automation Platform',
    category: 'product',
    description: 'All-in-one marketing automation with email, social, and campaign management',
    price: '$149/month',
    features: ['Email Marketing', 'Social Media Scheduling', 'Campaign Analytics', 'A/B Testing'],
    targetAudience: 'Marketing teams and agencies'
  },
  {
    id: 'prod-3',
    name: 'Enterprise Consulting Services',
    category: 'service',
    description: 'Strategic business consulting for digital transformation',
    price: 'Custom pricing',
    features: ['Strategy Development', 'Implementation Support', 'Training Programs', 'Ongoing Advisory'],
    targetAudience: 'Enterprise organizations'
  },
  {
    id: 'prod-4',
    name: 'E-Learning Platform',
    category: 'product',
    description: 'Interactive online learning platform with certification programs',
    price: '$49/user/month',
    features: ['Course Creation', 'Progress Tracking', 'Certifications', 'Mobile Learning'],
    targetAudience: 'Educational institutions and corporates'
  },
  {
    id: 'prod-5',
    name: 'Brand Development Workshop',
    category: 'service',
    description: '2-day intensive workshop for brand strategy and positioning',
    price: '$5,000',
    features: ['Brand Audit', 'Strategy Session', 'Positioning Framework', 'Action Plan'],
    targetAudience: 'Startups and growing companies'
  }
];
