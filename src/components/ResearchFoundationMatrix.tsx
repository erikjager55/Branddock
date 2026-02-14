import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { UnlockMethodDialog } from './UnlockMethodDialog';
import { 
  CheckCircle, 
  Circle, 
  ChevronDown,
  ChevronRight,
  Briefcase,
  MessageSquare,
  ClipboardList,
  Bot,
  Palette,
  Users,
  TrendingUp,
  Package,
  BookOpen,
  Sparkles,
  Target,
  Heart,
  Award,
  Lock,
  Unlock,
  Clock,
  PlayCircle,
  ShoppingCart,
  AlertCircle,
  Info
} from 'lucide-react';

// Validation Method Type
interface ResearchMethod {
  id: string;
  name: string;
  icon: any;
  status: 'completed' | 'in-progress' | 'available' | 'locked';
  isRecommended?: boolean;
  completedAt?: string;
  progress?: number;
}

// Asset Type
interface Asset {
  id: string;
  name: string;
  description: string;
  methods: ResearchMethod[];
  isCritical?: boolean;
  overallStatus: 'completed' | 'in-progress' | 'not-started' | 'locked';
  completionPercentage: number;
}

// Category Type
interface Category {
  id: string;
  name: string;
  icon: any;
  color: string;
  assets: Asset[];
  status: 'completed' | 'in-progress' | 'not-started' | 'locked';
}

// Foundation Type
interface Foundation {
  id: string;
  name: string;
  description: string;
  categories: Category[];
  status: 'completed' | 'in-progress' | 'not-started' | 'locked';
  isPurchased: boolean;
}

// Mock data with realistic statuses - simulating that "Your Brand" is purchased
export const foundationMatrix: Foundation[] = [
  {
    id: 'your-brand',
    name: 'Your Brand',
    description: 'Core brand identity and positioning elements',
    isPurchased: true,
    status: 'in-progress',
    categories: [
      {
        id: 'foundation',
        name: 'Foundation',
        icon: Award,
        color: 'purple',
        status: 'in-progress',
        assets: [
          {
            id: 'golden-circle',
            name: 'Golden Circle',
            description: 'Why, How, What framework',
            isCritical: true,
            overallStatus: 'in-progress',
            completionPercentage: 75,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'completed', isRecommended: true, completedAt: '2025-01-15' },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'completed', completedAt: '2025-01-18' },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'in-progress', progress: 60 },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'completed', completedAt: '2025-01-12' },
            ]
          },
          {
            id: 'core-values',
            name: 'Core Values',
            description: 'Fundamental beliefs and principles',
            isCritical: true,
            overallStatus: 'completed',
            completionPercentage: 100,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'completed', isRecommended: true, completedAt: '2025-01-10' },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'completed', completedAt: '2025-01-12' },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'completed', completedAt: '2025-01-14' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'completed', completedAt: '2025-01-08' },
            ]
          },
          {
            id: 'brand-purpose',
            name: 'Brand Purpose',
            description: 'The reason your brand exists',
            isCritical: true,
            overallStatus: 'not-started',
            completionPercentage: 0,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'available', isRecommended: true },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'available' },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'available' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'available' },
            ]
          },
        ]
      },
      {
        id: 'strategy',
        name: 'Strategy',
        icon: Target,
        color: 'blue',
        status: 'in-progress',
        assets: [
          {
            id: 'vision-statement',
            name: 'Vision Statement',
            description: 'Future aspirational state',
            isCritical: true,
            overallStatus: 'completed',
            completionPercentage: 100,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'completed', isRecommended: true, completedAt: '2025-01-20' },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'completed', completedAt: '2025-01-22' },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'completed', completedAt: '2025-01-24' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'completed', completedAt: '2025-01-18' },
            ]
          },
          {
            id: 'mission-statement',
            name: 'Mission Statement',
            description: 'Current operational purpose',
            isCritical: true,
            overallStatus: 'in-progress',
            completionPercentage: 50,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'completed', isRecommended: true, completedAt: '2025-01-16' },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'in-progress', progress: 40 },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'available' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'available' },
            ]
          },
          {
            id: 'positioning-statement',
            name: 'Positioning Statement',
            description: 'Unique market position',
            isCritical: true,
            overallStatus: 'not-started',
            completionPercentage: 0,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'available' },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'available', isRecommended: true },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'available' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'available' },
            ]
          },
          {
            id: 'value-proposition',
            name: 'Value Proposition',
            description: 'Customer value delivery promise',
            isCritical: true,
            overallStatus: 'not-started',
            completionPercentage: 0,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'available' },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'available', isRecommended: true },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'available' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'available' },
            ]
          },
        ]
      },
      {
        id: 'personality',
        name: 'Personality',
        icon: Heart,
        color: 'pink',
        status: 'not-started',
        assets: [
          {
            id: 'brand-archetype',
            name: 'Brand Archetype',
            description: 'Archetypal brand personality',
            overallStatus: 'not-started',
            completionPercentage: 0,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'available', isRecommended: true },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'available' },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'available' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'available' },
            ]
          },
          {
            id: 'voice-tone',
            name: 'Voice & Tone',
            description: 'Communication style guidelines',
            overallStatus: 'not-started',
            completionPercentage: 0,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'available' },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'available', isRecommended: true },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'available' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'available' },
            ]
          },
          {
            id: 'personality-traits',
            name: 'Personality Traits',
            description: 'Key brand characteristics',
            overallStatus: 'not-started',
            completionPercentage: 0,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'available', isRecommended: true },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'available' },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'available' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'available' },
            ]
          },
        ]
      },
    ]
  },
  {
    id: 'personas',
    name: 'Personas',
    description: 'Target audience and customer profiles',
    isPurchased: false,
    status: 'locked',
    categories: [
      {
        id: 'demographics',
        name: 'Demographics',
        icon: Users,
        color: 'blue',
        status: 'locked',
        assets: [
          {
            id: 'age-gender',
            name: 'Age & Gender',
            description: 'Basic demographic information',
            isCritical: true,
            overallStatus: 'locked',
            completionPercentage: 0,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'locked' },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'locked' },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'locked', isRecommended: true },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'locked' },
            ]
          },
          {
            id: 'location-education',
            name: 'Location & Education',
            description: 'Geographic and educational background',
            overallStatus: 'locked',
            completionPercentage: 0,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'locked' },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'locked' },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'locked', isRecommended: true },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'locked' },
            ]
          },
        ]
      },
      {
        id: 'psychographics',
        name: 'Psychographics',
        icon: Heart,
        color: 'pink',
        status: 'locked',
        assets: [
          {
            id: 'values-beliefs',
            name: 'Values & Beliefs',
            description: 'Core values and belief systems',
            isCritical: true,
            overallStatus: 'locked',
            completionPercentage: 0,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'locked' },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'locked', isRecommended: true },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'locked' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'locked' },
            ]
          },
          {
            id: 'motivations-goals',
            name: 'Motivations & Goals',
            description: 'What drives behavior and decisions',
            isCritical: true,
            overallStatus: 'locked',
            completionPercentage: 0,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'locked' },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'locked', isRecommended: true },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'locked' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'locked' },
            ]
          },
        ]
      },
    ]
  },
  {
    id: 'market-trends',
    name: 'Market & Trends',
    description: 'Market intelligence and trend analysis',
    isPurchased: false,
    status: 'locked',
    categories: [
      {
        id: 'market-analysis',
        name: 'Market Analysis',
        icon: TrendingUp,
        color: 'blue',
        status: 'locked',
        assets: [
          {
            id: 'market-size',
            name: 'Market Size & Growth',
            description: 'Total addressable market metrics',
            isCritical: true,
            overallStatus: 'locked',
            completionPercentage: 0,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'locked' },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'locked' },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'locked' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'locked', isRecommended: true },
            ]
          },
          {
            id: 'competitive-landscape',
            name: 'Competitive Landscape',
            description: 'Competitor analysis and positioning',
            isCritical: true,
            overallStatus: 'locked',
            completionPercentage: 0,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'locked' },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'locked' },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'locked' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'locked', isRecommended: true },
            ]
          },
        ]
      },
    ]
  },
  {
    id: 'products-services',
    name: 'Products & Services',
    description: 'Offering portfolio and innovation',
    isPurchased: false,
    status: 'locked',
    categories: [
      {
        id: 'current-offerings',
        name: 'Current Offerings',
        icon: Package,
        color: 'blue',
        status: 'locked',
        assets: [
          {
            id: 'product-portfolio',
            name: 'Product Portfolio',
            description: 'Current product/service lineup',
            isCritical: true,
            overallStatus: 'locked',
            completionPercentage: 0,
            methods: [
              { id: 'workshop', name: 'Workshop', icon: Briefcase, status: 'locked', isRecommended: true },
              { id: 'interviews', name: 'Interviews', icon: MessageSquare, status: 'locked' },
              { id: 'questionnaire', name: 'Survey', icon: ClipboardList, status: 'locked' },
              { id: 'ai-agent', name: 'AI Analysis', icon: Bot, status: 'locked' },
            ]
          },
        ]
      },
    ]
  },
];

interface ResearchFoundationMatrixProps {
  bundles?: any[];
  onSelectBundle?: (bundle: any) => void;
  onPurchaseFoundation?: (foundationId: string) => void;
}

export function ResearchFoundationMatrix({ 
  bundles, 
  onSelectBundle,
  onPurchaseFoundation 
}: ResearchFoundationMatrixProps) {
  const [expandedFoundations, setExpandedFoundations] = useState<Set<string>>(new Set(['your-brand']));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['foundation', 'strategy']));
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [selectedUnlockInfo, setSelectedUnlockInfo] = useState<{
    methodName: string;
    assetName: string;
    foundationId: string;
    foundationName: string;
  } | null>(null);

  const handleUnlockClick = (methodName: string, assetName: string, foundationId: string, foundationName: string) => {
    setSelectedUnlockInfo({ methodName, assetName, foundationId, foundationName });
    setUnlockDialogOpen(true);
  };

  const handlePurchaseFromDialog = (bundleId: string) => {
    // Trigger purchase flow
    onPurchaseFoundation?.(bundleId);
    setUnlockDialogOpen(false);
  };

  // Get bundle info for a foundation
  const getBundleInfo = (foundationId: string) => {
    const bundleData: Record<string, any> = {
      'personas': {
        id: 'personas-bundle',
        name: 'Personas Research Bundle',
        price: 4500,
        originalPrice: 6000,
        discount: 25,
        assetsIncluded: 8,
        strategyToolsUnlocked: 5,
        timeline: '3-4 weeks',
        icon: Users,
        color: 'blue',
      },
      'market-trends': {
        id: 'market-trends-bundle',
        name: 'Market & Trends Bundle',
        price: 5500,
        originalPrice: 7500,
        discount: 27,
        assetsIncluded: 6,
        strategyToolsUnlocked: 4,
        timeline: '2-3 weeks',
        icon: TrendingUp,
        color: 'green',
      },
      'products-services': {
        id: 'products-services-bundle',
        name: 'Products & Services Bundle',
        price: 3500,
        originalPrice: 5000,
        discount: 30,
        assetsIncluded: 6,
        strategyToolsUnlocked: 3,
        timeline: '2-3 weeks',
        icon: Package,
        color: 'purple',
      },
    };

    return bundleData[foundationId] || {
      id: foundationId + '-bundle',
      name: 'Research Bundle',
      price: 4000,
      originalPrice: 5500,
      discount: 25,
      assetsIncluded: 5,
      strategyToolsUnlocked: 3,
      timeline: '2-3 weeks',
      icon: Package,
      color: 'blue',
    };
  };

  const toggleFoundation = (id: string) => {
    const newExpanded = new Set(expandedFoundations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFoundations(newExpanded);
  };

  const toggleCategory = (id: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'in-progress':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        );
      case 'not-started':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <PlayCircle className="w-3 h-3 mr-1" />
            Ready to Start
          </Badge>
        );
      case 'locked':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
            <Lock className="w-3 h-3 mr-1" />
            Locked
          </Badge>
        );
      default:
        return null;
    }
  };

  const getMethodStatusDisplay = (method: ResearchMethod, asset: Asset, foundation: Foundation) => {
    const MethodIcon = method.icon;
    
    switch (method.status) {
      case 'completed':
        return (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border-2 border-green-500 text-green-700">
            <MethodIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{method.name}</span>
            <CheckCircle className="w-4 h-4 ml-auto fill-current" />
          </div>
        );
      case 'in-progress':
        return (
          <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-blue-50 border-2 border-blue-500">
            <div className="flex items-center gap-2">
              <MethodIcon className="w-4 h-4 text-blue-700" />
              <span className="text-sm font-medium text-blue-700">{method.name}</span>
              <Clock className="w-4 h-4 ml-auto text-blue-700" />
            </div>
            {method.progress !== undefined && (
              <div className="flex items-center gap-2">
                <Progress value={method.progress} className="flex-1 h-1.5" />
                <span className="text-xs text-blue-600 font-medium">{method.progress}%</span>
              </div>
            )}
          </div>
        );
      case 'available':
        return (
          <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border-2 border-primary/40 hover:border-primary hover:bg-primary/10 transition-all group shadow-sm hover:shadow-md">
            <div className={`p-1.5 rounded ${method.isRecommended ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
              <MethodIcon className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">{method.name}</span>
            {method.isRecommended && (
              <Badge className="ml-auto text-xs bg-amber-500 text-white border-amber-600 shadow-sm">
                ⭐ Recommended
              </Badge>
            )}
            <PlayCircle className="w-5 h-5 text-primary ml-auto group-hover:scale-110 transition-transform" />
          </button>
        );
      case 'locked':
        return (
          <button 
            onClick={() => handleUnlockClick(method.name, asset.name, foundation.id, foundation.name)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 border-2 border-gray-300 hover:border-gray-400 cursor-pointer relative group transition-all"
          >
            <div className="absolute inset-0 bg-gray-200/50 rounded-lg flex items-center justify-center group-hover:bg-gray-300/50 transition-colors">
              <div className="flex flex-col items-center gap-1">
                <Lock className="w-6 h-6 text-gray-500 group-hover:text-gray-600 transition-colors" />
                <span className="text-xs font-medium text-gray-600 group-hover:text-gray-700">Click to unlock</span>
              </div>
            </div>
            <MethodIcon className="w-4 h-4 text-gray-400 opacity-50" />
            <span className="text-sm font-medium text-gray-400 opacity-50">{method.name}</span>
            {method.isRecommended && (
              <Badge variant="outline" className="ml-auto text-xs bg-gray-200 text-gray-500 border-gray-300 opacity-50">
                Recommended
              </Badge>
            )}
          </button>
        );
      default:
        return null;
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAssets = foundationMatrix.reduce((acc, foundation) => 
      acc + foundation.categories.reduce((catAcc, cat) => catAcc + cat.assets.length, 0), 0);
    
    const completedAssets = foundationMatrix.reduce((acc, foundation) => 
      acc + foundation.categories.reduce((catAcc, cat) => 
        catAcc + cat.assets.filter(a => a.overallStatus === 'completed').length, 0), 0);
    
    const inProgressAssets = foundationMatrix.reduce((acc, foundation) => 
      acc + foundation.categories.reduce((catAcc, cat) => 
        catAcc + cat.assets.filter(a => a.overallStatus === 'in-progress').length, 0), 0);
    
    const lockedAssets = foundationMatrix.reduce((acc, foundation) => 
      acc + foundation.categories.reduce((catAcc, cat) => 
        catAcc + cat.assets.filter(a => a.overallStatus === 'locked').length, 0), 0);

    return { totalAssets, completedAssets, inProgressAssets, lockedAssets };
  }, []);

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.completedAssets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgressAssets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <PlayCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-muted-foreground">Available</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {stats.totalAssets - stats.completedAssets - stats.inProgressAssets - stats.lockedAssets}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-muted-foreground">Locked</span>
            </div>
            <p className="text-2xl font-bold text-gray-500">{stats.lockedAssets}</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold mb-3">Status Guide</h4>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-green-700">Completed:</strong>
                    <span className="text-muted-foreground ml-1">Research method finished and validated</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-blue-700">In Progress:</strong>
                    <span className="text-muted-foreground ml-1">Currently being executed</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <PlayCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-amber-700">Ready to Start:</strong>
                    <span className="text-muted-foreground ml-1">Click to begin research</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-gray-700">Locked:</strong>
                    <span className="text-muted-foreground ml-1">Purchase bundle to unlock</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Foundation Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Research Foundation Matrix</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete hierarchical view of all research capabilities
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {foundationMatrix.map((foundation) => (
            <div key={foundation.id} className={`border-2 rounded-lg overflow-hidden ${
              foundation.isPurchased ? 'border-primary/30' : 'border-gray-200'
            }`}>
              {/* Foundation Level */}
              <div className={`${
                foundation.isPurchased ? 'bg-primary/5' : 'bg-gray-50/50'
              }`}>
                <button
                  onClick={() => toggleFoundation(foundation.id)}
                  className="w-full px-4 py-3 hover:bg-accent/20 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    {expandedFoundations.has(foundation.id) ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div className="flex items-center gap-2">
                      {foundation.isPurchased ? (
                        <Unlock className="w-5 h-5 text-primary" />
                      ) : (
                        <Lock className="w-5 h-5 text-gray-400" />
                      )}
                      <h3 className="font-semibold text-lg">{foundation.name}</h3>
                    </div>
                    {getStatusBadge(foundation.status)}
                    <Badge variant="outline" className="text-xs">
                      {foundation.categories.reduce((acc, cat) => acc + cat.assets.length, 0)} assets
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground hidden md:block">{foundation.description}</p>
                    {!foundation.isPurchased && (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPurchaseFoundation?.(foundation.id);
                        }}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Purchase Bundle
                      </Button>
                    )}
                  </div>
                </button>
              </div>

              {/* Categories */}
              {expandedFoundations.has(foundation.id) && (
                <div className="divide-y bg-background">
                  {foundation.categories.map((category) => {
                    const CategoryIcon = category.icon;
                    
                    return (
                      <div key={category.id}>
                        {/* Category Level */}
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="w-full px-6 py-3 hover:bg-accent/50 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            {expandedCategories.has(category.id) ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <div className={`p-2 rounded-lg bg-${category.color}-50 border border-${category.color}-200`}>
                              <CategoryIcon className={`w-4 h-4 text-${category.color}-600`} />
                            </div>
                            <span className="font-medium">{category.name}</span>
                            {getStatusBadge(category.status)}
                            <Badge variant="outline" className="text-xs">
                              {category.assets.length} assets
                            </Badge>
                          </div>
                        </button>

                        {/* Assets */}
                        {expandedCategories.has(category.id) && (
                          <div className="px-6 pb-4 space-y-3 bg-muted/20">
                            {category.assets.map((asset) => (
                              <div
                                key={asset.id}
                                className={`ml-6 p-4 rounded-lg border-2 ${
                                  asset.overallStatus === 'locked' 
                                    ? 'bg-gray-50/50 border-gray-200'
                                    : 'bg-card border-border hover:border-primary/50'
                                } transition-all`}
                              >
                                {/* Asset Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold">{asset.name}</h4>
                                      {asset.isCritical && (
                                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                          <AlertCircle className="w-3 h-3 mr-1" />
                                          Critical
                                        </Badge>
                                      )}
                                      {getStatusBadge(asset.overallStatus)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{asset.description}</p>
                                  </div>
                                  {asset.overallStatus !== 'locked' && (
                                    <div className="text-right ml-4">
                                      <div className="text-2xl font-bold text-primary mb-1">
                                        {asset.completionPercentage}%
                                      </div>
                                      <Progress value={asset.completionPercentage} className="w-24 h-2" />
                                    </div>
                                  )}
                                </div>

                                {/* Research Methods Grid */}
                                <div className="grid md:grid-cols-2 gap-2">
                                  {asset.methods.map((method) => (
                                    <div key={method.id}>
                                      {getMethodStatusDisplay(method, asset, foundation)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Unlock Method Dialog */}
      {unlockDialogOpen && selectedUnlockInfo && (
        <UnlockMethodDialog
          open={unlockDialogOpen}
          onClose={() => setUnlockDialogOpen(false)}
          onPurchase={handlePurchaseFromDialog}
          methodName={selectedUnlockInfo.methodName}
          assetName={selectedUnlockInfo.assetName}
          foundationId={selectedUnlockInfo.foundationId}
          foundationName={selectedUnlockInfo.foundationName}
          bundleInfo={getBundleInfo(selectedUnlockInfo.foundationId)}
        />
      )}
    </div>
  );
}