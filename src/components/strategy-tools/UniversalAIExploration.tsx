import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import {
  Bot,
  Sparkles,
  TrendingUp,
  Target,
  Lightbulb,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Edit3,
  BarChart3,
  Users,
  Zap,
  RefreshCw,
  FileText,
  ChevronRight,
  Brain,
  Award,
  Copy,
  Download,
  Calendar,
  DollarSign,
  MessageSquare,
  Package,
  Rocket,
  Heart,
  Globe,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Share2,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StrategyTool } from '../../types/strategy';

interface UniversalAIExplorationProps {
  tool: StrategyTool;
  onBack: () => void;
  onComplete?: (results: any) => void;
}

type AnalysisStep = 'context' | 'processing' | 'insights' | 'review' | 'summary';

interface QuestionConfig {
  id: string;
  section: string;
  label: string;
  placeholder: string;
  rows: number;
  required: boolean;
}

interface InsightConfig {
  title: string;
  description: string;
  confidence: number;
  icon: any;
  type?: 'success' | 'warning' | 'info';
}

interface VersionEntry {
  id: string;
  timestamp: Date;
  answers: Record<string, string>;
  content: string;
  insights: InsightConfig[];
}

// Question templates voor verschillende tool types
const getQuestionsForTool = (tool: StrategyTool): QuestionConfig[] => {
  const baseQuestions: Record<string, QuestionConfig[]> = {
    // Golden Circle / Brand Foundation vragen
    'golden-circle': [
      {
        id: 'purpose',
        section: 'Purpose & Beliefs',
        label: 'What is your core belief or conviction?',
        placeholder: 'What fundamental truth drives your organization? What do you believe that others might not?',
        rows: 3,
        required: true
      },
      {
        id: 'impact',
        section: 'Purpose & Beliefs',
        label: 'What impact do you want to make?',
        placeholder: 'Beyond making money, what change do you want to create in the world?',
        rows: 3,
        required: true
      },
      {
        id: 'values',
        section: 'Purpose & Beliefs',
        label: 'What are your core values?',
        placeholder: 'List 3-5 values that guide your decisions and behavior',
        rows: 2,
        required: false
      },
      {
        id: 'uniqueApproach',
        section: 'Process & Differentiation',
        label: 'What makes your approach unique?',
        placeholder: 'How do you do things differently? What is your unique methodology or process?',
        rows: 3,
        required: true
      },
      {
        id: 'proof',
        section: 'Process & Differentiation',
        label: 'What proof points demonstrate your capability?',
        placeholder: 'Examples, case studies, or evidence that shows your approach works',
        rows: 2,
        required: false
      },
      {
        id: 'targetAudience',
        section: 'Customer & Market',
        label: 'Who is your ideal customer?',
        placeholder: 'Be specific about demographics, psychographics, and behaviors',
        rows: 3,
        required: true
      },
      {
        id: 'customerBenefit',
        section: 'Customer & Market',
        label: 'What specific benefit do customers receive?',
        placeholder: 'What tangible outcomes or transformations do you deliver?',
        rows: 2,
        required: true
      }
    ],

    // Campaign Strategy vragen
    'campaign': [
      {
        id: 'objective',
        section: 'Campaign Goals',
        label: 'What is the primary campaign objective?',
        placeholder: 'e.g., Launch new product, increase awareness by 30%, drive 500 conversions',
        rows: 2,
        required: true
      },
      {
        id: 'kpis',
        section: 'Campaign Goals',
        label: 'What are your key KPIs?',
        placeholder: 'How will you measure success? (impressions, clicks, conversions, revenue, etc.)',
        rows: 2,
        required: true
      },
      {
        id: 'targetAudience',
        section: 'Audience',
        label: 'Who are you trying to reach?',
        placeholder: 'Describe demographics, psychographics, behaviors, pain points',
        rows: 3,
        required: true
      },
      {
        id: 'customerInsight',
        section: 'Audience',
        label: 'What key insight do you have about your audience?',
        placeholder: 'A truth about their behavior, needs, or motivations',
        rows: 2,
        required: false
      },
      {
        id: 'keyMessage',
        section: 'Messaging',
        label: 'What is your key message?',
        placeholder: 'The one thing you want your audience to remember',
        rows: 2,
        required: true
      },
      {
        id: 'valueProposition',
        section: 'Messaging',
        label: 'What is your value proposition?',
        placeholder: 'Why should they choose you over alternatives?',
        rows: 2,
        required: true
      },
      {
        id: 'channels',
        section: 'Channels & Tactics',
        label: 'Which channels will you use?',
        placeholder: 'Social media, email, paid ads, content, events, PR, partnerships, etc.',
        rows: 2,
        required: true
      },
      {
        id: 'creative',
        section: 'Channels & Tactics',
        label: 'What creative approach will you take?',
        placeholder: 'Visual style, tone, format, storytelling approach',
        rows: 2,
        required: false
      },
      {
        id: 'budget',
        section: 'Resources',
        label: 'What is your estimated budget range?',
        placeholder: 'Small (<$10k), Medium ($10k-50k), Large ($50k-200k), Enterprise (>$200k)',
        rows: 1,
        required: false
      },
      {
        id: 'timeline',
        section: 'Timeline',
        label: 'What is your campaign timeline?',
        placeholder: 'When should it launch? How long will it run? Key milestones?',
        rows: 2,
        required: true
      }
    ],

    // Content Strategy vragen
    'content': [
      {
        id: 'contentGoals',
        section: 'Content Goals',
        label: 'What do you want to achieve with content?',
        placeholder: 'Brand awareness, lead generation, thought leadership, community building, etc.',
        rows: 2,
        required: true
      },
      {
        id: 'audienceNeeds',
        section: 'Audience',
        label: 'What are your audience\'s information needs?',
        placeholder: 'What questions do they have? What problems are they trying to solve?',
        rows: 3,
        required: true
      },
      {
        id: 'brandVoice',
        section: 'Brand Voice',
        label: 'How would you describe your brand voice?',
        placeholder: 'Professional, friendly, authoritative, playful, educational, inspiring, etc.',
        rows: 2,
        required: true
      },
      {
        id: 'toneGuidelines',
        section: 'Brand Voice',
        label: 'What are your tone do\'s and don\'ts?',
        placeholder: 'We are [X], we are not [Y]. E.g., "We are conversational, not stuffy"',
        rows: 2,
        required: false
      },
      {
        id: 'contentTopics',
        section: 'Topics & Themes',
        label: 'What topics and themes will you cover?',
        placeholder: 'List 5-7 key topics that align with your expertise and audience needs',
        rows: 3,
        required: true
      },
      {
        id: 'contentPillars',
        section: 'Topics & Themes',
        label: 'What are your content pillars?',
        placeholder: 'The 3-4 main categories that organize your content strategy',
        rows: 2,
        required: true
      },
      {
        id: 'contentFormats',
        section: 'Content Formats',
        label: 'What content formats will you create?',
        placeholder: 'Blog posts, videos, podcasts, infographics, case studies, webinars, etc.',
        rows: 2,
        required: true
      },
      {
        id: 'distribution',
        section: 'Distribution',
        label: 'How will you distribute your content?',
        placeholder: 'Channels, platforms, partnerships, amplification strategies',
        rows: 2,
        required: true
      },
      {
        id: 'frequency',
        section: 'Publishing',
        label: 'How often will you publish content?',
        placeholder: 'Daily, weekly, monthly? Break down by format and channel',
        rows: 2,
        required: true
      }
    ],

    // GTM Strategy vragen
    'gtm': [
      {
        id: 'offering',
        section: 'Offering',
        label: 'What are you launching?',
        placeholder: 'Describe the product, service, or initiative in detail',
        rows: 3,
        required: true
      },
      {
        id: 'marketProblem',
        section: 'Market Problem',
        label: 'What problem does this solve?',
        placeholder: 'What pain point or need does it address? Why is this important now?',
        rows: 3,
        required: true
      },
      {
        id: 'targetMarket',
        section: 'Target Market',
        label: 'Who is your target market?',
        placeholder: 'Define your ideal customer segments, market size, and addressable opportunity',
        rows: 3,
        required: true
      },
      {
        id: 'marketSegments',
        section: 'Target Market',
        label: 'What are your priority market segments?',
        placeholder: 'List and prioritize 2-3 segments you\'ll target first',
        rows: 2,
        required: true
      },
      {
        id: 'valueProposition',
        section: 'Value Proposition',
        label: 'What makes this offering unique?',
        placeholder: 'Your unique selling proposition and competitive advantage',
        rows: 3,
        required: true
      },
      {
        id: 'competitivePosition',
        section: 'Competitive Landscape',
        label: 'Who are your main competitors?',
        placeholder: 'List key competitors and how you differentiate from them',
        rows: 3,
        required: true
      },
      {
        id: 'pricingModel',
        section: 'Pricing',
        label: 'What is your pricing approach?',
        placeholder: 'Pricing model, tiers, positioning (value, premium, competitive)',
        rows: 2,
        required: true
      },
      {
        id: 'distributionChannels',
        section: 'Distribution',
        label: 'How will you reach customers?',
        placeholder: 'Sales channels, partnerships, distribution strategy, online/offline mix',
        rows: 3,
        required: true
      },
      {
        id: 'launchPlan',
        section: 'Launch Plan',
        label: 'What is your launch strategy?',
        placeholder: 'Timeline, phases, launch activities, success metrics',
        rows: 3,
        required: true
      }
    ],

    // Product/Innovation vragen
    'product': [
      {
        id: 'productVision',
        section: 'Vision',
        label: 'What is your product vision?',
        placeholder: 'Describe the ideal future state for your product in 2-3 years',
        rows: 3,
        required: true
      },
      {
        id: 'customerNeeds',
        section: 'Customer Needs',
        label: 'What customer needs are you addressing?',
        placeholder: 'List the key problems, pains, or desires your product solves',
        rows: 3,
        required: true
      },
      {
        id: 'targetUsers',
        section: 'Customer Needs',
        label: 'Who are your target users?',
        placeholder: 'Describe your primary user personas',
        rows: 2,
        required: true
      },
      {
        id: 'coreFeatures',
        section: 'Features',
        label: 'What are the core features?',
        placeholder: 'Key capabilities that deliver value (focus on must-haves)',
        rows: 3,
        required: true
      },
      {
        id: 'userExperience',
        section: 'Features',
        label: 'What defines the user experience?',
        placeholder: 'How should users feel when using your product?',
        rows: 2,
        required: false
      },
      {
        id: 'differentiation',
        section: 'Differentiation',
        label: 'How is this different from alternatives?',
        placeholder: 'What makes your product stand out? What can\'t competitors easily copy?',
        rows: 3,
        required: true
      },
      {
        id: 'technicalApproach',
        section: 'Implementation',
        label: 'What is your technical approach?',
        placeholder: 'Technology stack, architecture, key technical decisions',
        rows: 2,
        required: false
      },
      {
        id: 'successMetrics',
        section: 'Success Metrics',
        label: 'How will you measure success?',
        placeholder: 'Key metrics and KPIs (usage, retention, satisfaction, revenue, etc.)',
        rows: 2,
        required: true
      },
      {
        id: 'roadmap',
        section: 'Roadmap',
        label: 'What is your product roadmap?',
        placeholder: 'Key milestones and phases over the next 6-12 months',
        rows: 3,
        required: false
      }
    ],

    // Customer Experience vragen
    'cx': [
      {
        id: 'customerGoal',
        section: 'Customer Goals',
        label: 'What is the customer trying to achieve?',
        placeholder: 'Describe the customer\'s objective or desired outcome',
        rows: 2,
        required: true
      },
      {
        id: 'journeyStages',
        section: 'Journey Stages',
        label: 'What are the key stages in the customer journey?',
        placeholder: 'Awareness, Consideration, Purchase, Onboarding, Usage, Renewal, etc.',
        rows: 2,
        required: true
      },
      {
        id: 'touchpoints',
        section: 'Touchpoints',
        label: 'What are the key customer touchpoints?',
        placeholder: 'List all interactions customers have with your brand across channels',
        rows: 3,
        required: true
      },
      {
        id: 'painPoints',
        section: 'Pain Points',
        label: 'What are current pain points?',
        placeholder: 'Where do customers struggle, get frustrated, or drop off?',
        rows: 3,
        required: true
      },
      {
        id: 'emotionalJourney',
        section: 'Emotional Journey',
        label: 'What emotions do customers experience?',
        placeholder: 'How do feelings change throughout the journey?',
        rows: 2,
        required: false
      },
      {
        id: 'desiredExperience',
        section: 'Desired Experience',
        label: 'What is the ideal customer experience?',
        placeholder: 'How should customers feel at each stage? What should be effortless?',
        rows: 3,
        required: true
      },
      {
        id: 'opportunities',
        section: 'Opportunities',
        label: 'Where are opportunities for improvement?',
        placeholder: 'Areas where you can exceed expectations or remove friction',
        rows: 3,
        required: true
      },
      {
        id: 'metrics',
        section: 'Metrics',
        label: 'How will you measure experience quality?',
        placeholder: 'NPS, CSAT, CES, retention, etc.',
        rows: 2,
        required: false
      }
    ],

    // Generic/Default vragen
    'generic': [
      {
        id: 'objective',
        section: 'Objective',
        label: 'What do you want to achieve?',
        placeholder: 'Describe your primary goal or objective in detail',
        rows: 3,
        required: true
      },
      {
        id: 'context',
        section: 'Context',
        label: 'What is the current situation?',
        placeholder: 'Provide relevant background, market context, and current state',
        rows: 3,
        required: true
      },
      {
        id: 'stakeholders',
        section: 'Stakeholders',
        label: 'Who are the key stakeholders?',
        placeholder: 'List people or groups involved and their interests',
        rows: 2,
        required: false
      },
      {
        id: 'challenges',
        section: 'Challenges',
        label: 'What challenges or constraints do you face?',
        placeholder: 'List any obstacles, limitations, or risks',
        rows: 3,
        required: true
      },
      {
        id: 'resources',
        section: 'Resources',
        label: 'What resources do you have available?',
        placeholder: 'Budget, team, time, tools, partnerships, etc.',
        rows: 2,
        required: false
      },
      {
        id: 'success',
        section: 'Success Criteria',
        label: 'How will you measure success?',
        placeholder: 'Define what success looks like and how you\'ll track it',
        rows: 2,
        required: true
      }
    ]
  };

  // Map tool categories to question sets
  if (tool.id.includes('golden') || tool.id.includes('mission') || tool.id.includes('vision') || 
      tool.id.includes('values') || tool.id.includes('purpose') || tool.id.includes('positioning')) {
    return baseQuestions['golden-circle'];
  } else if (tool.id.includes('campaign') || tool.id.includes('marketing')) {
    return baseQuestions['campaign'];
  } else if (tool.id.includes('content') || tool.id.includes('messaging')) {
    return baseQuestions['content'];
  } else if (tool.id.includes('gtm') || tool.id.includes('go-to-market') || tool.id.includes('launch') || 
             tool.id.includes('market-entry')) {
    return baseQuestions['gtm'];
  } else if (tool.id.includes('product') || tool.id.includes('innovation') || tool.id.includes('feature')) {
    return baseQuestions['product'];
  } else if (tool.id.includes('customer') || tool.id.includes('journey') || tool.id.includes('experience') || 
             tool.id.includes('touchpoint') || tool.id.includes('loyalty')) {
    return baseQuestions['cx'];
  } else {
    return baseQuestions['generic'];
  }
};

// Generate insights based on tool type
const generateInsightsForTool = (tool: StrategyTool, answers: Record<string, string>): InsightConfig[] => {
  const toolId = tool.id;
  
  if (toolId.includes('campaign') || toolId.includes('marketing')) {
    return [
      {
        title: 'Audience Alignment',
        description: 'Strong alignment between message and target audience needs',
        confidence: 91,
        icon: Users,
        type: 'success'
      },
      {
        title: 'Channel Strategy',
        description: 'Multi-channel approach covers key customer touchpoints',
        confidence: 87,
        icon: Globe,
        type: 'success'
      },
      {
        title: 'Message Clarity',
        description: 'Clear value proposition with compelling call-to-action',
        confidence: 89,
        icon: MessageSquare,
        type: 'success'
      },
      {
        title: 'Timeline Feasibility',
        description: 'Consider adding 2-week buffer for creative production',
        confidence: 75,
        icon: Clock,
        type: 'warning'
      }
    ];
  } else if (toolId.includes('content')) {
    return [
      {
        title: 'Content-Market Fit',
        description: 'Topics align well with audience information needs',
        confidence: 93,
        icon: Target,
        type: 'success'
      },
      {
        title: 'Distribution Strategy',
        description: 'Strong multi-channel distribution approach',
        confidence: 86,
        icon: Share2,
        type: 'success'
      },
      {
        title: 'Production Capacity',
        description: 'Publishing frequency may require dedicated resources',
        confidence: 72,
        icon: AlertCircle,
        type: 'warning'
      }
    ];
  } else if (toolId.includes('gtm') || toolId.includes('launch')) {
    return [
      {
        title: 'Market Opportunity',
        description: 'Strong product-market fit with clear value proposition',
        confidence: 94,
        icon: TrendingUp,
        type: 'success'
      },
      {
        title: 'Competitive Position',
        description: 'Well-differentiated with sustainable advantages',
        confidence: 88,
        icon: Award,
        type: 'success'
      },
      {
        title: 'Go-to-Market Fit',
        description: 'Distribution channels align with target customer behavior',
        confidence: 85,
        icon: Rocket,
        type: 'success'
      },
      {
        title: 'Pricing Strategy',
        description: 'Consider value-based pricing to maximize margins',
        confidence: 78,
        icon: DollarSign,
        type: 'info'
      }
    ];
  } else if (toolId.includes('product') || toolId.includes('innovation')) {
    return [
      {
        title: 'Vision Clarity',
        description: 'Clear product vision with strong customer focus',
        confidence: 92,
        icon: Eye,
        type: 'success'
      },
      {
        title: 'Feature Prioritization',
        description: 'Core features address key customer pain points',
        confidence: 89,
        icon: Layers,
        type: 'success'
      },
      {
        title: 'Differentiation',
        description: 'Unique approach with defensible competitive advantages',
        confidence: 87,
        icon: Zap,
        type: 'success'
      },
      {
        title: 'Roadmap Balance',
        description: 'Consider balancing quick wins with long-term bets',
        confidence: 74,
        icon: BarChart3,
        type: 'warning'
      }
    ];
  } else if (toolId.includes('customer') || toolId.includes('experience')) {
    return [
      {
        title: 'Journey Mapping',
        description: 'Comprehensive view of customer touchpoints and emotions',
        confidence: 90,
        icon: Users,
        type: 'success'
      },
      {
        title: 'Pain Point Clarity',
        description: 'Well-identified friction points with clear solutions',
        confidence: 88,
        icon: CheckCircle2,
        type: 'success'
      },
      {
        title: 'Experience Design',
        description: 'Strong focus on emotional journey and customer delight',
        confidence: 86,
        icon: Heart,
        type: 'success'
      },
      {
        title: 'Measurement Framework',
        description: 'Consider adding real-time feedback mechanisms',
        confidence: 76,
        icon: BarChart3,
        type: 'info'
      }
    ];
  } else {
    // Generic insights
    return [
      {
        title: 'Strategic Alignment',
        description: 'Strategy aligns well with stated objectives and resources',
        confidence: 90,
        icon: Target,
        type: 'success'
      },
      {
        title: 'Feasibility',
        description: 'Approach is realistic given constraints and timeline',
        confidence: 85,
        icon: CheckCircle2,
        type: 'success'
      },
      {
        title: 'Market Opportunity',
        description: 'Strong potential for success in target market',
        confidence: 83,
        icon: TrendingUp,
        type: 'success'
      },
      {
        title: 'Risk Mitigation',
        description: 'Consider developing contingency plans for key risks',
        confidence: 74,
        icon: AlertCircle,
        type: 'warning'
      }
    ];
  }
};

export function UniversalAIExploration({ tool, onBack, onComplete }: UniversalAIExplorationProps) {
  const [currentStep, setCurrentStep] = useState<AnalysisStep>('context');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  
  const questions = getQuestionsForTool(tool);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // AI-generated outputs
  const [insights, setInsights] = useState<InsightConfig[]>([]);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [editMode, setEditMode] = useState(false);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Simulate AI processing
  useEffect(() => {
    if (currentStep === 'processing') {
      const stages = [
        { progress: 15, stage: `Analyzing ${tool.name.toLowerCase()} context...` },
        { progress: 30, stage: 'Processing strategic inputs...' },
        { progress: 50, stage: 'Generating insights and recommendations...' },
        { progress: 70, stage: 'Creating structured output...' },
        { progress: 85, stage: 'Optimizing strategy framework...' },
        { progress: 100, stage: 'Finalizing deliverables...' }
      ];

      let currentStageIndex = 0;
      const interval = setInterval(() => {
        if (currentStageIndex < stages.length) {
          setProcessingProgress(stages[currentStageIndex].progress);
          setProcessingStage(stages[currentStageIndex].stage);
          currentStageIndex++;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            generateOutput();
            setCurrentStep('insights');
          }, 500);
        }
      }, 700);

      return () => clearInterval(interval);
    }
  }, [currentStep, tool.name]);

  const generateOutput = () => {
    // Generate tool-specific content
    const mockContent = generateContentForTool(tool, answers);
    setGeneratedContent(mockContent);

    // Generate tool-specific insights
    const mockInsights = generateInsightsForTool(tool, answers);
    setInsights(mockInsights);

    // Save version
    const newVersion: VersionEntry = {
      id: `v${versions.length + 1}`,
      timestamp: new Date(),
      answers: { ...answers },
      content: mockContent,
      insights: mockInsights
    };
    setVersions([...versions, newVersion]);
  };

  const handleStartAnalysis = () => {
    // Check if required questions are answered
    const requiredAnswered = questions
      .filter(q => q.required)
      .every(q => answers[q.id]?.trim());

    if (!requiredAnswered) {
      alert('Please answer all required questions (marked with *)');
      return;
    }
    setCurrentStep('processing');
  };

  const handleRegenerateWithChanges = () => {
    setCurrentStep('processing');
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    alert('✅ Copied to clipboard!');
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tool.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadVersion = (version: VersionEntry) => {
    setAnswers(version.answers);
    setGeneratedContent(version.content);
    setInsights(version.insights);
    setShowVersionHistory(false);
  };

  const steps = [
    { id: 'context', label: 'Context', icon: FileText },
    { id: 'processing', label: 'AI Analysis', icon: Brain },
    { id: 'insights', label: 'Insights', icon: Lightbulb },
    { id: 'review', label: 'Review', icon: Edit3 },
    { id: 'summary', label: 'Complete', icon: Award }
  ];

  const getCurrentStepIndex = () => steps.findIndex(s => s.id === currentStep);

  // Group questions by section
  const groupedQuestions = questions.reduce((acc, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {} as Record<string, QuestionConfig[]>);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {tool.name}
          </Button>

          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Bot className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl">AI-Powered {tool.name}</h1>
                  <Badge variant="secondary" className="bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-400">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Generated
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {tool.tagline}
                </p>
              </div>
            </div>

            {/* Version History Button */}
            {versions.length > 0 && currentStep !== 'processing' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                History ({versions.length})
              </Button>
            )}
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = getCurrentStepIndex() > index;
              
              return (
                <React.Fragment key={step.id}>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-violet-100 dark:bg-violet-900/20 text-violet-900 dark:text-violet-400' 
                      : isCompleted 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-900 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <StepIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">{step.label}</span>
                    {isCompleted && <CheckCircle className="h-4 w-4 ml-1" />}
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Version History Sidebar */}
        <AnimatePresence>
          {showVersionHistory && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed right-0 top-0 h-full w-80 bg-background border-l border-border shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Version History</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVersionHistory(false)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>

                {versions.map((version, index) => (
                  <Card
                    key={version.id}
                    className="cursor-pointer hover:border-violet-300 transition-colors"
                    onClick={() => handleLoadVersion(version)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{version.id}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {version.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {version.timestamp.toLocaleDateString()}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {version.insights.length} insights
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* Step 1: Context Input */}
          {currentStep === 'context' && (
            <motion.div
              key="context"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Strategic Context
                  </CardTitle>
                  <CardDescription>
                    Provide information to generate your {tool.name.toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {Object.entries(groupedQuestions).map(([section, sectionQuestions], sectionIndex) => (
                    <div key={section} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          sectionIndex === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                          sectionIndex === 1 ? 'bg-purple-100 dark:bg-purple-900/30' :
                          sectionIndex === 2 ? 'bg-green-100 dark:bg-green-900/30' :
                          sectionIndex === 3 ? 'bg-blue-100 dark:bg-blue-900/30' :
                          'bg-pink-100 dark:bg-pink-900/30'
                        }`}>
                          <span className={`text-xs font-bold ${
                            sectionIndex === 0 ? 'text-yellow-600 dark:text-yellow-400' :
                            sectionIndex === 1 ? 'text-purple-600 dark:text-purple-400' :
                            sectionIndex === 2 ? 'text-green-600 dark:text-green-400' :
                            sectionIndex === 3 ? 'text-blue-600 dark:text-blue-400' :
                            'text-pink-600 dark:text-pink-400'
                          }`}>{sectionIndex + 1}</span>
                        </div>
                        <h3 className="font-semibold">{section}</h3>
                      </div>

                      {sectionQuestions.map((question) => (
                        <div key={question.id} className="space-y-2">
                          <Label htmlFor={question.id}>
                            {question.label}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <Textarea
                            id={question.id}
                            placeholder={question.placeholder}
                            rows={question.rows}
                            value={answers[question.id] || ''}
                            onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                            className="resize-none"
                          />
                        </div>
                      ))}
                    </div>
                  ))}

                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900 dark:text-blue-400 mb-1">AI Analysis Tips</p>
                        <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                          <li>• Be specific and detailed in your answers</li>
                          <li>• Include concrete examples and data where possible</li>
                          <li>• The more context you provide, the better the AI output</li>
                          <li>• You can regenerate with different inputs anytime</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                {versions.length > 0 && (
                  <Button variant="outline" onClick={() => setShowVersionHistory(true)}>
                    <Clock className="h-4 w-4 mr-2" />
                    View History
                  </Button>
                )}
                <Button size="lg" onClick={handleStartAnalysis} className="gap-2">
                  Start AI Analysis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: AI Processing */}
          {currentStep === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <Card className="border-0 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-100 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-fuchsia-950/30 p-12">
                  <div className="text-center space-y-6">
                    <motion.div
                      animate={{ 
                        rotate: 360,
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                        scale: { duration: 1, repeat: Infinity }
                      }}
                      className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg"
                    >
                      <Brain className="h-10 w-10 text-white" />
                    </motion.div>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">AI Analysis in Progress</h2>
                      <p className="text-muted-foreground text-lg">
                        Generating your {tool.name.toLowerCase()}...
                      </p>
                    </div>

                    <div className="max-w-md mx-auto space-y-3">
                      <Progress value={processingProgress} className="h-3" />
                      <motion.p
                        key={processingStage}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-medium text-violet-700 dark:text-violet-400"
                      >
                        {processingStage}
                      </motion.p>
                      <p className="text-sm text-muted-foreground">
                        {processingProgress}% Complete
                      </p>
                    </div>

                    {/* Processing indicators */}
                    <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-6">
                      <motion.div
                        initial={{ opacity: 0.3 }}
                        animate={{ opacity: processingProgress > 20 ? 1 : 0.3 }}
                        className="text-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 mx-auto mb-2 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-violet-600" />
                        </div>
                        <p className="text-xs text-muted-foreground">Analyzing</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0.3 }}
                        animate={{ opacity: processingProgress > 50 ? 1 : 0.3 }}
                        className="text-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 mx-auto mb-2 flex items-center justify-center">
                          <Lightbulb className="h-5 w-5 text-violet-600" />
                        </div>
                        <p className="text-xs text-muted-foreground">Generating</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0.3 }}
                        animate={{ opacity: processingProgress > 80 ? 1 : 0.3 }}
                        className="text-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 mx-auto mb-2 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-violet-600" />
                        </div>
                        <p className="text-xs text-muted-foreground">Optimizing</p>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Insights */}
          {currentStep === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-600" />
                    AI-Generated Insights
                  </CardTitle>
                  <CardDescription>
                    Strategic insights for your {tool.name.toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.map((insight, index) => {
                      const InsightIcon = insight.icon;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className={`border-2 transition-colors ${
                            insight.type === 'success' ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20' :
                            insight.type === 'warning' ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20' :
                            'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
                          }`}>
                            <CardContent className="pt-6">
                              <div className="flex items-start gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${
                                  insight.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                                  insight.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                                  'bg-blue-100 dark:bg-blue-900/30'
                                }`}>
                                  <InsightIcon className={`h-5 w-5 ${
                                    insight.type === 'success' ? 'text-green-600 dark:text-green-400' :
                                    insight.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-blue-600 dark:text-blue-400'
                                  }`} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-semibold">{insight.title}</h4>
                                    <Badge variant="secondary" className="text-xs">
                                      {insight.confidence}%
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {insight.description}
                                  </p>
                                </div>
                              </div>
                              {/* Confidence bar */}
                              <div className="mt-3">
                                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${insight.confidence}%` }}
                                    transition={{ duration: 1, delay: index * 0.1 }}
                                    className={`h-full ${
                                      insight.type === 'success' ? 'bg-green-500' :
                                      insight.type === 'warning' ? 'bg-yellow-500' :
                                      'bg-blue-500'
                                    }`}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('context')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Context
                </Button>
                <Button size="lg" onClick={() => setCurrentStep('review')} className="gap-2">
                  Review Output
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Edit3 className="h-5 w-5" />
                        Review & Refine
                      </CardTitle>
                      <CardDescription>
                        Review and edit the AI-generated {tool.name.toLowerCase()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerateWithChanges}
                        className="gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Regenerate
                      </Button>
                      <Button
                        variant={editMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditMode(!editMode)}
                        className="gap-2"
                      >
                        {editMode ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Save Changes
                          </>
                        ) : (
                          <>
                            <Edit3 className="h-4 w-4" />
                            Edit
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editMode ? (
                    <Textarea
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      rows={20}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <div className="p-6 bg-muted rounded-lg border max-h-[600px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {generatedContent}
                      </pre>
                    </div>
                  )}

                  {/* Export Options */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyToClipboard}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy to Clipboard
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportMarkdown}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export as Markdown
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('insights')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Insights
                </Button>
                <Button size="lg" onClick={() => setCurrentStep('summary')} className="gap-2">
                  Finalize Strategy
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Summary */}
          {currentStep === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Success Header */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/30 p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg flex-shrink-0">
                      <Award className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-2">{tool.name} Complete! 🎉</h2>
                      <p className="text-lg text-muted-foreground mb-4">
                        Your AI-generated strategy is ready to implement
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {insights.length} Insights Generated
                        </Badge>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI-Powered
                        </Badge>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                          <Clock className="h-3 w-3 mr-1" />
                          {versions.length} Version{versions.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 mx-auto mb-3 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-2xl font-bold mb-1">
                        {insights.filter(i => i.type === 'success').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Strengths Identified</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 mx-auto mb-3 flex items-center justify-center">
                        <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-2xl font-bold mb-1">
                        {insights.filter(i => i.type === 'info').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Opportunities</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 mx-auto mb-3 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <p className="text-2xl font-bold mb-1">
                        {insights.filter(i => i.type === 'warning').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Considerations</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Output Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Output */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Your {tool.name}</CardTitle>
                      <CardDescription>
                        AI-generated strategy ready for implementation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="p-6 bg-muted rounded-lg border max-h-[500px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                          {generatedContent}
                        </pre>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyToClipboard}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleExportMarkdown}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Export Markdown
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Share2 className="h-4 w-4" />
                          Share
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Insights Summary */}
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Key Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {insights.map((insight, index) => {
                        const InsightIcon = insight.icon;
                        return (
                          <div key={index} className="flex items-start gap-2">
                            <div className={`p-1.5 rounded-lg ${
                              insight.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                              insight.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                              'bg-blue-100 dark:bg-blue-900/30'
                            }`}>
                              <InsightIcon className={`h-3.5 w-3.5 ${
                                insight.type === 'success' ? 'text-green-600 dark:text-green-400' :
                                insight.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-blue-600 dark:text-blue-400'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium mb-0.5">{insight.title}</p>
                              <p className="text-xs text-muted-foreground">{insight.confidence}% confidence</p>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Next Steps */}
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Next Steps</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>Share with stakeholders</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>Create implementation timeline</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>Assign responsibilities</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>Set up tracking metrics</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('review')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Review
                </Button>
                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    size="lg" 
                    onClick={() => setCurrentStep('context')}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Create Another
                  </Button>
                  <Button 
                    size="lg" 
                    onClick={() => {
                      onComplete?.({ content: generatedContent, insights });
                      onBack();
                    }} 
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Complete & Save
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Helper function to generate tool-specific content
function generateContentForTool(tool: StrategyTool, answers: Record<string, string>): string {
  const toolId = tool.id;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  let content = `# ${tool.name}\n`;
  content += `Generated: ${date}\n`;
  content += `AI-Powered Strategic Analysis\n\n`;
  content += `${'='.repeat(60)}\n\n`;

  // Tool-specific content generation
  if (toolId.includes('campaign') || toolId.includes('marketing')) {
    content += generateCampaignContent(answers);
  } else if (toolId.includes('content')) {
    content += generateContentStrategyContent(answers);
  } else if (toolId.includes('gtm') || toolId.includes('launch')) {
    content += generateGTMContent(answers);
  } else if (toolId.includes('product') || toolId.includes('innovation')) {
    content += generateProductContent(answers);
  } else if (toolId.includes('customer') || toolId.includes('experience')) {
    content += generateCXContent(answers);
  } else if (toolId.includes('golden') || toolId.includes('mission') || toolId.includes('vision')) {
    content += generateBrandFoundationContent(answers);
  } else {
    content += generateGenericContent(answers);
  }

  content += `\n\n${'='.repeat(60)}\n\n`;
  content += `## Next Steps\n\n`;
  content += `1. **Review & Validate**: Share this strategy with key stakeholders for feedback\n`;
  content += `2. **Create Action Plan**: Break down strategy into concrete tasks and milestones\n`;
  content += `3. **Assign Ownership**: Designate team members responsible for each initiative\n`;
  content += `4. **Set Timeline**: Establish realistic deadlines for each phase\n`;
  content += `5. **Track Progress**: Monitor key metrics and adjust strategy as needed\n\n`;

  content += `---\n\n`;
  content += `*This ${tool.name.toLowerCase()} was generated using AI-powered strategic analysis. `;
  content += `Please review and adapt based on your specific context and requirements.*`;

  return content;
}

function generateCampaignContent(answers: Record<string, string>): string {
  let content = `## Campaign Overview\n\n`;
  content += `**Objective:** ${answers.objective || 'Not specified'}\n`;
  content += `**Target Audience:** ${answers.targetAudience || 'Not specified'}\n`;
  content += `**Timeline:** ${answers.timeline || 'Not specified'}\n\n`;

  content += `## Key Message\n\n`;
  content += `${answers.keyMessage || 'Primary message to be defined'}\n\n`;

  content += `## Value Proposition\n\n`;
  content += `${answers.valueProposition || 'Unique value to be defined'}\n\n`;

  content += `## Channel Strategy\n\n`;
  const channels = answers.channels || 'Channels to be determined';
  content += `**Selected Channels:** ${channels}\n\n`;
  content += `**Rationale:** These channels align with target audience behavior and campaign objectives.\n\n`;

  content += `## Key Performance Indicators (KPIs)\n\n`;
  content += `${answers.kpis || '- Metric 1\n- Metric 2\n- Metric 3'}\n\n`;

  content += `## Budget Allocation\n\n`;
  content += `**Budget Range:** ${answers.budget || 'To be determined'}\n\n`;
  content += `Recommended allocation:\n`;
  content += `- Media: 40-50%\n`;
  content += `- Creative: 20-25%\n`;
  content += `- Technology/Tools: 15-20%\n`;
  content += `- Contingency: 10-15%\n\n`;

  if (answers.creative) {
    content += `## Creative Approach\n\n`;
    content += `${answers.creative}\n\n`;
  }

  content += `## Campaign Phases\n\n`;
  content += `### Phase 1: Pre-Launch (2-3 weeks)\n`;
  content += `- Finalize creative assets\n`;
  content += `- Set up tracking and analytics\n`;
  content += `- Brief all stakeholders\n`;
  content += `- Test landing pages and conversion paths\n\n`;

  content += `### Phase 2: Launch (Week 1-2)\n`;
  content += `- Execute launch activities\n`;
  content += `- Monitor performance closely\n`;
  content += `- Engage with early responses\n`;
  content += `- Make tactical optimizations\n\n`;

  content += `### Phase 3: Optimization (Ongoing)\n`;
  content += `- Analyze performance data\n`;
  content += `- A/B test messaging and creative\n`;
  content += `- Scale successful tactics\n`;
  content += `- Adjust underperforming elements\n\n`;

  content += `### Phase 4: Conclusion & Analysis\n`;
  content += `- Compile final results\n`;
  content += `- Document learnings\n`;
  content += `- Share insights with team\n`;
  content += `- Archive campaign materials\n\n`;

  return content;
}

function generateContentStrategyContent(answers: Record<string, string>): string {
  let content = `## Content Goals\n\n`;
  content += `${answers.contentGoals || 'Primary goals to be defined'}\n\n`;

  content += `## Audience Information Needs\n\n`;
  content += `${answers.audienceNeeds || 'Audience needs to be researched'}\n\n`;

  content += `## Brand Voice & Tone\n\n`;
  content += `**Voice:** ${answers.brandVoice || 'To be defined'}\n\n`;
  if (answers.toneGuidelines) {
    content += `**Tone Guidelines:**\n${answers.toneGuidelines}\n\n`;
  }

  content += `## Content Pillars\n\n`;
  const pillars = answers.contentPillars || 'Pillar 1\nPillar 2\nPillar 3';
  pillars.split('\n').forEach((pillar, index) => {
    if (pillar.trim()) {
      content += `### ${index + 1}. ${pillar.trim()}\n`;
      content += `Focus on providing value through education, inspiration, and practical insights.\n\n`;
    }
  });

  content += `## Content Topics\n\n`;
  content += `${answers.contentTopics || 'Topics to be brainstormed'}\n\n`;

  content += `## Content Formats\n\n`;
  const formats = answers.contentFormats || 'Blog posts, videos, infographics';
  formats.split(',').forEach(format => {
    if (format.trim()) {
      content += `- **${format.trim()}**: [Usage guidelines and best practices]\n`;
    }
  });
  content += `\n`;

  content += `## Distribution Strategy\n\n`;
  content += `${answers.distribution || 'Distribution channels to be selected'}\n\n`;

  content += `## Publishing Calendar\n\n`;
  content += `**Frequency:** ${answers.frequency || 'To be determined'}\n\n`;
  content += `**Weekly Content Mix (Example):**\n`;
  content += `- Monday: Educational blog post\n`;
  content += `- Wednesday: Social media content series\n`;
  content += `- Friday: Visual content (infographic/video)\n\n`;

  content += `## Content Workflow\n\n`;
  content += `1. **Ideation**: Quarterly content planning sessions\n`;
  content += `2. **Creation**: 2-3 week lead time for production\n`;
  content += `3. **Review**: Editorial review and approval process\n`;
  content += `4. **Publication**: Scheduled distribution across channels\n`;
  content += `5. **Promotion**: Amplification through paid and organic tactics\n`;
  content += `6. **Analysis**: Monthly performance reviews and optimization\n\n`;

  content += `## Success Metrics\n\n`;
  content += `- Traffic and reach metrics\n`;
  content += `- Engagement rates (likes, shares, comments)\n`;
  content += `- Lead generation and conversions\n`;
  content += `- SEO rankings and organic traffic\n`;
  content += `- Time on page and content depth\n\n`;

  return content;
}

function generateGTMContent(answers: Record<string, string>): string {
  let content = `## Product/Service Overview\n\n`;
  content += `${answers.offering || 'Offering description to be completed'}\n\n`;

  content += `## Market Problem\n\n`;
  content += `${answers.marketProblem || 'Problem statement to be defined'}\n\n`;

  content += `## Target Market\n\n`;
  content += `${answers.targetMarket || 'Target market to be identified'}\n\n`;

  if (answers.marketSegments) {
    content += `### Priority Segments\n\n`;
    content += `${answers.marketSegments}\n\n`;
  }

  content += `## Value Proposition\n\n`;
  content += `${answers.valueProposition || 'Unique value to be articulated'}\n\n`;

  content += `## Competitive Landscape\n\n`;
  content += `${answers.competitivePosition || 'Competitive analysis to be conducted'}\n\n`;

  content += `## Pricing Strategy\n\n`;
  content += `${answers.pricingModel || 'Pricing approach to be determined'}\n\n`;
  content += `**Positioning:** Value-based pricing aligned with customer ROI\n\n`;

  content += `## Distribution Strategy\n\n`;
  content += `${answers.distributionChannels || 'Distribution channels to be selected'}\n\n`;

  content += `## Go-to-Market Plan\n\n`;
  content += `${answers.launchPlan || 'Launch strategy to be developed'}\n\n`;

  content += `## Launch Timeline\n\n`;
  content += `### Pre-Launch (T-8 weeks)\n`;
  content += `- Finalize product/service offering\n`;
  content += `- Complete positioning and messaging\n`;
  content += `- Develop marketing materials\n`;
  content += `- Train sales and support teams\n`;
  content += `- Set up systems and infrastructure\n\n`;

  content += `### Soft Launch (T-4 weeks)\n`;
  content += `- Beta program with select customers\n`;
  content += `- Gather early feedback\n`;
  content += `- Refine based on learnings\n`;
  content += `- Build initial case studies\n\n`;

  content += `### Public Launch (T-0)\n`;
  content += `- Execute launch campaign\n`;
  content += `- Press and media outreach\n`;
  content += `- Sales enablement activation\n`;
  content += `- Customer onboarding programs\n\n`;

  content += `### Post-Launch (T+4 weeks)\n`;
  content += `- Monitor adoption and usage\n`;
  content += `- Collect customer feedback\n`;
  content += `- Iterate on product and positioning\n`;
  content += `- Scale successful tactics\n\n`;

  content += `## Success Metrics\n\n`;
  content += `**Key Metrics to Track:**\n`;
  content += `- Market penetration rate\n`;
  content += `- Customer acquisition cost (CAC)\n`;
  content += `- Conversion rates by channel\n`;
  content += `- Time to first value\n`;
  content += `- Customer satisfaction (NPS/CSAT)\n`;
  content += `- Revenue and ARR growth\n\n`;

  content += `## Risk Mitigation\n\n`;
  content += `**Key Risks:**\n`;
  content += `1. Market timing and readiness\n`;
  content += `2. Competitive response\n`;
  content += `3. Execution complexity\n`;
  content += `4. Resource constraints\n\n`;

  content += `**Mitigation Strategies:**\n`;
  content += `- Continuous market validation\n`;
  content += `- Flexible response protocols\n`;
  content += `- Phased rollout approach\n`;
  content += `- Clear prioritization framework\n\n`;

  return content;
}

function generateProductContent(answers: Record<string, string>): string {
  let content = `## Product Vision\n\n`;
  content += `${answers.productVision || 'Product vision to be articulated'}\n\n`;

  content += `## Target Users\n\n`;
  content += `${answers.targetUsers || 'User personas to be defined'}\n\n`;

  content += `## Customer Needs\n\n`;
  content += `${answers.customerNeeds || 'Customer needs to be researched'}\n\n`;

  content += `## Core Features\n\n`;
  const features = answers.coreFeatures || 'Feature 1\nFeature 2\nFeature 3';
  features.split('\n').forEach((feature, index) => {
    if (feature.trim()) {
      content += `### ${index + 1}. ${feature.trim()}\n`;
      content += `**Value:** Addresses key user need\n`;
      content += `**Priority:** Must-have\n\n`;
    }
  });

  if (answers.userExperience) {
    content += `## User Experience Principles\n\n`;
    content += `${answers.userExperience}\n\n`;
  }

  content += `## Differentiation\n\n`;
  content += `${answers.differentiation || 'Unique differentiators to be identified'}\n\n`;

  if (answers.technicalApproach) {
    content += `## Technical Approach\n\n`;
    content += `${answers.technicalApproach}\n\n`;
  }

  content += `## Success Metrics\n\n`;
  content += `${answers.successMetrics || 'KPIs to be defined'}\n\n`;

  if (answers.roadmap) {
    content += `## Product Roadmap\n\n`;
    content += `${answers.roadmap}\n\n`;
  } else {
    content += `## Product Roadmap (Example)\n\n`;
    content += `### Q1: Foundation\n`;
    content += `- Core feature development\n`;
    content += `- Beta testing program\n`;
    content += `- Initial user feedback\n\n`;

    content += `### Q2: Enhancement\n`;
    content += `- Feature refinements\n`;
    content += `- Performance optimization\n`;
    content += `- Expanded integrations\n\n`;

    content += `### Q3: Scale\n`;
    content += `- Advanced capabilities\n`;
    content += `- Enterprise features\n`;
    content += `- Platform expansion\n\n`;

    content += `### Q4: Innovation\n`;
    content += `- Next-generation features\n`;
    content += `- AI/ML enhancements\n`;
    content += `- Market expansion\n\n`;
  }

  content += `## Development Principles\n\n`;
  content += `1. **User-Centric**: Always prioritize user needs and feedback\n`;
  content += `2. **Iterative**: Ship early, learn fast, improve continuously\n`;
  content += `3. **Quality**: No compromise on security, performance, reliability\n`;
  content += `4. **Scalable**: Build for today's needs and tomorrow's growth\n`;
  content += `5. **Collaborative**: Cross-functional alignment and communication\n\n`;

  return content;
}

function generateCXContent(answers: Record<string, string>): string {
  let content = `## Customer Goal\n\n`;
  content += `${answers.customerGoal || 'Customer objective to be defined'}\n\n`;

  content += `## Journey Stages\n\n`;
  const stages = answers.journeyStages || 'Awareness, Consideration, Purchase, Usage, Advocacy';
  stages.split(',').forEach((stage, index) => {
    if (stage.trim()) {
      content += `### Stage ${index + 1}: ${stage.trim()}\n`;
      content += `**Customer Activities:** [Key actions taken]\n`;
      content += `**Touchpoints:** [Interaction points]\n`;
      content += `**Goals:** [What customer wants to achieve]\n`;
      content += `**Pain Points:** [Challenges faced]\n\n`;
    }
  });

  content += `## Key Touchpoints\n\n`;
  content += `${answers.touchpoints || 'Touchpoints to be mapped'}\n\n`;

  content += `## Current Pain Points\n\n`;
  content += `${answers.painPoints || 'Pain points to be identified'}\n\n`;

  if (answers.emotionalJourney) {
    content += `## Emotional Journey\n\n`;
    content += `${answers.emotionalJourney}\n\n`;
  }

  content += `## Desired Experience\n\n`;
  content += `${answers.desiredExperience || 'Ideal experience to be designed'}\n\n`;

  content += `## Improvement Opportunities\n\n`;
  content += `${answers.opportunities || 'Opportunities to be discovered'}\n\n`;

  content += `## Experience Design Recommendations\n\n`;
  content += `### 1. Reduce Friction\n`;
  content += `- Simplify complex processes\n`;
  content += `- Remove unnecessary steps\n`;
  content += `- Provide clear guidance\n`;
  content += `- Offer self-service options\n\n`;

  content += `### 2. Add Delight\n`;
  content += `- Personalize interactions\n`;
  content += `- Surprise and reward\n`;
  content += `- Exceed expectations\n`;
  content += `- Create memorable moments\n\n`;

  content += `### 3. Enable Success\n`;
  content += `- Provide education and resources\n`;
  content += `- Offer proactive support\n`;
  content += `- Celebrate achievements\n`;
  content += `- Build community connections\n\n`;

  if (answers.metrics) {
    content += `## Success Metrics\n\n`;
    content += `${answers.metrics}\n\n`;
  } else {
    content += `## Success Metrics\n\n`;
    content += `- **NPS (Net Promoter Score)**: Overall satisfaction and loyalty\n`;
    content += `- **CSAT (Customer Satisfaction)**: Specific interaction quality\n`;
    content += `- **CES (Customer Effort Score)**: Ease of experience\n`;
    content += `- **Retention Rate**: Customer loyalty over time\n`;
    content += `- **Time to Value**: Speed to achieving first success\n`;
    content += `- **Support Ticket Volume**: Friction indicators\n\n`;
  }

  content += `## Implementation Roadmap\n\n`;
  content += `**Phase 1 (0-3 months): Quick Wins**\n`;
  content += `- Fix highest-impact pain points\n`;
  content += `- Implement easy improvements\n`;
  content += `- Start gathering feedback\n\n`;

  content += `**Phase 2 (3-6 months): Strategic Improvements**\n`;
  content += `- Redesign key touchpoints\n`;
  content += `- Launch new capabilities\n`;
  content += `- Train customer-facing teams\n\n`;

  content += `**Phase 3 (6-12 months): Transformation**\n`;
  content += `- Implement advanced personalization\n`;
  content += `- Build predictive capabilities\n`;
  content += `- Create seamless omnichannel experience\n\n`;

  return content;
}

function generateBrandFoundationContent(answers: Record<string, string>): string {
  let content = `## WHY - Purpose & Beliefs\n\n`;
  content += `### Core Belief\n\n`;
  content += `${answers.purpose || 'Core belief to be articulated'}\n\n`;

  content += `### Impact\n\n`;
  content += `${answers.impact || 'Desired impact to be defined'}\n\n`;

  if (answers.values) {
    content += `### Core Values\n\n`;
    answers.values.split('\n').forEach(value => {
      if (value.trim()) {
        content += `- ${value.trim()}\n`;
      }
    });
    content += `\n`;
  }

  content += `## HOW - Process & Differentiation\n\n`;
  content += `### Unique Approach\n\n`;
  content += `${answers.uniqueApproach || 'Unique methodology to be described'}\n\n`;

  if (answers.proof) {
    content += `### Proof Points\n\n`;
    content += `${answers.proof}\n\n`;
  }

  content += `## WHAT - Customer & Market\n\n`;
  content += `### Ideal Customer\n\n`;
  content += `${answers.targetAudience || 'Target customer to be defined'}\n\n`;

  if (answers.customerBenefit) {
    content += `### Customer Benefit\n\n`;
    content += `${answers.customerBenefit}\n\n`;
  }

  content += `## Brand Story\n\n`;
  content += `We believe that ${answers.purpose || '[core belief]'}. `;
  content += `This drives us to ${answers.impact || '[create impact]'}. \n\n`;
  content += `Our unique approach is ${answers.uniqueApproach || '[differentiation]'}. `;
  content += `We serve ${answers.targetAudience || '[target customers]'} `;
  content += `by delivering ${answers.customerBenefit || '[specific benefits]'}.\n\n`;

  content += `## Brand Essence\n\n`;
  content += `**In one sentence:**\n`;
  content += `[Your brand] helps [target customer] achieve [benefit] through [unique approach].\n\n`;

  content += `## Brand Positioning Statement\n\n`;
  content += `For [target customer] who [customer need], `;
  content += `[your brand] is the [category] that [unique benefit] `;
  content += `because [reason to believe].\n\n`;

  return content;
}

function generateGenericContent(answers: Record<string, string>): string {
  let content = `## Objective\n\n`;
  content += `${answers.objective || 'Objective to be defined'}\n\n`;

  content += `## Context\n\n`;
  content += `${answers.context || 'Context to be provided'}\n\n`;

  if (answers.stakeholders) {
    content += `## Stakeholders\n\n`;
    content += `${answers.stakeholders}\n\n`;
  }

  content += `## Challenges\n\n`;
  content += `${answers.challenges || 'Challenges to be identified'}\n\n`;

  if (answers.resources) {
    content += `## Available Resources\n\n`;
    content += `${answers.resources}\n\n`;
  }

  content += `## Success Criteria\n\n`;
  content += `${answers.success || 'Success metrics to be defined'}\n\n`;

  content += `## Strategic Recommendations\n\n`;
  content += `Based on the inputs provided, here are key strategic recommendations:\n\n`;
  content += `1. **Prioritize**: Focus on highest-impact initiatives first\n`;
  content += `2. **Align**: Ensure stakeholder buy-in and cross-functional collaboration\n`;
  content += `3. **Execute**: Develop clear action plans with owners and deadlines\n`;
  content += `4. **Measure**: Track progress against defined success criteria\n`;
  content += `5. **Iterate**: Continuously learn and adapt based on results\n\n`;

  return content;
}
