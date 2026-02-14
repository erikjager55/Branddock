import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { WarningMessage } from './ui/InfoBox';
import { useBrandAssets } from '../contexts';
import { calculateDecisionStatus } from '../utils/decision-status-calculator';
import { ResearchFlowModal } from './ResearchFlowModal';
import { ValidationMethodButton } from './validation/ValidationMethodButton';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  MessageCircle,
  FileText,
  Brain,
  Target,
  TrendingUp,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Zap,
  Shield,
  Crown,
  Clock,
  BarChart3,
  Lightbulb,
  Rocket,
  Heart,
  ChevronDown,
  RefreshCw,
  Edit3,
  Save,
  X,
  Globe,
  Leaf,
  Users2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SocialRelevancyDashboardProps {
  onBack: () => void;
  onStartResearch: (methodId: string) => void;
}

// Research method definitions specific to Social Relevancy
const researchMethods = [
  {
    id: 'ai-exploration',
    name: 'AI Exploration',
    description: 'Analyze social impact trends and sustainability opportunities',
    icon: Brain,
    unlockLevel: 'free',
    impact: 'Medium',
    duration: '5 min',
    unlocksPotential: 35,
    insights: 'Quick scan of social relevancy landscape',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    description: 'Collaborative session to define social impact strategy',
    icon: Users,
    unlockLevel: 'free',
    impact: 'High',
    duration: '2-4 hours',
    unlocksPotential: 45,
    insights: 'Aligned social mission across stakeholders',
  },
  {
    id: 'interviews',
    name: 'Interviews',
    description: 'Deep conversations about social values and community impact',
    icon: MessageCircle,
    unlockLevel: 'basic',
    impact: 'High',
    duration: '45-60 min',
    unlocksPotential: 40,
    insights: 'Authentic understanding of social commitment',
  },
  {
    id: 'questionnaire',
    name: 'Questionnaire',
    description: 'Gather stakeholder perspectives on social responsibility',
    icon: FileText,
    unlockLevel: 'basic',
    impact: 'Medium',
    duration: '1-2 weeks',
    unlocksPotential: 25,
    insights: 'Broad view of social impact priorities',
  },
];

// Example ESG dimensions
const esgExamples = [
  {
    category: 'Environmental',
    commitment: 'Carbon-neutral operations by 2027',
    impact: 'high',
    initiatives: '5 active projects',
  },
  {
    category: 'Social',
    commitment: 'Inclusive employment & digital skills training',
    impact: 'high',
    initiatives: '8 active programs',
  },
  {
    category: 'Governance',
    commitment: 'Transparent AI ethics & data privacy leadership',
    impact: 'medium',
    initiatives: '3 active policies',
  },
];

const statusConfig = {
  'awaiting-research': {
    label: 'Awaiting Research',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    icon: AlertTriangle,
  },
  'in-development': {
    label: 'In Development',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    icon: Zap,
  },
  'ready-to-activate': {
    label: 'Ready to Activate',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    icon: CheckCircle2,
  },
  'locked': {
    label: 'Locked',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    icon: Lock,
  },
};

export function SocialRelevancyDashboard({ onBack, onStartResearch }: SocialRelevancyDashboardProps) {
  const [selectedMethod, setSelectedMethod] = useState<typeof researchMethods[0] | null>(null);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  
  // Editable ESG dimensions state
  const [editableDimensions, setEditableDimensions] = useState({
    environmental: {
      text: 'Committed to carbon-neutral operations by 2027, reducing digital waste through sustainable tech solutions and eco-conscious service delivery',
      initiatives: '5 active projects',
      impact: 'high'
    },
    social: {
      text: 'Empowering underrepresented communities through digital skills training, creating inclusive employment opportunities, and supporting diversity in tech',
      initiatives: '8 active programs',
      impact: 'high'
    },
    governance: {
      text: 'Transparent business practices with ethical AI implementation, data privacy leadership, and stakeholder accountability frameworks',
      initiatives: '3 active policies',
      impact: 'medium'
    }
  });
  
  // ✅ Get the Social Relevancy asset from context (synchronized with overview)
  const { brandAssets } = useBrandAssets();
  const asset = brandAssets.find((a) => a.type === 'Social Relevancy');
  
  // 🔍 DEBUG: Log the entire asset to see what's in it
  console.log('🔍 [SocialRelevancyDashboard] Full asset:', asset);
  console.log('🔍 [SocialRelevancyDashboard] Research methods:', asset?.researchMethods);
  
  if (!asset) return null;

  const decisionStatus = calculateDecisionStatus(asset);
  const completedMethods = asset.researchMethods.filter((m) => m.status === 'completed');
  const totalMethods = researchMethods.length;
  const unlockProgress = (completedMethods.length / totalMethods) * 100;

  // Calculate total unlock potential
  const totalUnlockPotential = completedMethods.reduce((sum, method) => {
    const methodDef = researchMethods.find((m) => m.id === method.type);
    return sum + (methodDef?.unlocksPotential || 0);
  }, 0);

  // Handle research start
  const handleStartResearch = (methodId: string) => {
    const method = researchMethods.find((m) => m.id === methodId);
    if (method) {
      // For AI Exploration, call onStartResearch to navigate to AI Brand Analysis
      if (methodId === 'ai-exploration') {
        onStartResearch(methodId);
      } else {
        // For other methods, show the flow modal
        setSelectedMethod(method);
        setIsFlowModalOpen(true);
      }
    }
  };

  // Handle research completion
  const handleResearchComplete = (methodId: string) => {
    setIsFlowModalOpen(false);
    setSelectedMethod(null);
    
    toast.success('Research completed!', {
      description: `${researchMethods.find(m => m.id === methodId)?.name} data has been added to Social Relevancy.`,
    });

    onStartResearch(methodId);
  };

  // Handle regenerate
  const handleRegenerate = () => {
    setIsRegenerating(true);
    
    // Simulate regeneration
    setTimeout(() => {
      const newDimensions = {
        environmental: {
          text: 'Achieve net-zero emissions across all operations by 2026, pioneering circular economy practices in the digital sector with sustainable infrastructure',
          initiatives: '7 active projects',
          impact: 'high'
        },
        social: {
          text: 'Champion workforce diversity and inclusion, providing mentorship programs and career pathways for underrepresented groups in technology',
          initiatives: '10 active programs',
          impact: 'high'
        },
        governance: {
          text: 'Lead industry in transparent reporting, ethical AI governance, and stakeholder engagement with comprehensive accountability measures',
          initiatives: '5 active policies',
          impact: 'medium'
        }
      };
      
      setEditableDimensions(newDimensions);
      setIsRegenerating(false);
      toast.success('Social relevancy dimensions regenerated!', {
        description: 'Updated ESG framework based on your research data.',
      });
    }, 2000);
  };

  // Handle save edits
  const handleSaveEdits = () => {
    setIsEditing(false);
    toast.success('Changes saved!', {
      description: 'Your social relevancy dimensions have been updated.',
    });
  };

  // Handle cancel edits
  const handleCancelEdits = () => {
    setIsEditing(false);
    // Reset to original values if needed
  };

  // Handle lock/unlock
  const handleToggleLock = () => {
    if (isLocked) {
      // Unlock
      setIsLocked(false);
      setLockedBy(null);
      toast.success('Asset unlocked!', {
        description: 'The asset is now available for editing by others.',
      });
    } else {
      // Lock
      setIsLocked(true);
      setLockedBy('You');
      toast.success('Asset locked!', {
        description: 'You have exclusive editing rights. Others can view but not modify.',
      });
    }
  };

  const StatusIcon = statusConfig[asset.status]?.icon || AlertTriangle;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Your Brand
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#1FD1B2] to-[#1FD1B2]/80 flex items-center justify-center shadow-lg">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-semibold mb-1">Social Relevancy</h1>
                <p className="text-muted-foreground">
                  Define your social impact, sustainability commitment, and ethical governance
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`${statusConfig[asset.status]?.className} border px-4 py-2`}
            >
              <StatusIcon className="h-4 w-4 mr-2" />
              {statusConfig[asset.status]?.label}
            </Badge>
          </div>

          {/* ESG Framework Accordion */}
          <Accordion type="single" collapsible className="mt-6">
            <AccordionItem value="framework" className="border rounded-xl bg-background border-primary/30 shadow-sm hover:shadow-md transition-all overflow-hidden">
              <AccordionTrigger className="hover:no-underline px-6 py-5 hover:bg-primary/5 transition-colors relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm flex-shrink-0">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold text-lg text-foreground">The ESG Framework</span>
                      <span className="text-sm text-muted-foreground font-normal mt-0.5">Understand how Environmental, Social, and Governance factors shape your impact</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-4 bg-primary/10 text-primary border-primary/20 text-xs font-medium">
                    Learn More
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-4 pb-6 px-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {esgExamples.map((example, idx) => (
                      <div key={idx} className="p-6 rounded-xl bg-primary/5 border border-primary/20 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <Badge variant="outline" className="text-sm font-semibold">
                            {example.category}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              example.impact === 'high' 
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                                : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                            }`}
                          >
                            {example.impact} impact
                          </Badge>
                        </div>
                        <p className="text-base font-medium mb-4 leading-relaxed">{example.commitment}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{example.initiatives}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-lg bg-background/50 border border-border">
                    <div className="flex gap-4">
                      <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Strong social relevancy goes beyond compliance—it's about <strong>authentic commitment to positive impact</strong>. The ESG framework (Environmental, Social, Governance) ensures your brand contributes meaningfully to society while building trust with stakeholders who increasingly demand sustainable and ethical business practices.
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Combined Research Results - Full Width Below Explanation */}
        {completedMethods.length > 0 && (
          <Card className={`shadow-md mb-8 ${isLocked ? 'border-amber-300 dark:border-amber-700' : 'border-primary/30'}`}>
            <CardHeader>
              {isLocked && lockedBy && (
                <div className="mb-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Locked by {lockedBy}</strong> — Only they can edit. Others can view only.
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Generated Results</h2>
                    <p className="text-sm text-muted-foreground">
                      Combined insights from {completedMethods.length} research method{completedMethods.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    <BarChart3 className="h-3 w-3 mr-1.5" />
                    {decisionStatus.overallScore}% Quality
                  </Badge>
                  
                  {/* Lock/Unlock Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleLock}
                    className={`gap-2 ${
                      isLocked 
                        ? 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-amber-300 dark:hover:border-amber-700'
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <Lock className="h-4 w-4" />
                        Locked
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4" />
                        Unlocked
                      </>
                    )}
                  </Button>

                  {!isEditing && !isLocked && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                        className="gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                        {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="gap-2"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </Button>
                    </>
                  )}
                  {isEditing && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdits}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSaveEdits}
                        className="gap-2 bg-primary text-white hover:bg-primary/90"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ESG Dimensions */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Your ESG Commitments</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Environmental Dimension */}
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <Leaf className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700">
                            Environmental
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                            High Impact
                          </Badge>
                        </div>
                        <p className="font-medium mb-2 text-sm">
                          Committed to carbon-neutral operations by 2027, reducing digital waste through sustainable tech solutions and eco-conscious service delivery
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>5 active projects</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Dimension */}
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <Users2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                            Social
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                            High Impact
                          </Badge>
                        </div>
                        <p className="font-medium mb-2 text-sm">
                          Empowering underrepresented communities through digital skills training, creating inclusive employment opportunities, and supporting diversity in tech
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>8 active programs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Governance Dimension */}
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                        <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                            Governance
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                            Medium Impact
                          </Badge>
                        </div>
                        <p className="font-medium mb-2 text-sm">
                          Transparent business practices with ethical AI implementation, data privacy leadership, and stakeholder accountability frameworks
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>3 active policies</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Insights from Research */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Key Insights</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {completedMethods.map((method) => {
                    const methodDef = researchMethods.find(m => m.id === method.type);
                    if (!methodDef) return null;
                    const Icon = methodDef.icon;
                    
                    return (
                      <div key={method.type} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="h-6 w-6 rounded-md bg-background flex items-center justify-center flex-shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">{methodDef.name}</p>
                          <p className="text-sm text-muted-foreground">{methodDef.insights}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Next Steps */}
              {completedMethods.length < totalMethods && (
                <WarningMessage 
                  title="Complete more research to strengthen your ESG framework"
                  size="md"
                >
                  Adding {totalMethods - completedMethods.length} more research method{totalMethods - completedMethods.length > 1 ? 's' : ''} will increase decision quality and provide deeper insights.
                </WarningMessage>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Research Methods */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Research Methods</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Unlock your Social Relevancy framework by completing research activities. Each method provides unique insights and increases your decision quality.
              </p>

              <div className="space-y-4">
                {researchMethods.map((method) => {
                  const assetMethod = asset.researchMethods.find((m) => m.type === method.id);
                  
                  // ✅ NO MAPPING NEEDED - statuses are uniform across the app
                  const status = assetMethod?.status || 'available';

                  return (
                    <ValidationMethodButton
                      key={method.id}
                      label={method.name}
                      description={`${method.duration} • ${method.impact} Impact • +${method.unlocksPotential}%`}
                      type={method.id}
                      status={status}
                      icon={method.icon}
                      onPrimaryClick={() => handleStartResearch(method.id)}
                      showIcon={true}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Guidance */}
          <div className="space-y-6">
            {/* Overview Stats */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Methods Completed</p>
                    <p className="text-2xl font-semibold">{completedMethods.length}/{totalMethods}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Decision Quality</p>
                    <p className="text-2xl font-semibold">{decisionStatus.overallScore}%</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  Recommended Next Steps
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="font-semibold text-orange-600 dark:text-orange-400">1.</span>
                    <span>Start with AI Exploration for ESG landscape scan</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-orange-600 dark:text-orange-400">2.</span>
                    <span>Run Workshop to align stakeholders on social impact</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-orange-600 dark:text-orange-400">3.</span>
                    <span>Validate with Interviews for authentic commitment</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Research Flow Modal */}
      {selectedMethod && (
        <ResearchFlowModal
          isOpen={isFlowModalOpen}
          onClose={() => {
            setIsFlowModalOpen(false);
            setSelectedMethod(null);
          }}
          method={selectedMethod}
          assetName="Social Relevancy"
          onComplete={handleResearchComplete}
        />
      )}
    </div>
  );
}