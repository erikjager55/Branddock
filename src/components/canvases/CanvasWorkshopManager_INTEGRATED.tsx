import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { 
  Presentation,
  ShoppingCart,
  Play,
  Check,
  ChevronDown,
  CheckCircle,
  Calendar,
  MoreVertical,
  FileText,
  Download,
  Clock,
  Users,
  MapPin,
  Video,
  ChevronLeft,
  ChevronRight,
  Save,
  PlayCircle,
  Trash2,
  Plus,
  Eye,
  Target,
  Heart,
  Globe,
  TrendingUp,
  Circle,
  Info,
  Package,
  Pause,
  Mail,
  ExternalLink,
  LogOut,
  Sparkles,
  AlertCircle,
  Timer,
  Tabs as TabsIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { WorkshopReport } from './WorkshopReport';
import { CanvasWorkshopInProgress } from './CanvasWorkshopInProgress';
import { CanvasWorkshopApproved } from './CanvasWorkshopApproved';

interface CanvasWorkshopManagerProps {
  onBack: () => void;
}

export function CanvasWorkshopManager({ onBack }: CanvasWorkshopManagerProps) {
  const [viewStatus, setViewStatus] = useState<'to-buy' | 'in-progress' | 'approved'>('in-progress');
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepResults, setStepResults] = useState<Record<number, string>>({});
  const [stepBackburners, setStepBackburners] = useState<Record<number, string>>({});
  const [workshopQuantity, setWorkshopQuantity] = useState(1);
  const [purchasedWorkshops, setPurchasedWorkshops] = useState(3); // Total workshops bought
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [includeFacilitator, setIncludeFacilitator] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'custom' | 'bundle'>('custom');
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [showImpactPreview, setShowImpactPreview] = useState(false);
  const [showBundleConfirmation, setShowBundleConfirmation] = useState(false);
  const [pendingBundle, setPendingBundle] = useState<string | null>(null);
  const [savedCustomSelection, setSavedCustomSelection] = useState<string[]>([]);
  
  // Bundle deals
  const bundles = [
    {
      id: 'starter',
      name: 'Starter Bundle',
      description: 'Essential brand foundation',
      assets: ['vision-mission', 'core-values', 'golden-circle'],
      originalPrice: 1350,
      bundlePrice: 1250,
      savings: 100,
      badge: 'Most Popular'
    },
    {
      id: 'professional',
      name: 'Professional Bundle',
      description: 'Complete brand strategy',
      assets: ['vision-mission', 'core-values', 'golden-circle', 'brand-positioning', 'brand-archetype'],
      originalPrice: 1450,
      bundlePrice: 1350,
      savings: 100,
      badge: 'Best Value'
    },
    {
      id: 'complete',
      name: 'Complete Bundle',
      description: 'All brand assets covered',
      assets: ['vision-mission', 'core-values', 'golden-circle', 'brand-positioning', 'brand-archetype', 'social-relevancy', 'trends'],
      originalPrice: 1550,
      bundlePrice: 1400,
      savings: 150,
      badge: 'Comprehensive'
    }
  ];
  
  // Available brand assets with current status
  const availableAssets = [
    { id: 'vision-mission', name: 'Vision & Mission Statement', icon: Eye, type: 'Strategy', currentStatus: 'approved' as const },
    { id: 'core-values', name: 'Core Values', icon: Heart, type: 'Culture', currentStatus: 'approved' as const },
    { id: 'brand-positioning', name: 'Brand Positioning', icon: Target, type: 'Strategy', currentStatus: 'draft' as const },
    { id: 'golden-circle', name: 'Golden Circle Framework', icon: Target, type: 'Foundation', currentStatus: 'approved' as const },
    { id: 'brand-archetype', name: 'Brand Archetype', icon: Users, type: 'Personality', currentStatus: 'draft' as const },
    { id: 'social-relevancy', name: 'Social Relevancy', icon: Globe, type: 'Purpose', currentStatus: 'empty' as const },
    { id: 'trends', name: 'Market Trends', icon: TrendingUp, type: 'Context', currentStatus: 'empty' as const }
  ];
  
  // Pricing
  const pricePerWorkshop = 1200; // Base price per workshop in euros
  const pricePerAsset = 50; // Additional price per building block
  const facilitatorPrice = 350; // Price for brainstorm facilitator
  
  // Calculate price based on bundle or custom selection
  const selectedBundleData = selectedBundle ? bundles.find(b => b.id === selectedBundle) : null;
  const baseWorkshopPrice = selectedBundleData ? selectedBundleData.bundlePrice : pricePerWorkshop;
  const totalAssetPrice = selectedBundleData ? 0 : selectedAssets.length * pricePerAsset;
  const workshopSubtotal = (baseWorkshopPrice + totalAssetPrice) * workshopQuantity;
  const bundleDiscount = selectedBundleData ? selectedBundleData.savings * workshopQuantity : 0;
  const facilitatorTotal = includeFacilitator ? facilitatorPrice * workshopQuantity : 0;
  const totalPrice = workshopSubtotal + facilitatorTotal;
  
  // Scheduling state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduledWorkshops, setScheduledWorkshops] = useState<Array<{
    id: string;
    date: string;
    time: string;
    description: string;
    assets?: string[];
    hasFacilitator?: boolean;
    facilitatorName?: string;
    facilitatorEmail?: string;
    meetingLink?: string;
    approvedAt?: string;
    approvedBy?: string;
    participantCount?: number;
  }>>([
    { 
      id: '1', 
      date: '2025-01-15', 
      time: '14:00', 
      description: 'Initial brand strategy workshop with leadership team',
      assets: ['golden-circle', 'vision-mission', 'core-values'],
      hasFacilitator: true,
      facilitatorName: 'Sarah Chen',
      facilitatorEmail: 'sarah.chen@brandstrategy.com',
      meetingLink: 'https://meet.example.com/workshop-abc123'
    },
    { 
      id: '2', 
      date: '2025-01-22', 
      time: '10:00', 
      description: 'Follow-up session to refine core values and mission',
      assets: ['core-values', 'brand-positioning'],
      hasFacilitator: false
    }
  ]);
  const [newWorkshop, setNewWorkshop] = useState({
    date: '',
    time: '',
    description: ''
  });
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null);
  
  // New state for In Progress improvements
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [showCompletionPreview, setShowCompletionPreview] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [selectedAssetTab, setSelectedAssetTab] = useState<string | null>(null);
  const [assetResults, setAssetResults] = useState<Record<string, Record<number, string>>>({});
  const [assetBackburners, setAssetBackburners] = useState<Record<string, Record<number, string>>>({});
  
  const handleScheduleWorkshop = () => {
    if (newWorkshop.date && newWorkshop.time && newWorkshop.description) {
      const workshop = {
        id: Date.now().toString(),
        ...newWorkshop
      };
      setScheduledWorkshops([...scheduledWorkshops, workshop]);
      setNewWorkshop({ date: '', time: '', description: '' });
      setShowScheduleDialog(false);
    }
  };
  
  const handleDeleteWorkshop = (id: string) => {
    setScheduledWorkshops(scheduledWorkshops.filter(w => w.id !== id));
  };
  
  // Helper functions for In Progress view
  const handleSaveProgress = () => {
    setLastSavedTime(new Date());
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };
  
  const handlePauseSession = () => {
    setSessionPaused(true);
    handleSaveProgress();
  };
  
  const handleResumeSession = () => {
    setSessionPaused(false);
  };
  
  const handleSaveAndExit = () => {
    handleSaveProgress();
    // Navigate away or show confirmation
  };
  
  const getSessionDuration = () => {
    if (!sessionStartTime) return '0:00';
    const now = new Date();
    const diff = now.getTime() - sessionStartTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const formatLastSavedTime = () => {
    if (!lastSavedTime) return 'Not saved';
    const now = new Date();
    const diff = now.getTime() - lastSavedTime.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Saved just now';
    if (minutes === 1) return 'Saved 1 minute ago';
    return `Saved ${minutes} minutes ago`;
  };
  
  // Workshop steps with detailed content
  const workshopSteps = [
    {
      id: 1,
      title: 'Introduction & Warm-up',
      duration: '15 min',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
      textExplanation: 'Welcome to the Canvas Workshop! This introduction session will help participants understand the workshop objectives, get comfortable with the canvas format, and align on expected outcomes.',
      guide: [
        'Welcome participants and introduce yourself as the facilitator',
        'Explain the workshop objectives and expected outcomes',
        'Review the canvas template and its key sections',
        'Set ground rules for participation and collaboration',
        'Conduct a quick ice-breaker activity to energize the team'
      ],
      resultPrompt: 'Document key insights from the warm-up, participant expectations, and any immediate observations about team dynamics:'
    },
    {
      id: 2,
      title: 'Define the Core Purpose',
      duration: '30 min',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
      textExplanation: 'The core purpose is your "Why" - the fundamental reason your brand exists beyond making money. This step helps participants articulate the deeper meaning and impact of your organization.',
      guide: [
        'Start with Simon Sinek\'s Golden Circle framework introduction',
        'Ask participants: "Why does our organization exist?"',
        'Facilitate discussion on the impact you want to make in the world',
        'Identify patterns in responses and common themes',
        'Draft a preliminary purpose statement as a group',
        'Test the purpose statement: Does it inspire? Is it authentic?'
      ],
      resultPrompt: 'Write the core purpose statement and key supporting insights:'
    },
    {
      id: 3,
      title: 'Identify Your Unique Value',
      duration: '25 min',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
      textExplanation: 'Understanding what makes your brand unique is crucial. This step explores your competitive advantages, distinctive capabilities, and what you do differently or better than others.',
      guide: [
        'List your main competitors and their offerings',
        'Identify what you do differently from competitors',
        'Discuss your unique capabilities and strengths',
        'Explore what customers say they value most about you',
        'Map out your unique selling propositions',
        'Prioritize the top 3-5 unique value drivers'
      ],
      resultPrompt: 'Document your unique value propositions and competitive differentiators:'
    },
    {
      id: 4,
      title: 'Map Customer Segments & Needs',
      duration: '30 min',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
      textExplanation: 'Deep customer understanding is the foundation of a strong brand. This step helps identify your key customer segments, their pain points, and what they truly value.',
      guide: [
        'Brainstorm all possible customer segments you serve',
        'Select your top 3-5 priority customer segments',
        'For each segment, define their key characteristics',
        'Identify their main pain points and challenges',
        'Explore what success looks like from their perspective',
        'Map how your purpose and value connects to their needs'
      ],
      resultPrompt: 'List your key customer segments and their primary needs:'
    },
    {
      id: 5,
      title: 'Define Brand Values & Behaviors',
      duration: '25 min',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
      textExplanation: 'Brand values guide decisions and behaviors. This step establishes the core principles that define how you operate and interact with customers, partners, and each other.',
      guide: [
        'Brainstorm values that are truly important to your organization',
        'Discuss behaviors that exemplify each value',
        'Narrow down to 3-5 core values',
        'For each value, define what it means in practice',
        'Identify behaviors that would violate these values',
        'Create example scenarios where values guide decisions'
      ],
      resultPrompt: 'Write your core brand values and associated behaviors:'
    },
    {
      id: 6,
      title: 'Synthesis & Action Planning',
      duration: '20 min',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
      textExplanation: 'The final step brings everything together and creates a clear action plan. Review what you\'ve created, identify gaps, and define next steps to bring your brand canvas to life.',
      guide: [
        'Review all completed sections of the canvas together',
        'Identify any gaps or inconsistencies',
        'Discuss how different elements connect and reinforce each other',
        'Prioritize which elements need further refinement',
        'Create an action plan with owners and timelines',
        'Schedule follow-up sessions if needed',
        'Celebrate the team\'s collaborative work!'
      ],
      resultPrompt: 'Summarize key insights and next steps:'
    }
  ];

  const totalSteps = workshopSteps.length;
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
  const currentStepData = workshopSteps[currentStep - 1];

  const handleStepResultChange = (stepId: number, value: string) => {
    setStepResults(prev => ({ ...prev, [stepId]: value }));
  };

  const handleStepBackburnerChange = (stepId: number, value: string) => {
    setStepBackburners(prev => ({ ...prev, [stepId]: value }));
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStatusLabel = () => {
    switch (viewStatus) {
      case 'to-buy':
        return 'To Buy';
      case 'in-progress':
        return 'In Progress';
      case 'approved':
        return 'Approved';
    }
  };

  const getStatusIcon = () => {
    switch (viewStatus) {
      case 'to-buy':
        return <ShoppingCart className="h-5 w-5" />;
      case 'in-progress':
        return <Play className="h-5 w-5" />;
      case 'approved':
        return <Check className="h-5 w-5" />;
    }
  };

  const getStatusColor = () => {
    switch (viewStatus) {
      case 'to-buy':
        return 'text-orange-600';
      case 'in-progress':
        return 'text-blue-600';
      case 'approved':
        return 'text-green-600';
      default:
        return 'text-orange-600';
    }
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleBundleSelect = (bundleId: string) => {
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) return;

    // If expanding from fewer assets, show confirmation
    if (selectedAssets.length > 0 && selectedAssets.length < bundle.assets.length) {
      setPendingBundle(bundleId);
      setShowBundleConfirmation(true);
    } else {
      setSelectedBundle(bundleId);
      setSelectedAssets(bundle.assets);
    }
  };

  const confirmBundleSelection = () => {
    if (pendingBundle) {
      const bundle = bundles.find(b => b.id === pendingBundle);
      if (bundle) {
        setSelectedBundle(pendingBundle);
        setSelectedAssets(bundle.assets);
      }
    }
    setShowBundleConfirmation(false);
    setPendingBundle(null);
  };

  const handleModeSwitch = (mode: 'custom' | 'bundle') => {
    // Save custom selection before switching
    if (selectionMode === 'custom') {
      setSavedCustomSelection(selectedAssets);
    }
    
    // Restore custom selection when switching back
    if (mode === 'custom' && savedCustomSelection.length > 0) {
      setSelectedAssets(savedCustomSelection);
      setSelectedBundle(null);
    }
    
    setSelectionMode(mode);
  };

  const renderToBuyView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Canvas Workshop Package</CardTitle>
            <CardDescription>
              Interactive visual mapping session to explore brand concepts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">What's Included:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Professional facilitation by brand strategy experts</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Custom workshop materials and digital canvas templates</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>In-person or virtual session options</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Collaborative exercises and team alignment activities</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Digital canvas outputs and documentation</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Post-workshop summary and key insights report</span>
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <Clock className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-xs text-muted-foreground">2-3 hours</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <Users className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium">Participants</p>
                  <p className="text-xs text-muted-foreground">5-10 people</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <Video className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium">Format</p>
                  <p className="text-xs text-muted-foreground">In-person or virtual</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Asset Building Blocks Selection */}
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center">
                  <Presentation className="h-4 w-4 mr-2 text-primary" />
                  Select Brand Assets to Explore
                </CardTitle>
                <CardDescription>
                  Each selected asset will receive workshop data and change status to 'Workshop Complete'
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center space-x-2 p-1 bg-muted rounded-lg">
              <Button
                variant={selectionMode === 'bundle' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => handleModeSwitch('bundle')}
              >
                <Package className="h-4 w-4 mr-2" />
                Pre-Selected Bundles
              </Button>
              <Button
                variant={selectionMode === 'custom' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => handleModeSwitch('custom')}
              >
                Choose Individual Assets
              </Button>
            </div>
            {selectionMode === 'custom' && savedCustomSelection.length > 0 && selectedAssets.length === 0 && (
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-100">
                Your custom selection is saved—switch back to bundles anytime
              </div>
            )}

            {/* Bundle Deals View */}
            {selectionMode === 'bundle' && (
              <div className="space-y-3">
                {bundles.map((pkg) => {
                  const isSelected = selectedBundle === pkg.id;
                  const pricePerWorkshop = pkg.bundlePrice;
                  const totalPrice = pricePerWorkshop * workshopQuantity;
                  const totalSavings = pkg.savings * workshopQuantity;

                  return (
                    <div
                      key={pkg.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-blue-50 dark:bg-blue-950/20 ring-2 ring-primary'
                          : 'border-border hover:border-primary hover:bg-muted'
                      }`}
                      onClick={() => handleBundleSelect(pkg.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{pkg.name}</h4>
                            {pkg.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {pkg.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{pkg.description}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm">
                          <span className="text-muted-foreground line-through">€{pkg.originalPrice}</span>
                          <span className="ml-2 font-bold text-primary">€{pricePerWorkshop}</span>
                          <span className="text-xs text-muted-foreground ml-1">per workshop</span>
                        </div>
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                          Save €{pkg.savings}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {pkg.assets.map((assetId) => {
                          const asset = availableAssets.find(a => a.id === assetId);
                          if (!asset) return null;
                          const Icon = asset.icon;
                          return (
                            <Badge key={assetId} variant="outline" className="text-xs">
                              <Icon className="h-3 w-3 mr-1" />
                              {asset.name}
                            </Badge>
                          );
                        })}
                      </div>

                      {workshopQuantity > 1 && (
                        <div className="p-2 bg-background rounded border border-dashed">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Total for {workshopQuantity} workshops:</span>
                            <div>
                              <span className="font-bold text-primary">€{totalPrice}</span>
                              <span className="ml-2 text-green-600">(Save €{totalSavings})</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                      Bundles include pre-selected assets at a discounted rate. Switch to "Custom Selection" to choose individual assets.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Selection View */}
            {selectionMode === 'custom' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableAssets.map((asset) => {
                    const Icon = asset.icon;
                    const isSelected = selectedAssets.includes(asset.id);
                    
                    return (
                      <div
                        key={asset.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-blue-50 dark:bg-blue-950/20'
                            : 'border-border hover:border-primary hover:bg-muted'
                        }`}
                        onClick={() => toggleAsset(asset.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <Icon className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{asset.name}</p>
                              <p className="text-xs text-muted-foreground">{asset.type}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedAssets.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} selected</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedAssets([])}
                      >
                        Clear selection
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Quantity & Facilitator Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workshop Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Number of Workshops</Label>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWorkshopQuantity(Math.max(1, workshopQuantity - 1))}
                >
                  -
                </Button>
                <span className="text-lg font-medium w-12 text-center">{workshopQuantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWorkshopQuantity(workshopQuantity + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-start justify-between space-x-4">
              <div className="flex-1">
                <Label className="font-medium">Add Professional Facilitator</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Expert guidance to maximize workshop outcomes
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeFacilitator}
                  onChange={(e) => setIncludeFacilitator(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">+€{facilitatorPrice}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Summary Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purchase Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Workshop{workshopQuantity > 1 ? 's' : ''} ({workshopQuantity}x)</span>
                  <span className="font-medium">€{baseWorkshopPrice * workshopQuantity}</span>
                </div>
                
                {!selectedBundleData && selectedAssets.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Assets ({selectedAssets.length}x)</span>
                    <span className="font-medium">€{totalAssetPrice}</span>
                  </div>
                )}

                {selectedBundleData && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">Bundle Savings</span>
                    <span className="font-medium text-green-600">-€{bundleDiscount}</span>
                  </div>
                )}
                
                {includeFacilitator && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Facilitator ({workshopQuantity}x)</span>
                    <span className="font-medium">€{facilitatorTotal}</span>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="font-medium">Total</span>
                  <span className="text-2xl font-bold">€{totalPrice}</span>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg" 
                onClick={() => setShowScheduleDialog(true)}
                disabled={selectedAssets.length === 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Purchase Workshop
              </Button>

              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={() => setShowImpactPreview(true)}
                disabled={selectedAssets.length === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Dashboard Impact
              </Button>

              {selectedAssets.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    {selectedAssets.length} brand asset{selectedAssets.length !== 1 ? 's' : ''} will receive workshop data and update their status.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderInProgressView = () => {
    // Empty State - No workshops scheduled
    if (scheduledWorkshops.length === 0) {
      return (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-lg mb-2">No Workshops Scheduled</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    You've purchased {purchasedWorkshops} workshop{purchasedWorkshops !== 1 ? 's' : ''} but haven't scheduled any sessions yet. 
                    Schedule your first workshop to get started.
                  </p>
                </div>
                <Button onClick={() => setShowScheduleDialog(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule First Workshop
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Use new In Progress component
    return (
      <CanvasWorkshopInProgress
        workshops={scheduledWorkshops}
        selectedWorkshopId={selectedWorkshopId}
        onWorkshopSelect={setSelectedWorkshopId}
        availableAssets={availableAssets}
        onApproveSession={() => setViewStatus('approved')}
        onBack={onBack}
        onSwitchToApproved={() => setViewStatus('approved')}
      />
    );
  };
  
  const oldRenderInProgressView = () => {
    const selectedWorkshop = scheduledWorkshops.find(w => w.id === selectedWorkshopId);
    
    // Get workshop assets for selected workshop
    const workshopAssets = selectedWorkshop?.assets?.map(assetId => 
      availableAssets.find(a => a.id === assetId)
    ).filter(Boolean) || [];
    
    // Initialize selected asset tab if not set
    if (!selectedAssetTab && workshopAssets.length > 0) {
      setSelectedAssetTab(workshopAssets[0]?.id || null);
    }
    
    return (
      <div className="space-y-6">
        {/* Save Toast Notification */}
        {showSaveToast && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <CardContent className="p-4 flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  Progress saved successfully
                </span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Session Control Bar - Sticky at top */}
        <Card className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                {/* Session Timer */}
                {sessionStartTime && !sessionPaused && (
                  <div className="flex items-center space-x-2">
                    <Timer className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Session Time</p>
                      <p className="text-sm font-medium">{getSessionDuration()}</p>
                    </div>
                  </div>
                )}
                
                {/* Last Saved */}
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{formatLastSavedTime()}</p>
                  </div>
                </div>
                
                {/* Asset Count */}
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {workshopAssets.length} asset{workshopAssets.length !== 1 ? 's' : ''} in this workshop
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {!sessionPaused ? (
                  <>
                    <Button size="sm" variant="outline" onClick={handlePauseSession}>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleSaveAndExit}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Save & Exit
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={handleResumeSession}>
                    <Play className="h-4 w-4 mr-2" />
                    Resume Session
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workshop Selector - Compact */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <Label className="text-sm font-medium whitespace-nowrap">Current Workshop:</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 max-w-md justify-between">
                      {selectedWorkshop ? (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{selectedWorkshop.date}</span>
                          <Badge variant="outline" className="ml-2">
                            <Clock className="h-3 w-3 mr-1" />
                            {selectedWorkshop.time}
                          </Badge>
                        </div>
                      ) : (
                        <span>Select a workshop session</span>
                      )}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[400px]">
                    {scheduledWorkshops.map(workshop => (
                      <DropdownMenuItem 
                        key={workshop.id}
                        onClick={() => setSelectedWorkshopId(workshop.id)}
                      >
                        <div className="flex items-center space-x-2 flex-1">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{workshop.date} at {workshop.time}</span>
                          {selectedWorkshopId === workshop.id && (
                            <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScheduleDialog(true)}
                disabled={scheduledWorkshops.length >= purchasedWorkshops}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Workshop
              </Button>
            </div>
            
            {/* Asset Badges - Show which assets this workshop covers */}
            {selectedWorkshop && workshopAssets.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Assets covered in this workshop:</p>
                <div className="flex flex-wrap gap-2">
                  {workshopAssets.map((asset) => {
                    if (!asset) return null;
                    const Icon = asset.icon;
                    return (
                      <Badge key={asset.id} variant="outline" className="flex items-center space-x-1 px-3 py-1">
                        <Icon className="h-3 w-3" />
                        <span>{asset.name}</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Facilitator Card - If workshop has facilitator */}
        {selectedWorkshop?.hasFacilitator && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">Facilitator-Led Workshop</CardTitle>
                  <CardDescription className="text-blue-700 dark:text-blue-300 mt-1">
                    Professional facilitator assigned to guide your session
                  </CardDescription>
                </div>
                {selectedWorkshop.meetingLink && (
                  <Button size="sm" asChild>
                    <a href={selectedWorkshop.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Video className="h-4 w-4 mr-2" />
                      Join Meeting
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-full bg-blue-200 dark:bg-blue-900 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {selectedWorkshop.facilitatorName}
                  </p>
                  {selectedWorkshop.facilitatorEmail && (
                    <a 
                      href={`mailto:${selectedWorkshop.facilitatorEmail}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 mt-1"
                    >
                      <Mail className="h-3 w-3" />
                      <span>{selectedWorkshop.facilitatorEmail}</span>
                    </a>
                  )}
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    Your facilitator will guide you through each step, manage timing, and help resolve conflicts during the session.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Overview */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Workshop Progress</p>
                  <p className="font-medium">Step {currentStep} of {totalSteps}</p>
                </div>
                <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                  {Math.round(progressPercentage)}% Complete
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="relative">
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                
                {/* Step Indicators - Make them clickable */}
                <div className="flex justify-between mt-4">
                  {workshopSteps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;
                    
                    return (
                      <button
                        key={step.id}
                        onClick={() => setCurrentStep(stepNumber)}
                        className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ width: `${100 / totalSteps}%` }}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                            isCurrent
                              ? 'bg-primary text-white shadow-lg scale-110'
                              : isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                          }`}
                        >
                          {isCompleted ? <CheckCircle className="h-4 w-4" /> : stepNumber}
                        </div>
                        <p className={`text-xs text-center mt-2 max-w-[80px] ${isCurrent ? 'font-medium' : 'text-muted-foreground'}`}>
                          {step.title.split(' ')[0]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium bg-primary text-white">
                    Step {currentStep}
                  </span>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{currentStepData.duration}</span>
                  </Badge>
                </div>
                <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Video Tutorial */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Video Tutorial</h3>
              </div>
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  src={currentStepData.videoUrl}
                  title={`${currentStepData.title} Tutorial`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>

            <Separator />

            {/* Text Explanation */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Overview</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentStepData.textExplanation}
              </p>
            </div>

            <Separator />

            {/* Step-by-Step Guide */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Step-by-Step Guide</h3>
              </div>
              <ol className="space-y-3">
                {currentStepData.guide.map((item, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm text-muted-foreground pt-0.5">{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <Separator />

            {/* Multi-Asset Results Organization */}
            {workshopAssets.length > 1 ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Save className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Document Your Results by Asset</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  This workshop covers {workshopAssets.length} brand assets. Organize your results for each asset separately.
                </p>
                
                <Tabs value={selectedAssetTab || undefined} onValueChange={setSelectedAssetTab}>
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${workshopAssets.length}, 1fr)` }}>
                    {workshopAssets.map((asset) => {
                      if (!asset) return null;
                      const Icon = asset.icon;
                      return (
                        <TabsTrigger key={asset.id} value={asset.id} className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span className="hidden sm:inline">{asset.name}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  
                  {workshopAssets.map((asset) => {
                    if (!asset) return null;
                    return (
                      <TabsContent key={asset.id} value={asset.id} className="space-y-4 mt-4">
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            {currentStepData.resultPrompt} (for {asset.name})
                          </p>
                          <Textarea
                            placeholder={`Enter your results for ${asset.name}...`}
                            value={assetResults[asset.id]?.[currentStepData.id] || ''}
                            onChange={(e) => {
                              setAssetResults(prev => ({
                                ...prev,
                                [asset.id]: {
                                  ...prev[asset.id],
                                  [currentStepData.id]: e.target.value
                                }
                              }));
                            }}
                            className="min-h-[200px]"
                          />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{assetResults[asset.id]?.[currentStepData.id]?.length || 0} characters (suggested: 100-500)</span>
                            <Button size="sm" variant="outline" onClick={handleSaveProgress}>
                              <Save className="h-3 w-3 mr-2" />
                              Save Progress
                            </Button>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-3">
                          <h3 className="font-medium text-sm">Backburner Items</h3>
                          <p className="text-sm text-muted-foreground">
                            Document items to revisit later for {asset.name}:
                          </p>
                          <Textarea
                            placeholder={`Enter backburner items for ${asset.name}...`}
                            value={assetBackburners[asset.id]?.[currentStepData.id] || ''}
                            onChange={(e) => {
                              setAssetBackburners(prev => ({
                                ...prev,
                                [asset.id]: {
                                  ...prev[asset.id],
                                  [currentStepData.id]: e.target.value
                                }
                              }));
                            }}
                            className="min-h-[150px]"
                          />
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </div>
            ) : (
              /* Single Asset Results */
              <>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Save className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Document Your Results</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentStepData.resultPrompt}
                  </p>
                  <Textarea
                    placeholder="Enter your results and insights here..."
                    value={stepResults[currentStepData.id] || ''}
                    onChange={(e) => handleStepResultChange(currentStepData.id, e.target.value)}
                    className="min-h-[200px]"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{stepResults[currentStepData.id]?.length || 0} characters (suggested: 100-500)</span>
                    <Button size="sm" variant="outline" onClick={handleSaveProgress}>
                      <Save className="h-3 w-3 mr-2" />
                      Save Progress
                    </Button>
                  </div>
                </div>

                {/* Backburner Field */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Save className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Backburner Items</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Document any items to revisit later:
                  </p>
                  <Textarea
                    placeholder="Enter backburner items here..."
                    value={stepBackburners[currentStepData.id] || ''}
                    onChange={(e) => handleStepBackburnerChange(currentStepData.id, e.target.value)}
                    className="min-h-[150px]"
                  />
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={handlePreviousStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous Step
              </Button>
              <Button
                onClick={currentStep === totalSteps ? () => setShowCompletionPreview(true) : handleNextStep}
              >
                {currentStep === totalSteps ? 'Review & Complete' : 'Next Step'}
                {currentStep < totalSteps && <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips - Dynamic based on current step */}
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle className="text-sm">Tips for This Step</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Watch the video tutorial first to understand the step objectives</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Follow the guide sequentially for best results</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Progress auto-saves every few minutes - use Save buttons for manual saves</span>
              </li>
              {workshopAssets.length > 1 && (
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Remember to document results for each asset using the tabs above</span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderApprovedView = () => {
    // Use new Approved component
    return (
      <CanvasWorkshopApproved
        workshops={scheduledWorkshops.map(w => ({
          ...w,
          approvedAt: '2024-12-18',
          approvedBy: 'Current User',
          participantCount: 8
        }))}
        selectedWorkshopId={selectedWorkshopId}
        onWorkshopSelect={setSelectedWorkshopId}
        availableAssets={availableAssets}
        onReopenSession={() => setViewStatus('in-progress')}
        onBack={onBack}
        onSwitchToInProgress={() => setViewStatus('in-progress')}
      />
    );
  };
  
  const oldRenderApprovedView = () => {
    const selectedWorkshop = scheduledWorkshops.find(w => w.id === selectedWorkshopId);
    
    return (
      <div className="space-y-6">
        {/* Scheduled Workshops List - At the Top */}
        {scheduledWorkshops.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CardTitle>Completed Workshops</CardTitle>
                  <Badge variant="outline" className="text-base px-3 py-1">
                    {scheduledWorkshops.length}/{purchasedWorkshops}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {scheduledWorkshops.length} of {purchasedWorkshops} workshops completed
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scheduledWorkshops.map(workshop => (
                  <Card 
                    key={workshop.id} 
                    className={`p-4 cursor-pointer transition-all ${
                      selectedWorkshopId === workshop.id 
                        ? 'border-primary bg-blue-50 dark:bg-blue-950/20' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedWorkshopId(workshop.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <Calendar className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                          selectedWorkshopId === workshop.id ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`font-medium ${
                              selectedWorkshopId === workshop.id ? 'text-primary' : ''
                            }`}>{workshop.date}</span>
                            <Badge variant="outline" className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{workshop.time}</span>
                            </Badge>
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                            {selectedWorkshopId === workshop.id && (
                              <Badge className="bg-primary text-white">
                                Viewing
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{workshop.description}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workshop Selector */}
        {scheduledWorkshops.length > 0 && (
          <Card className="bg-muted border-muted">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Label className="font-medium">Viewing Workshop</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedWorkshop ? (
                        <div className="flex items-center space-x-3 flex-1">
                          <Calendar className="h-4 w-4 text-primary" />
                          <div className="flex items-center space-x-2">
                            <span>{selectedWorkshop.date}</span>
                            <Badge variant="outline" className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{selectedWorkshop.time}</span>
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <span>Select a workshop to view</span>
                      )}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[500px]">
                    {scheduledWorkshops.map(workshop => (
                      <DropdownMenuItem 
                        key={workshop.id}
                        onClick={() => setSelectedWorkshopId(workshop.id)}
                        className="p-3"
                      >
                        <div className="flex items-start space-x-3 flex-1">
                          <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium">{workshop.date}</span>
                              <Badge variant="outline" className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{workshop.time}</span>
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{workshop.description}</p>
                          </div>
                          {selectedWorkshopId === workshop.id && (
                            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {selectedWorkshop && (
                  <p className="text-sm text-muted-foreground">
                    {selectedWorkshop.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workshop Report */}
        <WorkshopReport 
          assetId="1"
          onRerender={() => {
            console.log('Rerender requested');
          }}
          onEdit={(data) => {
            console.log('Edit requested:', data);
          }}
        />
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* PROMINENT VIEW SWITCHER - ALWAYS VISIBLE AT TOP */}
      <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 sticky top-20 z-40 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
              <Presentation className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-xl">Canvas Workshop</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {viewStatus === 'to-buy' && 'Purchase and plan your workshop sessions'}
                {viewStatus === 'in-progress' && 'Active workshop sessions in progress'}
                {viewStatus === 'approved' && 'Completed and approved workshops'}
              </p>
            </div>
          </div>
          
          {/* VIEW SWITCHER DROPDOWN */}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="min-w-[200px] justify-between bg-background">
                  <div className="flex items-center">
                    <span className={`mr-2 ${getStatusColor()}`}>{getStatusIcon()}</span>
                    <span className="font-medium">{getStatusLabel()}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px]">
                <DropdownMenuItem onClick={() => setViewStatus('to-buy')} className="cursor-pointer py-3">
                  <ShoppingCart className="h-4 w-4 mr-2 text-orange-600" />
                  <span>To Buy</span>
                  {viewStatus === 'to-buy' && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewStatus('in-progress')} className="cursor-pointer py-3">
                  <Play className="h-4 w-4 mr-2 text-blue-600" />
                  <span>In Progress</span>
                  {viewStatus === 'in-progress' && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewStatus('approved')} className="cursor-pointer py-3">
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  <span>Approved</span>
                  {viewStatus === 'approved' && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {viewStatus === 'to-buy' && renderToBuyView()}
      {viewStatus === 'in-progress' && renderInProgressView()}
      {viewStatus === 'approved' && renderApprovedView()}

      {/* Schedule Workshop Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Schedule Workshop</DialogTitle>
            <DialogDescription>
              Add a new workshop session to your schedule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newWorkshop.date}
                onChange={(e) => setNewWorkshop({ ...newWorkshop, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={newWorkshop.time}
                onChange={(e) => setNewWorkshop({ ...newWorkshop, time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newWorkshop.description}
                onChange={(e) => setNewWorkshop({ ...newWorkshop, description: e.target.value })}
                placeholder="e.g., Initial brand strategy workshop with leadership team"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleScheduleWorkshop}
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bundle Confirmation Dialog */}
      <Dialog open={showBundleConfirmation} onOpenChange={setShowBundleConfirmation}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Expand to Bundle Selection?</DialogTitle>
            <DialogDescription>
              You're about to expand your workshop scope
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {pendingBundle && (() => {
              const bundle = bundles.find(b => b.id === pendingBundle);
              if (!bundle) return null;
              
              return (
                <>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                    <div className="flex items-start space-x-2">
                      <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                          This will update {bundle.assets.length} asset pages
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Selecting "{bundle.name}" will expand from {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} to {bundle.assets.length} assets
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Assets included in {bundle.name}:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {bundle.assets.map((assetId) => {
                        const asset = availableAssets.find(a => a.id === assetId);
                        if (!asset) return null;
                        const Icon = asset.icon;
                        const isNew = !selectedAssets.includes(assetId);
                        
                        return (
                          <div key={assetId} className="flex items-center space-x-2 p-2 bg-background rounded border">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="text-sm flex-1">{asset.name}</span>
                            {isNew && (
                              <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200">
                                New
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBundleConfirmation(false);
                setPendingBundle(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmBundleSelection}>
              Continue with Bundle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impact Preview Modal */}
      <Dialog open={showImpactPreview} onOpenChange={setShowImpactPreview}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dashboard Impact Preview</DialogTitle>
            <DialogDescription>
              How your "Your Brand" dashboard will change after purchase
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-3">Current State</p>
                <div className="grid grid-cols-2 gap-3">
                  {availableAssets.slice(0, 6).map((asset) => {
                    const Icon = asset.icon;
                    const getStatusColor = () => {
                      switch(asset.currentStatus) {
                        case 'approved': return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20';
                        case 'draft': return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20';
                        case 'empty': return 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/20';
                      }
                    };
                    
                    return (
                      <div key={asset.id} className={`p-3 rounded-lg border ${getStatusColor()}`}>
                        <div className="flex items-start space-x-2">
                          <Icon className="h-4 w-4 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{asset.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{asset.currentStatus}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ChevronDown className="h-6 w-6 text-primary" />
              </div>

              <div>
                <p className="text-sm font-medium mb-3">After Purchase</p>
                <div className="grid grid-cols-2 gap-3">
                  {availableAssets.slice(0, 6).map((asset) => {
                    const Icon = asset.icon;
                    const willBeUpdated = selectedAssets.includes(asset.id);
                    const getStatusColor = () => {
                      if (willBeUpdated) {
                        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 ring-2 ring-blue-300 dark:ring-blue-700';
                      }
                      switch(asset.currentStatus) {
                        case 'approved': return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20';
                        case 'draft': return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20';
                        case 'empty': return 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/20';
                      }
                    };
                    
                    return (
                      <div key={asset.id} className={`p-3 rounded-lg border ${getStatusColor()} transition-all`}>
                        <div className="flex items-start space-x-2">
                          <Icon className="h-4 w-4 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{asset.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {willBeUpdated ? 'Workshop Complete' : <span className="capitalize">{asset.currentStatus}</span>}
                            </p>
                          </div>
                          {willBeUpdated && (
                            <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {selectedAssets.length} asset page{selectedAssets.length !== 1 ? 's' : ''} will be updated
                  </p>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    {selectedAssets.slice(0, 5).map((assetId) => {
                      const asset = availableAssets.find(a => a.id === assetId);
                      if (!asset) return null;
                      return (
                        <li key={assetId}>• {asset.name} → Workshop Complete</li>
                      );
                    })}
                    {selectedAssets.length > 5 && (
                      <li className="text-blue-600 dark:text-blue-400">+ {selectedAssets.length - 5} more</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImpactPreview(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workshop Completion Preview Dialog */}
      <Dialog open={showCompletionPreview} onOpenChange={setShowCompletionPreview}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Complete Workshop Session?</DialogTitle>
            <DialogDescription>
              Review what happens when you complete this workshop
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(() => {
              const selectedWorkshop = scheduledWorkshops.find(w => w.id === selectedWorkshopId);
              const workshopAssets = selectedWorkshop?.assets?.map(assetId => 
                availableAssets.find(a => a.id === assetId)
              ).filter(Boolean) || [];
              
              return (
                <>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3">What will happen:</h3>
                    <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>Your results will be saved and organized by asset</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>All{workshopAssets.length > 0 && ` ${workshopAssets.length}`} brand asset page{workshopAssets.length !== 1 ? 's' : ''} will be updated with workshop insights</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>A comprehensive workshop report will be generated</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>You can still edit results after completion</span>
                      </li>
                      {selectedWorkshop?.hasFacilitator && (
                        <li className="flex items-start space-x-2">
                          <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Facilitator will receive a copy of all results for final review</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">Assets that will be updated:</h3>
                    <div className="flex flex-wrap gap-2">
                      {workshopAssets.map((asset) => {
                        if (!asset) return null;
                        const Icon = asset.icon;
                        return (
                          <Badge key={asset.id} variant="outline" className="flex items-center space-x-1">
                            <Icon className="h-3 w-3" />
                            <span>{asset.name}</span>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Make sure you've saved all your results before completing. You can always come back to edit later.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompletionPreview(false)}
            >
              Go Back
            </Button>
            <Button
              onClick={() => {
                setShowCompletionPreview(false);
                setViewStatus('approved');
              }}
            >
              Complete Workshop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
