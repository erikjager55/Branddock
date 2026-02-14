import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { 
  ArrowLeft, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  FileText, 
  Calendar,
  Star,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  Eye,
  MessageCircle,
  ThumbsUp,
  AlertCircle,
  Target,
  Lightbulb,
  Circle,
  Send,
  Bot,
  User,
  Book,
  Video,
  Table,
  Loader,
  Zap,
  Edit3,
  Heart,
  Globe,
  Package,
  Image,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Crown,
  Shield,
  ShoppingCart,
  Play,
  Check,
  Lock,
  Unlock,
  ArrowRight,
  Save
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { logger } from '../utils/logger';
import { Switch } from './ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { GoldenCircleCanvas } from './canvases/GoldenCircleCanvas';
import { VisionStatementCanvas } from './canvases/VisionStatementCanvas';
import { DecisionAnalysisMain } from './decision-analysis/DecisionAnalysisMain';
import { mockDecisionAnalysis } from '../data/mock-decision-analysis';
import { AIGeneratedReport } from './AIGeneratedReport';
import { MissionStatementCanvas } from './canvases/MissionStatementCanvas';
import { BrandArchetypeCanvas } from './canvases/BrandArchetypeCanvas';
import { BrandValuesCanvas } from './canvases/BrandValuesCanvas';
import { WorkshopReport } from './canvases/WorkshopReport';
import { InterviewsManager } from './canvases/InterviewsManager';
import { QuestionnaireManager } from './canvases/QuestionnaireManager';
import { CanvasWorkshopManager } from './canvases/CanvasWorkshopManager_INTEGRATED';
import { GenericToolManager } from './canvases/GenericToolManager';
import { SessionOutcomeHeader } from './SessionOutcomeHeader';
import { SessionNavigator } from './SessionNavigator';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { ResearchMethodType } from '../types/brand-asset';

interface ResearchDashboardProps {
  assetId: string;
  optionId: string;
  onBack: () => void;
  interviewConfig?: {
    numberOfInterviews: number;
    selectedAssets: string[];
  } | null;
  sharedSelectedAssets?: {
    interviews: string[];
    questionnaire: string[];
    workshop: string[];
  };
  onAssetsChange?: (tool: string, assets: string[]) => void;
  researchPlanConfig?: any;
}

export function ResearchDashboard({ 
  assetId, 
  optionId, 
  onBack, 
  interviewConfig: initialInterviewConfig,
  sharedSelectedAssets: propSharedSelectedAssets,
  onAssetsChange,
  researchPlanConfig
}: ResearchDashboardProps) {
  // Interview purchase state
  // Simplified: Research Plans control access now
  const [interviewsPurchased, setInterviewsPurchased] = useState(true); // Default to true for demo, or driven by global state
  const [interviewConfig, setInterviewConfig] = useState<{
    numberOfInterviews: number;
    selectedAssets: string[];
  } | null>(initialInterviewConfig || null);
  
  // Shared asset selection state across all tools
  const [sharedSelectedAssets, setSharedSelectedAssets] = useState<{
    interviews: string[];
    questionnaire: string[];
    workshop: string[];
  }>(propSharedSelectedAssets || {
    interviews: initialInterviewConfig?.selectedAssets || [],
    questionnaire: [],
    workshop: []
  });
  
  // Questionnaire state for AI-agent
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({
    q1: 'We develop AI-powered business automation solutions for mid-market companies.',
    q2: 'We believe technology should empower people, not replace them. We want to help businesses grow sustainably.',
    q3: 'We combine cutting-edge AI with human-centered design, making sure our solutions feel intuitive and integrate seamlessly.',
    q4: 'Mid-market companies (50-500 employees) looking to scale operations efficiently.'
  });
  const [aiReactions, setAiReactions] = useState<Record<string, string>>({
    q1: 'Excellent positioning in a high-growth market segment. Your focus on automation demonstrates clear understanding of customer pain points.',
    q2: 'This purpose statement reveals strong ethical foundations. The emphasis on empowerment rather than replacement shows differentiation.',
    q3: 'The combination of AI with human-centered design is a powerful approach. This creates a unique selling proposition.',
    q4: 'Perfect target market definition. Mid-market companies have the need and budget for automation but often lack enterprise resources.'
  });
  const [editingAnswers, setEditingAnswers] = useState<Record<string, boolean>>({});
  const [isRegeneratingReaction, setIsRegeneratingReaction] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isTyping, setIsTyping] = useState(false);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);
  
  // AI Brand Analysis view status
  const [aiAnalysisViewStatus, setAiAnalysisViewStatus] = useState<'in-progress' | 'result'>('in-progress');
  const [isReportLocked, setIsReportLocked] = useState(false);
  const [reportAnswers, setReportAnswers] = useState({
    brandPurpose: 'het empoweren van bedrijven door middel van innovatieve AI-oplossingen die mensen centraal stellen',
    targetAudience: 'mid-market bedrijven die willen innoveren maar niet de resources hebben van grote enterprises',
    uniqueValue: 'de combinatie van cutting-edge AI technologie met human-centered design principes',
    competitiveLandscape: 'veel concurrenten focussen alleen op technologie, wij balanceren tech met menselijke ervaring',
    customerChallenge: 'complexiteit van AI-implementatie en gebrek aan interne expertise',
    brandValues: 'innovatie, toegankelijkheid, transparantie, en mensgerichtheid',
    futureVision: 'een toekomst waarin AI technologie naadloos integreert in dagelijkse bedrijfsprocessen en mensen versterkt in plaats van vervangt'
  });
  
  const [chatMessages, setChatMessages] = useState([
    { type: 'ai', content: 'Hello! I\'m here to help you develop your brand assets. Let me start by understanding your business better.' },
    { type: 'ai', content: 'Can you tell me what your company does and what makes it unique?' },
    { type: 'user', content: 'We develop AI-powered business automation solutions for mid-market companies.' },
    { type: 'ai', content: 'Excellent! Now, what drives your passion for this work? What\'s the deeper purpose behind what you do?' },
    { type: 'user', content: 'We believe technology should empower people, not replace them. We want to help businesses grow sustainably.' },
    { type: 'ai', content: 'That\'s a powerful purpose! How do you deliver on this mission? What\'s your unique approach?' },
    { type: 'user', content: 'We combine cutting-edge AI with human-centered design, making sure our solutions feel intuitive and integrate seamlessly.' },
    { type: 'ai', content: 'Perfect! Based on our conversation, I\'ve generated your Golden Circle framework. Take a look at the canvas below and let me know if you\'d like any adjustments.' }
  ]);
  const [newMessage, setNewMessage] = useState('');
  
  // Mock data for research results
  const researchResults: Record<string, any> = {
    'ai-agent': {
      name: 'AI-agent Analysis',
      status: 'completed',
      completedDate: '2025-09-08',
      lastUpdated: '2025-09-11',
      confidence: 92,
      keyInsights: [
        'Strong alignment with innovation and creativity values',
        'Technology-forward positioning resonates with target audience',
        'Clear differentiation from traditional service providers',
        'Opportunity to emphasize human-centered approach'
      ],
      metrics: {
        sentimentScore: 8.4,
        clarityScore: 9.1,
        uniquenessScore: 7.8,
        marketFit: 8.7
      },
      recommendations: [
        'Emphasize the balance between innovation and reliability',
        'Develop messaging around human-centered technology',
        'Create content showcasing transformation success stories',
        'Consider expanding into emerging technology sectors'
      ],
      dataPoints: 247,
      sources: ['Industry reports', 'Competitor analysis', 'Market research', 'Customer feedback']
    },
    'canvas-workshop': {
      name: 'Canvas Workshop Results',
      status: 'completed',
      completedDate: '2025-09-05',
      lastUpdated: '2025-09-05',
      confidence: 95,
      keyInsights: [
        'Clear value proposition emerged from stakeholder alignment',
        'Strong consensus on core customer segments',
        'Identified key partnerships and resources needed',
        'Revenue model validation through group exercises'
      ],
      metrics: {
        stakeholderAlignment: 94,
        conceptClarity: 88,
        feasibilityScore: 91,
        innovationIndex: 86
      },
      recommendations: [
        'Prioritize the identified key customer segment',
        'Develop partnerships with technology integrators',
        'Create pilot program for enterprise customers',
        'Build MVP focusing on core value proposition'
      ],
      participantCount: 8,
      sessionDuration: '2.5 hours',
      exercisesCompleted: 12,
      aggregatedData: {
        why: "To empower businesses through innovative technology solutions that create meaningful human connections and drive sustainable growth.",
        how: "By combining cutting-edge AI and automation with human-centered design principles, creating intuitive solutions that seamlessly integrate into existing workflows.",
        what: "We develop intelligent business automation platforms, AI-powered analytics tools, and digital transformation consulting services for mid-market companies."
      }
    },
    'future-visioning': {
      name: 'Future Visioning Session',
      status: 'completed',
      completedDate: '2025-09-03',
      lastUpdated: '2025-09-03',
      confidence: 89,
      keyInsights: [
        '10-year vision focuses on sustainable technology leadership',
        'Strong emphasis on global impact and accessibility',
        'Integration of emerging technologies like AI and IoT',
        'Commitment to educational and social responsibility'
      ],
      metrics: {
        visionClarity: 92,
        stakeholderBuyIn: 87,
        feasibilityRating: 84,
        inspirationLevel: 95
      },
      recommendations: [
        'Develop intermediate 3-5 year milestones',
        'Create communication strategy for vision rollout',
        'Establish metrics for sustainable impact measurement',
        'Build partnerships with educational institutions'
      ],
      scenariosExplored: 5,
      timeHorizon: '10 years',
      participantCount: 12,
      aggregatedData: {
        vision: "To become the leading catalyst for business transformation, creating a world where technology amplifies human potential and drives sustainable prosperity for organizations of all sizes.",
        timeframe: "10 years",
        keyElements: [
          "Global leadership in business transformation",
          "Technology that amplifies human potential", 
          "Sustainable prosperity for all organization sizes",
          "Catalyst for positive change"
        ]
      }
    },
    'mission-workshop': {
      name: 'Mission Workshop Results',
      status: 'completed',
      completedDate: '2025-09-01',
      lastUpdated: '2025-09-01',
      confidence: 96,
      keyInsights: [
        'Mission statement achieves perfect stakeholder consensus',
        'Clear connection between daily activities and purpose',
        'Strong emotional resonance with team members',
        'Actionable framework for decision-making established'
      ],
      metrics: {
        clarityScore: 96,
        emotionalResonance: 94,
        actionability: 92,
        differentiation: 88
      },
      recommendations: [
        'Integrate mission into all company communications',
        'Create employee onboarding module around mission',
        'Develop customer-facing mission storytelling',
        'Establish mission-aligned hiring criteria'
      ],
      workshopDuration: '3 hours',
      iterationsCompleted: 4,
      finalConsensus: 100,
      aggregatedData: {
        mission: "We empower mid-market businesses to thrive in the digital age by delivering innovative technology solutions that seamlessly blend human insight with artificial intelligence, creating meaningful connections and sustainable growth.",
        keyComponents: {
          who: "Mid-market businesses",
          what: "Innovative technology solutions",
          how: "Blending human insight with AI",
          why: "To create meaningful connections and sustainable growth"
        }
      }
    },
    'archetype-assessment': {
      name: 'Brand Archetype Assessment',
      status: 'completed',
      completedDate: '2025-08-28',
      lastUpdated: '2025-08-28',
      confidence: 91,
      keyInsights: [
        'Primary archetype: The Creator (78% match)',
        'Secondary archetype: The Magician (65% match)',
        'Strong creative and transformational identity',
        'Clear differentiation from competitor archetypes'
      ],
      metrics: {
        archetypeClarity: 91,
        brandConsistency: 87,
        emotionalConnection: 93,
        marketDifferentiation: 85
      },
      recommendations: [
        'Develop Creator archetype messaging framework',
        'Create visual identity reflecting creative innovation',
        'Build storytelling around transformation narratives',
        'Establish brand voice guidelines based on archetype'
      ],
      archetypeMatches: 12,
      personalityTraits: 24,
      assessmentAccuracy: 91,
      aggregatedData: {
        primaryArchetype: {
          name: "The Creator",
          match: 85,
          traits: ["innovative", "artistic", "imaginative", "transformational"],
          motivation: "To create something of enduring value",
          shadow: "Perfectionism, over-engineering"
        },
        secondaryArchetype: {
          name: "The Magician",
          match: 72,
          traits: ["visionary", "transformational", "charismatic"],
          motivation: "To transform reality and make dreams come true"
        }
      }
    },
    'values-workshop': {
      name: 'Values Workshop Results',
      status: 'completed',
      completedDate: '2025-08-25',
      lastUpdated: '2025-08-25',
      confidence: 98,
      keyInsights: [
        'Five core values identified with unanimous agreement',
        'Clear behavioral examples defined for each value',
        'Strong connection between values and business strategy',
        'Values-based decision framework established'
      ],
      metrics: {
        valuesClarityScore: 98,
        teamAlignment: 96,
        practicalApplication: 94,
        culturalFit: 97
      },
      recommendations: [
        'Implement values in performance review process',
        'Create values-based customer experience standards',
        'Develop values communication for external stakeholders',
        'Establish values-driven innovation criteria'
      ],
      valuesIdentified: 5,
      behavioralExamples: 25,
      consensusReached: 100,
      aggregatedData: {
        values: [
          { 
            name: "Innovation", 
            description: "Continuously pushing boundaries to create breakthrough solutions", 
            behaviors: ["Experimenting with new technologies", "Challenging status quo", "Encouraging creative thinking"] 
          },
          { 
            name: "Human-Centricity", 
            description: "Putting people first in everything we design and build", 
            behaviors: ["User research and testing", "Inclusive design practices", "Empathy-driven decisions"] 
          },
          { 
            name: "Integrity", 
            description: "Acting with honesty, transparency, and ethical principles", 
            behaviors: ["Transparent communication", "Ethical business practices", "Honest feedback and reporting"] 
          }
        ]
      }
    }
  };

  const result = researchResults[optionId];

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setChatMessages([...chatMessages, { type: 'user', content: newMessage }]);
      setNewMessage('');
      // Simulate AI response
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          type: 'ai', 
          content: 'Thanks for that input! I\'ll incorporate this into your brand framework.' 
        }]);
      }, 1000);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setQuestionnaireAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleRegenerateReaction = (questionId: string) => {
    setIsRegeneratingReaction(questionId);
    // Simulate AI regeneration
    setTimeout(() => {
      setAiReactions(prev => ({
        ...prev,
        [questionId]: 'Updated analysis: ' + prev[questionId]
      }));
      setIsRegeneratingReaction(null);
    }, 1500);
  };

  const toggleEditMode = (questionId: string) => {
    setEditingAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Helper function to determine if we should show canvas view
  const shouldShowCanvas = (assetId: string, optionId: string) => {
    const canvasMapping: Record<string, Record<string, string>> = {
      // '1': { 'canvas-workshop': 'golden-circle' }, // REMOVED: Canvas Workshop is now handled by CanvasWorkshopManager
      '2': { 'future-visioning': 'vision' }, // Brand Vision  
      '3': { 'mission-workshop': 'mission' }, // Mission Statement
      '4': { 'archetype-assessment': 'archetype' }, // Brand Archetype
      '5': { 'values-workshop': 'values' } // Core Values
    };
    
    return canvasMapping[assetId]?.[optionId];
  };

  const handleCanvasRerender = () => {
    // Logic to trigger AI rerendering of the canvas content
    logger.interaction('Rerendering canvas', { assetId, optionId });
    alert('Canvas regeneration initiated! This may take a few moments to complete.');
  };

  const handleCanvasEdit = (data: any) => {
    // Logic to save edited canvas data
    logger.interaction('Saving canvas data', { data });
    alert('Canvas changes saved successfully!');
  };

  const handleInterviewsPurchase = (config: { numberOfInterviews: number; selectedAssets: string[] }) => {
    // This flow is deprecated in favor of the global Research Plan
    logger.warn('Legacy purchase flow triggered', config);
  };

  const handleInterviewAssetsChange = (assets: string[]) => {
    setSharedSelectedAssets(prev => ({ ...prev, interviews: assets }));
    if (onAssetsChange) {
      onAssetsChange('interviews', assets);
    }
  };

  const canvasType = shouldShowCanvas(assetId, optionId);

  // If this is a canvas-type result, show the canvas instead of the dashboard
  // MOVED TO TOP to prioritize approved state over manager views
  if (canvasType) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50">
        <div className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border">
          <div className="max-w-6xl mx-auto px-8 py-4">
            <Button variant="ghost" onClick={onBack} className="-ml-4 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Asset
            </Button>
          </div>
        </div>

        <SessionOutcomeHeader 
          title={result?.name || "Session Outcome"}
          completedDate={result?.completedDate || new Date().toISOString()}
          participantCount={result?.participantCount || (result?.metrics?.stakeholderAlignment ? 8 : 1)}
          sessionDuration={result?.sessionDuration || result?.workshopDuration}
          onDownload={() => alert("Downloading PDF report...")}
          onShare={() => alert("Share link copied to clipboard")}
        />

        <div className="max-w-4xl mx-auto px-8 py-8">
          <div className="relative">
            {canvasType === 'golden-circle' && (
              <GoldenCircleCanvas 
                assetId={assetId}
                onRerender={() => {}}
                onEdit={() => {}}
                isLocked={true}
                sessionData={result}
              />
            )}
            {canvasType === 'vision' && (
              <VisionStatementCanvas 
                assetId={assetId}
                onRerender={() => {}}
                onEdit={() => {}}
                isLocked={true}
                sessionData={result}
              />
            )}
            {canvasType === 'mission' && (
              <MissionStatementCanvas 
                assetId={assetId}
                onRerender={() => {}}
                onEdit={() => {}}
                isLocked={true}
                sessionData={result}
              />
            )}
            {canvasType === 'archetype' && (
              <BrandArchetypeCanvas 
                assetId={assetId}
                onRerender={() => {}}
                onEdit={() => {}}
                isLocked={true}
                sessionData={result}
              />
            )}
            {canvasType === 'values' && (
              <BrandValuesCanvas 
                assetId={assetId}
                onRerender={() => {}}
                onEdit={() => {}}
                isLocked={true}
                sessionData={result}
              />
            )}
          </div>

          {result && (
             <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Session Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {result.keyInsights?.map((insight: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                           <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                           <span className="text-foreground/80">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                   <CardHeader>
                     <CardTitle className="text-lg">Alignment Metrics</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <div className="space-y-5">
                        {result.metrics && Object.entries(result.metrics).map(([key, value]: [string, any]) => (
                          <div key={key}>
                            <div className="flex justify-between text-sm mb-2">
                               <span className="capitalize font-medium text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</span>
                               <span className="font-semibold">{value}%</span>
                            </div>
                            <Progress value={value} className="h-2" />
                          </div>
                        ))}
                      </div>
                   </CardContent>
                </Card>
             </div>
           )}
        </div>
      </div>
    );
  }

  // Special handling for AI-agent interface (this is the AI Exploration with chat, progress, and dropdown)
  if (optionId === 'ai-agent') {
    const totalSteps = 4;
    const aiResults = researchResults['ai-agent'];

    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-muted/30 to-background">
        <div className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border z-10 shadow-sm">
          <div className="max-w-4xl mx-auto px-8 py-5">
            <Button variant="ghost" onClick={onBack} className="-ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Asset
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-8 py-10">
          {/* Result View */}
          {aiAnalysisViewStatus === 'result' && (
            <div className="space-y-10">
              
              {/* Completion Banner with Action Buttons */}
              <Card className="border-[#1FD1B2]/30 bg-gradient-to-br from-[#1FD1B2]/5 to-emerald-50/50 dark:from-[#1FD1B2]/10 dark:to-emerald-950/20 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1FD1B2] to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-[#1F2937] dark:text-green-400 mb-2">
                        AI Brand Analysis Complete
                      </h3>
                      <p className="text-slate-700 dark:text-green-300 mb-4 leading-relaxed">
                        Your brand framework has been successfully generated from {aiResults.dataPoints} data points across {aiResults.sources.length} sources.
                      </p>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-green-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Completed: {aiResults.completedDate}</span>
                        </div>
                        <span className="text-slate-400">•</span>
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          <span>Last updated: {aiResults.lastUpdated}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 flex-wrap pt-5 border-t border-[#1FD1B2]/20">
                    <Button 
                      variant={isReportLocked ? "default" : "outline"}
                      onClick={() => setIsReportLocked(!isReportLocked)}
                      className={isReportLocked 
                        ? "bg-[#1FD1B2] hover:bg-[#1FD1B2]/90 text-white" 
                        : "hover:border-[#1FD1B2] hover:text-[#1FD1B2] transition-colors bg-white/80 dark:bg-slate-900/80"
                      }
                    >
                      {isReportLocked ? (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Locked
                        </>
                      ) : (
                        <>
                          <Unlock className="h-4 w-4 mr-2" />
                          Unlocked
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="hover:border-[#1FD1B2] hover:text-[#1FD1B2] transition-colors bg-white/80 dark:bg-slate-900/80">
                      <Download className="h-4 w-4 mr-2" />
                      PDF download
                    </Button>
                    <Button variant="outline" className="hover:border-[#1FD1B2] hover:text-[#1FD1B2] transition-colors bg-white/80 dark:bg-slate-900/80">
                      <Table className="h-4 w-4 mr-2" />
                      Download raw data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* AI Generated Report */}
              <AIGeneratedReport 
                answers={reportAnswers}
                isLocked={isReportLocked}
                onLockToggle={() => setIsReportLocked(!isReportLocked)}
                onRegenerate={() => {
                  console.log('Regenerating report...');
                }}
              />

              {/* Bottom Actions */}
              <div className="flex justify-between items-center pt-6 pb-4 border-t border-border">
                <Button variant="outline" onClick={() => setAiAnalysisViewStatus('in-progress')} size="lg">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Questionnaire
                </Button>
                <Button 
                  size="lg" 
                  onClick={onBack}
                  className="bg-[#1FD1B2] hover:bg-[#1FD1B2]/90 text-white shadow-sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* In Progress View */}
          {aiAnalysisViewStatus === 'in-progress' && (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#5252E3] to-[#1FD1B2] flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Bot className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="mb-1">AI Brand Analysis</h1>
                    <p className="text-muted-foreground">Beantwoord de vragen om je brand framework te genereren</p>
                  </div>
                </div>
                
                {/* Status Switcher Dropdown */}
                <div className="flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="lg" className="min-w-[180px] justify-between bg-background">
                        <div className="flex items-center">
                          {aiAnalysisViewStatus === 'in-progress' ? (
                            <>
                              <Play className="h-4 w-4 mr-2 text-blue-600" />
                              <span className="font-medium">In Progress</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              <span className="font-medium">Result</span>
                            </>
                          )}
                        </div>
                        <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuItem onClick={() => setAiAnalysisViewStatus('in-progress')} className="cursor-pointer py-3">
                        <Play className="h-4 w-4 mr-2 text-blue-600" />
                        <span>In Progress</span>
                        {aiAnalysisViewStatus === 'in-progress' && <Check className="h-4 w-4 ml-auto" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAiAnalysisViewStatus('result')} className="cursor-pointer py-3">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        <span>Result</span>
                        {aiAnalysisViewStatus === 'result' && <Check className="h-4 w-4 ml-auto" />}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            <Card className="border-0 shadow-xl overflow-hidden">
              {/* Chat Messages */}
              <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-6 space-y-4 min-h-[250px] max-h-[350px] overflow-y-auto">
                {/* Welcome Message */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5252E3] to-[#1FD1B2] flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 shadow-sm border border-border/50">
                      <p className="text-sm text-foreground">
                        Hallo! Ik help je graag om je brand framework te ontwikkelen. Laten we beginnen met een paar vragen over jouw bedrijf.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Previous Q&A Pairs */}
                {[
                  { id: 'q1', question: 'Wat doet jouw bedrijf en wat maakt het uniek?' },
                  { id: 'q2', question: 'Wat is de diepere purpose achter wat je doet?' },
                  { id: 'q3', question: 'Hoe lever je deze waarde en wat is je unieke aanpak?' },
                  { id: 'q4', question: 'Wie is je doelgroep en welke uitdagingen lossen jullie op?' }
                ].map((q, index) => {
                  const stepNumber = index + 1;
                  const answer = questionnaireAnswers[q.id as keyof typeof questionnaireAnswers] || '';
                  const reaction = aiReactions[q.id as keyof typeof aiReactions] || '';
                  
                  if (stepNumber < currentStep) {
                    // Show completed Q&A
                    return (
                      <div key={q.id} className="space-y-3">
                        {/* AI Question */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5252E3] to-[#1FD1B2] flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 shadow-sm border border-border/50">
                              <p className="text-sm text-foreground font-medium">{q.question}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* User Answer */}
                        {answer && (
                          <div className="flex items-start gap-3 justify-end">
                            <div className="flex-1 max-w-[80%]">
                              <div className="bg-gradient-to-br from-[#5252E3] to-[#5252E3]/90 rounded-2xl rounded-tr-sm p-4 shadow-sm">
                                <p className="text-sm text-white">{answer}</p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        )}
                        
                        {/* AI Reaction */}
                        {reaction && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1FD1B2] to-emerald-500 flex items-center justify-center flex-shrink-0">
                              <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="bg-gradient-to-br from-[#1FD1B2]/10 to-emerald-50/50 dark:from-[#1FD1B2]/20 dark:to-emerald-950/30 rounded-2xl rounded-tl-sm p-4 border border-[#1FD1B2]/30">
                                <p className="text-sm text-foreground">{reaction}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } else if (stepNumber === currentStep) {
                    // Show current question
                    return (
                      <div key={q.id} className="space-y-3">
                        {/* AI Question */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5252E3] to-[#1FD1B2] flex items-center justify-center flex-shrink-0 ring-2 ring-[#5252E3]/30">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 shadow-md border-2 border-[#5252E3]/30">
                              <p className="text-sm text-foreground font-medium">{q.question}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1FD1B2] to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-gradient-to-br from-[#1FD1B2]/10 to-emerald-50/50 dark:from-[#1FD1B2]/20 dark:to-emerald-950/30 rounded-2xl rounded-tl-sm p-4 border border-[#1FD1B2]/30">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-[#1FD1B2] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-[#1FD1B2] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-[#1FD1B2] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar & Input Section */}
              <div className="border-t border-border bg-background">
                {/* Progress Bar */}
                <div className="px-6 pt-4 pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span className="font-medium">Voortgang</span>
                    <span className="font-semibold text-[#5252E3]">{Math.round((currentStep / totalSteps) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#5252E3] to-[#1FD1B2] transition-all duration-500"
                      style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-4">
                  {currentStep <= totalSteps ? (
                    <div className="space-y-3">
                      <textarea
                        value={questionnaireAnswers[`q${currentStep}` as keyof typeof questionnaireAnswers] || ''}
                        onChange={(e) => {
                          setQuestionnaireAnswers({
                            ...questionnaireAnswers,
                            [`q${currentStep}`]: e.target.value
                          });
                        }}
                        placeholder="Typ hier je antwoord..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm resize-none focus:ring-2 focus:ring-[#5252E3] focus:border-transparent transition-all"
                        disabled={isTyping}
                      />
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                          disabled={currentStep === 1 || isTyping}
                        >
                          <ArrowLeft className="h-4 w-4 mr-1" />
                          Vorige
                        </Button>
                        <Button
                          onClick={() => {
                            const answer = questionnaireAnswers[`q${currentStep}` as keyof typeof questionnaireAnswers];
                            if (answer && answer.trim()) {
                              setIsTyping(true);
                              
                              setTimeout(() => {
                                const reactions = {
                                  q1: `Interessant! Je focus op "${answer.toLowerCase().includes('ai') ? 'AI-oplossingen' : 'innovatie'}" positioneert je in een dynamische markt. Dit geeft een sterke basis voor je merkidentiteit.`,
                                  q2: `Mooi verwoord. Deze purpose laat een duidelijke waardepropositie zien die verder gaat dan alleen product features.`,
                                  q3: `Uitstekend! Je unieke aanpak combineert meerdere elementen op een onderscheidende manier. Dit is een sterke differentiator in de markt.`,
                                  q4: `Perfect. Je doelgroep-definitie is specifiek genoeg om gericht te zijn, maar breed genoeg voor groei. Dit helpt bij het ontwikkelen van gerichte communicatie.`
                                };
                                
                                setAiReactions(prev => ({
                                  ...prev,
                                  [`q${currentStep}`]: reactions[`q${currentStep}` as keyof typeof reactions] || 'Bedankt voor je input!'
                                }));
                                
                                setIsTyping(false);
                                
                                setTimeout(() => {
                                  if (currentStep === totalSteps) {
                                    setTimeout(() => {
                                      setCurrentStep(currentStep + 1);
                                    }, 1000);
                                  } else {
                                    setCurrentStep(currentStep + 1);
                                  }
                                }, 800);
                              }, 1500);
                            }
                          }}
                          disabled={!questionnaireAnswers[`q${currentStep}` as keyof typeof questionnaireAnswers]?.trim() || isTyping}
                          className="bg-[#5252E3] hover:bg-[#5252E3]/90 text-white"
                        >
                          {isTyping ? (
                            <>
                              <Loader className="h-4 w-4 mr-2 animate-spin" />
                              AI analyzing...
                            </>
                          ) : (
                            <>
                              {currentStep === totalSteps ? 'Complete' : 'Next'}
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1FD1B2]/10 text-[#1FD1B2] text-sm font-medium mb-4">
                        <CheckCircle className="h-4 w-4" />
                        All questions answered!
                      </div>
                      <Button
                        onClick={() => {
                          if (hasGeneratedReport) {
                            const confirmed = window.confirm(
                              'You have previously generated a report. Generating a new one will overwrite the existing report. Do you want to continue?'
                            );
                            if (!confirmed) return;
                          }
                          setHasGeneratedReport(true);
                          setAiAnalysisViewStatus('result');
                        }}
                        size="lg"
                        className="bg-gradient-to-r from-[#5252E3] to-[#1FD1B2] hover:from-[#5252E3]/90 hover:to-[#1FD1B2]/90 text-white shadow-lg gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate Brand Report
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </>
          )}
        </div>
      </div>
    );
  }

  // Special handling for interviews - always show InterviewsPurchase with dropdown
  // REPLACED: Now redirects to Research Plan if not purchased
  if (optionId === 'interviews') {
     // Map optionId to methodType
     const methodType: ResearchMethodType = 'interviews';
     
     // Get all assets that have been unlocked in the research plan
     const unlockedAssets = researchPlanConfig?.unlockedAssets 
       ? mockBrandAssets.filter(asset => researchPlanConfig.unlockedAssets.includes(asset.id))
       : mockBrandAssets;
     
     // Debug logging
     logger.debug('Interview SessionNavigator Debug', {
       hasResearchPlanConfig: !!researchPlanConfig,
       entryMode: researchPlanConfig?.entryMode,
       unlockedAssetsCount: unlockedAssets.length,
       shouldShowNavigator: researchPlanConfig?.entryMode === 'bundle' && unlockedAssets.length > 1
     });
     
     return (
       <div className="flex-1 overflow-y-auto">
         <div className="sticky top-0 bg-background border-b border-border z-10">
           <div className="max-w-6xl mx-auto px-8 py-4">
             <Button variant="ghost" onClick={onBack} className="mb-4">
               <ArrowLeft className="h-4 w-4 mr-2" />
               Back to Asset
             </Button>
           </div>
         </div>

         <div className="max-w-6xl mx-auto px-8 py-8">
           {/* Session Navigator */}
           {researchPlanConfig?.entryMode === 'bundle' && unlockedAssets.length > 1 && (
             <SessionNavigator
               currentAssetId={assetId}
               currentMethodType={methodType}
               allAssets={unlockedAssets}
               onNavigateToAsset={(newAssetId) => {
                 // Navigate to the same method but different asset
                 window.location.hash = `research-${newAssetId}-${optionId}`;
               }}
               onReturnToHub={onBack}
             />
           )}
           
           <InterviewsManager 
             assetId={assetId}
             initialConfig={interviewConfig || { 
               numberOfInterviews: researchPlanConfig?.numberOfInterviews || 3, 
               selectedAssets: [] 
             }}
             researchPlanConfig={researchPlanConfig}
             onNavigateToAsset={(newAssetId) => {
               window.location.hash = `research-${newAssetId}-${optionId}`;
             }}
             onReturnToHub={onBack}
           />
         </div>
       </div>
     );
  }

  // Special handling for canvas-workshop - show manager with status dropdown
  if (optionId === 'canvas-workshop') {
    // Map optionId to methodType
    const methodType: ResearchMethodType = 'workshop';
    
    // Get all assets that have been unlocked in the research plan
    const unlockedAssets = researchPlanConfig?.unlockedAssets 
      ? mockBrandAssets.filter(asset => researchPlanConfig.unlockedAssets.includes(asset.id))
      : mockBrandAssets;
    
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border z-10">
          <div className="max-w-6xl mx-auto px-8 py-4">
            <Button variant="ghost" onClick={onBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Asset
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* Session Navigator */}
          {researchPlanConfig?.entryMode === 'bundle' && unlockedAssets.length > 1 && (
            <SessionNavigator
              currentAssetId={assetId}
              currentMethodType={methodType}
              allAssets={unlockedAssets}
              onNavigateToAsset={(newAssetId) => {
                // Navigate to the same method but different asset
                window.location.hash = `research-${newAssetId}-${optionId}`;
              }}
              onReturnToHub={onBack}
            />
          )}
          
          <CanvasWorkshopManager onBack={onBack} />
        </div>
      </div>
    );
  }

  // Special handling for questionnaire
  if (optionId === 'questionnaire') {
    // Map optionId to methodType
    const methodType: ResearchMethodType = 'questionnaire';
    
    // Get all assets that have been unlocked in the research plan
    const unlockedAssets = researchPlanConfig?.unlockedAssets 
      ? mockBrandAssets.filter(asset => researchPlanConfig.unlockedAssets.includes(asset.id))
      : mockBrandAssets;
    
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border z-10">
          <div className="max-w-6xl mx-auto px-8 py-4">
            <Button variant="ghost" onClick={onBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Asset
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* Session Navigator */}
          {researchPlanConfig?.entryMode === 'bundle' && unlockedAssets.length > 1 && (
            <SessionNavigator
              currentAssetId={assetId}
              currentMethodType={methodType}
              allAssets={unlockedAssets}
              onNavigateToAsset={(newAssetId) => {
                // Navigate to the same method but different asset
                window.location.hash = `research-${newAssetId}-${optionId}`;
              }}
              onReturnToHub={onBack}
            />
          )}
          
          <QuestionnaireManager 
            assetId={assetId}
            initialConfig={{ 
              numberOfQuestionnaires: researchPlanConfig?.numberOfQuestionnaires || 3, 
              selectedAssets: [] 
            }}
            researchPlanConfig={researchPlanConfig}
            onNavigateToAsset={(newAssetId) => {
              window.location.hash = `research-${newAssetId}-${optionId}`;
            }}
            onReturnToHub={onBack}
          />
        </div>
      </div>
    );
  }

  // Special handling for other tools
  if (optionId === 'future-visioning' || optionId === 'competitive-analysis' || 
      optionId === 'mission-workshop' || optionId === 'values-alignment' ||
      optionId === 'archetype-assessment' || optionId === 'values-workshop') {
    
    const toolConfigs: Record<string, any> = {
      'future-visioning': {
        toolName: "Future Visioning",
        toolDescription: "Strategic foresight and vision planning session",
        toolIcon: Target,
        price: 180,
        duration: "3-4 hours",
        deliverables: "Vision statement, strategic roadmap",
        includedItems: [
          'Facilitated visioning workshop',
          'Trend analysis and future scenarios',
          'Vision statement development',
          'Strategic alignment exercises',
          'Comprehensive vision document',
          'Implementation roadmap'
        ]
      },
      'competitive-analysis': {
        toolName: "Competitive Analysis",
        toolDescription: "In-depth analysis of market competitors and positioning",
        toolIcon: TrendingUp,
        price: 180,
        duration: "2-3 weeks",
        deliverables: "Competitive analysis report, positioning matrix",
        includedItems: [
          'Comprehensive competitor research',
          'Market positioning analysis',
          'SWOT analysis for top competitors',
          'Differentiation opportunities identification',
          'Detailed insights report',
          'Strategic recommendations'
        ]
      },
      'mission-workshop': {
        toolName: "Mission Workshop",
        toolDescription: "Collaborative session to define your organization's mission",
        toolIcon: Target,
        price: 0,
        duration: "2-3 hours",
        deliverables: "Mission statement, alignment document",
        includedItems: [
          'Facilitated mission definition workshop',
          'Team alignment exercises',
          'Mission statement development',
          'Values integration activities',
          'Mission canvas and documentation',
          'Implementation guidelines'
        ]
      },
      'values-alignment': {
        toolName: "Values Alignment",
        toolDescription: "Align organizational values with behaviors and culture",
        toolIcon: Heart,
        price: 120,
        duration: "2-3 hours",
        deliverables: "Values framework, behavior guidelines",
        includedItems: [
          'Values identification workshop',
          'Behavior mapping exercises',
          'Culture alignment activities',
          'Values statement development',
          'Implementation framework',
          'Team alignment toolkit'
        ]
      },
      'archetype-assessment': {
        toolName: "Archetype Assessment",
        toolDescription: "Identify and define your brand's personality archetype",
        toolIcon: Users,
        price: 0,
        duration: "1-2 hours",
        deliverables: "Archetype profile, personality guide",
        includedItems: [
          'Comprehensive archetype assessment',
          'Brand personality profiling',
          'Archetype alignment workshop',
          'Personality trait mapping',
          'Brand voice guidelines',
          'Implementation recommendations'
        ]
      },
      'values-workshop': {
        toolName: "Values Workshop",
        toolDescription: "Interactive session to define core organizational values",
        toolIcon: Heart,
        price: 0,
        duration: "2-3 hours",
        deliverables: "Values framework, integration guide",
        includedItems: [
          'Facilitated values discovery workshop',
          'Team collaboration exercises',
          'Values prioritization activities',
          'Values statement creation',
          'Behavioral guidelines development',
          'Implementation roadmap'
        ]
      }
    };

    const config = toolConfigs[optionId];
    
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border z-10">
          <div className="max-w-6xl mx-auto px-8 py-4">
            <Button variant="ghost" onClick={onBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Asset
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-8 py-8">
          <GenericToolManager {...config} onBack={onBack} />
        </div>
      </div>
    );
  }

  if (!result) {
    // No results found - show the work interface instead of error
    // This allows users to see the research interface even without results
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border z-10">
          <div className="max-w-6xl mx-auto px-8 py-4">
            <Button variant="ghost" onClick={onBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Asset
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Research Interface</CardTitle>
              <CardDescription>
                Start working on this validation method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Ready to Start</h3>
                <p className="text-muted-foreground mb-6">
                  This validation method interface is ready for you to begin your work.
                </p>
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Begin Research
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Asset
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-semibold">{result.name}</h1>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Completed: {new Date(result.completedDate).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Updated: {new Date(result.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className="text-right ml-6">
              <div className="flex items-center mb-2">
                <span className="text-sm text-muted-foreground mr-2">Confidence Score</span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {result.confidence}%
                </Badge>
              </div>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Key Insights
                </CardTitle>
                <CardDescription>
                  Main findings from the research analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.keyInsights.map((insight: string, index: number) => (
                    <div key={index} className="flex items-start">
                      <Target className="h-4 w-4 mr-3 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Metrics Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>
                  Quantitative analysis results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(result.metrics).map(([metric, value], index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">
                          {metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        <span className="text-sm font-semibold">{value}/10</span>
                      </div>
                      <Progress value={(value as number) * 10} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Recommendations
                </CardTitle>
                <CardDescription>
                  Actionable next steps based on the findings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.recommendations.map((recommendation: string, index: number) => (
                    <div key={index} className="flex items-start p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <AlertCircle className="h-4 w-4 mr-3 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span>{recommendation}</span>
                      </div>
                      <Button variant="outline" size="sm" className="ml-3">
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Full Report
                </Button>
                <Button variant="outline" className="w-full">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Schedule Follow-up
                </Button>
                <Button variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}