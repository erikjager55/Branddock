/**
 * COMPONENT: Universal Strategy Generator
 * 
 * A flexible strategy generator that adapts to different frameworks
 * Based on the Campaign Strategy Generator structure
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { 
  ArrowLeft,
  ArrowRight,
  Target,
  Users,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Info,
  Lightbulb,
  Sparkles,
  Shield,
  Download,
  BarChart3,
  X,
  Package,
  BookOpen,
  Plus,
  Settings,
  Zap
} from 'lucide-react';
import { StrategyTool } from '../../types/strategy';
import { EnhancedAssetPickerModal } from './EnhancedAssetPickerModal';
import { AddTrendModal } from './AddTrendModal';
import { EntityType } from '../../types/relationship';
import { mockBrandAssets } from '../../data/mock-brand-assets';
import { mockPersonas } from '../../data/mock-personas';
import { mockProducts } from '../../data/mock-products';
import { mockTrends } from '../../data/mock-trends';
import { mockKnowledge } from '../../data/mock-knowledge';
import { SavedStrategiesPanel, SavedStrategiesDropdown, SavedStrategy } from './campaign-output/SavedStrategiesPanel';
import { CampaignDecisionHeader } from '../decision-status/CampaignDecisionHeader';
import { SectionDecisionIndicator } from '../decision-status/SectionDecisionIndicator';
import { DecisionSummaryPanel } from '../decision-status/DecisionSummaryPanel';
import { calculateCampaignDecision, calculateSectionDecision } from '../../utils/campaign-decision-calculator-v2';
import { DecisionWarningModal } from '../decision-status/DecisionWarningModal';
import type { DecisionStatusInfo } from '../../types/decision-status';

interface UniversalStrategyGeneratorProps {
  tool: StrategyTool;
  frameworkId: string;
  frameworkTitle: string;
  onBack: () => void;
}

// Framework-specific configurations
const frameworkConfigs: Record<string, {
  title: string;
  description: string;
  icon: any;
  fields: Array<{
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'select';
    placeholder?: string;
    options?: string[];
    required?: boolean;
  }>;
  outputSections: string[];
}> = {
  'content-strategy': {
    title: 'Content Strategy Planner',
    description: 'Plan your content ecosystem aligned with brand voice',
    icon: FileText,
    fields: [
      { id: 'name', label: 'Strategy Name', type: 'text', placeholder: 'e.g., Q1 Content Strategy', required: true },
      { id: 'contentGoals', label: 'Content Goals', type: 'textarea', placeholder: 'What do you want to achieve with your content?', required: true },
      { id: 'targetChannels', label: 'Primary Channels', type: 'text', placeholder: 'e.g., Blog, LinkedIn, Email Newsletter' },
      { id: 'contentPillars', label: 'Content Pillars (3-5 themes)', type: 'textarea', placeholder: 'List your main content themes, one per line' },
      { id: 'publishingFrequency', label: 'Publishing Frequency', type: 'select', options: ['Daily', 'Weekly', 'Bi-weekly', 'Monthly'] },
    ],
    outputSections: ['Content Calendar', 'Channel Strategy', 'Voice Alignment', 'Content Templates']
  },
  'brand-positioning': {
    title: 'Brand Positioning Framework',
    description: 'Define your unique market position and value proposition',
    icon: Target,
    fields: [
      { id: 'name', label: 'Framework Name', type: 'text', placeholder: 'e.g., 2025 Brand Positioning', required: true },
      { id: 'targetMarket', label: 'Target Market', type: 'textarea', placeholder: 'Describe your primary target market', required: true },
      { id: 'categoryFrame', label: 'Category Frame', type: 'text', placeholder: 'What category do you compete in?' },
      { id: 'pointOfDifference', label: 'Point of Difference', type: 'textarea', placeholder: 'What makes you uniquely valuable?' },
      { id: 'reasonToBelieve', label: 'Reason to Believe', type: 'textarea', placeholder: 'Why should customers believe your claims?' },
    ],
    outputSections: ['Positioning Statement', 'Value Map', 'Competitive Analysis', 'Market Opportunity']
  },
  'messaging-framework': {
    title: 'Messaging & Communication',
    description: 'Create consistent messaging across all touchpoints',
    icon: Users,
    fields: [
      { id: 'name', label: 'Framework Name', type: 'text', placeholder: 'e.g., 2025 Messaging Framework', required: true },
      { id: 'coreMessage', label: 'Core Message', type: 'textarea', placeholder: 'Your primary message to the market', required: true },
      { id: 'keyBenefits', label: 'Key Benefits (3-5)', type: 'textarea', placeholder: 'List main benefits, one per line' },
      { id: 'toneAttributes', label: 'Tone Attributes', type: 'text', placeholder: 'e.g., Professional, Friendly, Innovative' },
      { id: 'messagingPriority', label: 'Messaging Priority', type: 'select', options: ['Emotional', 'Rational', 'Balanced'] },
    ],
    outputSections: ['Message Hierarchy', 'Tone Guidelines', 'Messaging Matrix', 'Channel Adaptations']
  },
  'persona-journey': {
    title: 'Persona Journey Mapping',
    description: 'Map customer journeys and identify key touchpoints',
    icon: Users,
    fields: [
      { id: 'name', label: 'Journey Map Name', type: 'text', placeholder: 'e.g., B2B Buyer Journey', required: true },
      { id: 'journeyStages', label: 'Journey Stages', type: 'textarea', placeholder: 'List stages: Awareness, Consideration, Decision, etc.' },
      { id: 'primaryGoal', label: 'Primary Customer Goal', type: 'text', placeholder: 'What is the customer trying to achieve?' },
      { id: 'painPoints', label: 'Key Pain Points', type: 'textarea', placeholder: 'What challenges do customers face?' },
      { id: 'successMetrics', label: 'Success Metrics', type: 'text', placeholder: 'How will you measure journey optimization?' },
    ],
    outputSections: ['Journey Map', 'Touchpoint Analysis', 'Pain Point Solutions', 'Opportunity Areas']
  },
  'content-calendar': {
    title: 'Content Calendar Builder',
    description: 'Plan and schedule content across channels',
    icon: FileText,
    fields: [
      { id: 'name', label: 'Calendar Name', type: 'text', placeholder: 'e.g., Q1 2025 Content Calendar', required: true },
      { id: 'timeframe', label: 'Timeframe', type: 'select', options: ['1 Month', '3 Months', '6 Months', '12 Months'], required: true },
      { id: 'channels', label: 'Channels', type: 'text', placeholder: 'e.g., Blog, Social Media, Email' },
      { id: 'contentThemes', label: 'Content Themes', type: 'textarea', placeholder: 'List monthly or weekly themes' },
      { id: 'resourceAllocation', label: 'Team Resources', type: 'text', placeholder: 'Available team members and hours/week' },
    ],
    outputSections: ['Publishing Schedule', 'Content Topics', 'Resource Planning', 'Campaign Integration']
  },
  'brand-voice': {
    title: 'Brand Voice & Tone Guide',
    description: 'Establish consistent brand communication style',
    icon: Target,
    fields: [
      { id: 'name', label: 'Guide Name', type: 'text', placeholder: 'e.g., Brand Voice Guidelines 2025', required: true },
      { id: 'voiceAttributes', label: 'Voice Attributes (3-5)', type: 'textarea', placeholder: 'e.g., Authentic, Expert, Approachable' },
      { id: 'dosSayings', label: 'Do Say', type: 'textarea', placeholder: 'Phrases and language we use' },
      { id: 'dontsSayings', label: "Don't Say", type: 'textarea', placeholder: 'Phrases and language we avoid' },
      { id: 'audienceContext', label: 'Audience Context', type: 'text', placeholder: 'How does our audience speak?' },
    ],
    outputSections: ['Voice Principles', 'Tone Variations', 'Writing Examples', 'Usage Guidelines']
  },
  'competitive-analysis': {
    title: 'Competitive Intelligence',
    description: 'Analyze competitors and identify market opportunities',
    icon: BarChart3,
    fields: [
      { id: 'name', label: 'Analysis Name', type: 'text', placeholder: 'e.g., Q4 Competitive Analysis', required: true },
      { id: 'competitors', label: 'Key Competitors', type: 'textarea', placeholder: 'List main competitors (3-5)' },
      { id: 'analysisScope', label: 'Analysis Scope', type: 'text', placeholder: 'What aspects are you analyzing?' },
      { id: 'marketPosition', label: 'Your Current Position', type: 'textarea', placeholder: 'How do you currently position vs. competitors?' },
      { id: 'timeframe', label: 'Analysis Timeframe', type: 'select', options: ['Current State', '6 Months', '12 Months'] },
    ],
    outputSections: ['SWOT Analysis', 'Market Positioning', 'Competitive Gaps', 'Strategic Opportunities']
  },
  'creative-brief': {
    title: 'Creative Brief Generator',
    description: 'Create detailed briefs for creative projects',
    icon: Lightbulb,
    fields: [
      { id: 'name', label: 'Project Name', type: 'text', placeholder: 'e.g., Summer Campaign Creative', required: true },
      { id: 'objective', label: 'Project Objective', type: 'textarea', placeholder: 'What should this creative achieve?', required: true },
      { id: 'deliverables', label: 'Required Deliverables', type: 'textarea', placeholder: 'List all required creative assets' },
      { id: 'mandatories', label: 'Mandatories', type: 'textarea', placeholder: 'Must-include elements (logo, tagline, etc.)' },
      { id: 'deadline', label: 'Deadline', type: 'text', placeholder: 'When is this needed?' },
    ],
    outputSections: ['Brief Summary', 'Target Audience', 'Creative Direction', 'Success Criteria']
  },
  'go-to-market': {
    title: 'Go-to-Market Strategy',
    description: 'Plan product launches and market entry strategies',
    icon: Target,
    fields: [
      { id: 'name', label: 'Launch Name', type: 'text', placeholder: 'e.g., Product X Market Launch', required: true },
      { id: 'productValue', label: 'Product Value Proposition', type: 'textarea', placeholder: 'What value does the product deliver?', required: true },
      { id: 'targetSegment', label: 'Initial Target Segment', type: 'text', placeholder: 'Who are you launching to first?' },
      { id: 'launchTimeline', label: 'Launch Timeline', type: 'select', options: ['4 weeks', '8 weeks', '12 weeks', '6 months'] },
      { id: 'successMetrics', label: 'Success Metrics', type: 'text', placeholder: 'How will you measure launch success?' },
    ],
    outputSections: ['Launch Plan', 'Channel Strategy', 'Timeline & Milestones', 'Risk Mitigation']
  },
  'social-media': {
    title: 'Social Media Strategy',
    description: 'Develop platform-specific social media strategies',
    icon: Target,
    fields: [
      { id: 'name', label: 'Strategy Name', type: 'text', placeholder: 'e.g., 2025 Social Media Strategy', required: true },
      { id: 'platforms', label: 'Priority Platforms', type: 'text', placeholder: 'e.g., LinkedIn, Instagram, Twitter', required: true },
      { id: 'socialGoals', label: 'Social Media Goals', type: 'textarea', placeholder: 'What do you want to achieve?' },
      { id: 'contentPillars', label: 'Content Pillars (3-5)', type: 'textarea', placeholder: 'Main content themes for social' },
      { id: 'postingFrequency', label: 'Posting Frequency', type: 'text', placeholder: 'How often will you post per platform?' },
    ],
    outputSections: ['Platform Strategy', 'Content Calendar', 'Engagement Tactics', 'Performance Metrics']
  },
  'thought-leadership': {
    title: 'Thought Leadership Plan',
    description: 'Build authority through strategic content and engagement',
    icon: BookOpen,
    fields: [
      { id: 'name', label: 'Plan Name', type: 'text', placeholder: 'e.g., 2025 Thought Leadership Plan', required: true },
      { id: 'expertiseAreas', label: 'Areas of Expertise', type: 'textarea', placeholder: 'What topics can you lead on?' },
      { id: 'targetAudience', label: 'Target Audience', type: 'text', placeholder: 'Who are you trying to influence?' },
      { id: 'contentFormats', label: 'Content Formats', type: 'text', placeholder: 'e.g., Articles, Webinars, Podcasts' },
      { id: 'distributionChannels', label: 'Distribution Channels', type: 'text', placeholder: 'Where will you publish?' },
    ],
    outputSections: ['Topic Strategy', 'Content Plan', 'Distribution Strategy', 'Authority Metrics']
  }
};

// Mock research data
const mockResearch = [
  { id: 'research-1', name: 'Q4 Market Analysis', type: 'Market Research' },
  { id: 'research-2', name: 'Competitor Study 2024', type: 'Competitive Analysis' },
  { id: 'research-3', name: 'Customer Insights Report', type: 'User Research' }
];

export function UniversalStrategyGenerator({ 
  tool, 
  frameworkId,
  frameworkTitle,
  onBack 
}: UniversalStrategyGeneratorProps) {
  const config = frameworkConfigs[frameworkId];
  
  if (!config) {
    return (
      <div className="p-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Framework configuration not found for: {frameworkId}
          </AlertDescription>
        </Alert>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  const [selectedTab, setSelectedTab] = useState('configure');
  const [selectedBrandAssets, setSelectedBrandAssets] = useState<string[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedTrends, setSelectedTrends] = useState<string[]>([]);
  const [selectedKnowledge, setSelectedKnowledge] = useState<string[]>([]);
  const [selectedResearch, setSelectedResearch] = useState<string[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [trends, setTrends] = useState(mockTrends);
  
  // Form data
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  // Saved Strategies Management
  const [savedStrategies, setSavedStrategies] = useState<SavedStrategy[]>([]);
  const [currentStrategyId, setCurrentStrategyId] = useState<string | null>(null);
  const [showStrategiesPanel, setShowStrategiesPanel] = useState(false);

  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showTrendPicker, setShowTrendPicker] = useState(false);
  const [showAddTrendModal, setShowAddTrendModal] = useState(false);
  const [showKnowledgePicker, setShowKnowledgePicker] = useState(false);
  const [showResearchPicker, setShowResearchPicker] = useState(false);

  // Decision Quality Layer state
  const [showDecisionWarning, setShowDecisionWarning] = useState(false);
  const [warningStatusInfo, setWarningStatusInfo] = useState<DecisionStatusInfo | null>(null);
  const [pendingGeneration, setPendingGeneration] = useState(false);

  // Calculate decision status
  const campaignDecision = useMemo(() => {
    return calculateCampaignDecision(
      selectedBrandAssets,
      selectedPersonas,
      selectedProducts,
      selectedTrends,
      selectedKnowledge
    );
  }, [selectedBrandAssets, selectedPersonas, selectedProducts, selectedTrends, selectedKnowledge]);

  const sectionDecisions = useMemo(() => {
    return {
      brand: calculateSectionDecision('brand', selectedBrandAssets),
      persona: calculateSectionDecision('persona', selectedPersonas),
      products: calculateSectionDecision('products', selectedProducts),
      trends: calculateSectionDecision('trends', selectedTrends),
      knowledge: calculateSectionDecision('knowledge', selectedKnowledge)
    };
  }, [selectedBrandAssets, selectedPersonas, selectedProducts, selectedTrends, selectedKnowledge]);

  // Save current strategy
  const saveCurrentStrategy = () => {
    const newStrategy: SavedStrategy = {
      id: currentStrategyId || `strategy-${Date.now()}`,
      name: formData.name || `Untitled ${config.title}`,
      createdAt: currentStrategyId 
        ? savedStrategies.find(s => s.id === currentStrategyId)?.createdAt || new Date()
        : new Date(),
      updatedAt: new Date(),
      status: hasGenerated ? 'generated' : 'draft',
      objective: frameworkId,
      config: {
        formData,
        selectedBrandAssets,
        selectedPersonas,
        selectedProducts,
        selectedTrends,
        selectedKnowledge,
        selectedResearch
      }
    };

    if (currentStrategyId) {
      setSavedStrategies(prev => prev.map(s => s.id === currentStrategyId ? newStrategy : s));
    } else {
      setSavedStrategies(prev => [...prev, newStrategy]);
      setCurrentStrategyId(newStrategy.id);
    }
  };

  // Load strategy
  const loadStrategy = (strategyId: string) => {
    const strategy = savedStrategies.find(s => s.id === strategyId);
    if (strategy?.config) {
      setFormData(strategy.config.formData || {});
      setSelectedBrandAssets(strategy.config.selectedBrandAssets || []);
      setSelectedPersonas(strategy.config.selectedPersonas || []);
      setSelectedProducts(strategy.config.selectedProducts || []);
      setSelectedTrends(strategy.config.selectedTrends || []);
      setSelectedKnowledge(strategy.config.selectedKnowledge || []);
      setSelectedResearch(strategy.config.selectedResearch || []);
      setCurrentStrategyId(strategyId);
      setHasGenerated(strategy.status === 'generated');
      if (strategy.status === 'generated') {
        setSelectedTab('output');
      }
    }
  };

  // Create new strategy
  const createNewStrategy = () => {
    saveCurrentStrategy();
    setFormData({});
    setSelectedBrandAssets([]);
    setSelectedPersonas([]);
    setSelectedProducts([]);
    setSelectedTrends([]);
    setSelectedKnowledge([]);
    setSelectedResearch([]);
    setCurrentStrategyId(null);
    setHasGenerated(false);
    setSelectedTab('configure');
  };

  // Delete strategy
  const deleteStrategy = (strategyId: string) => {
    setSavedStrategies(prev => prev.filter(s => s.id !== strategyId));
    if (currentStrategyId === strategyId) {
      setCurrentStrategyId(null);
      setFormData({});
      setHasGenerated(false);
    }
  };

  // Duplicate strategy
  const duplicateStrategy = (strategyId: string) => {
    const strategy = savedStrategies.find(s => s.id === strategyId);
    if (strategy) {
      const duplicated: SavedStrategy = {
        ...strategy,
        id: `strategy-${Date.now()}`,
        name: `${strategy.name} (Copy)`,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft'
      };
      setSavedStrategies(prev => [...prev, duplicated]);
      loadStrategy(duplicated.id);
    }
  };

  // Rename strategy
  const renameStrategy = (strategyId: string, newName: string) => {
    setSavedStrategies(prev => prev.map(s => 
      s.id === strategyId ? { ...s, name: newName, updatedAt: new Date() } : s
    ));
  };

  const handleGenerate = () => {
    if (campaignDecision.status !== 'safe-to-decide') {
      setWarningStatusInfo({
        status: campaignDecision.status,
        coverage: campaignDecision.coverage,
        gaps: campaignDecision.gaps,
        risks: campaignDecision.risks,
        recommendations: campaignDecision.recommendations
      });
      setShowDecisionWarning(true);
      setPendingGeneration(true);
      return;
    }

    proceedWithGeneration();
  };

  const proceedWithGeneration = () => {
    setHasGenerated(true);
    setSelectedTab('output');
    saveCurrentStrategy();
    setShowDecisionWarning(false);
    setPendingGeneration(false);
  };

  const handleWarningDismiss = () => {
    setShowDecisionWarning(false);
    setPendingGeneration(false);
  };

  const handleWarningProceed = () => {
    proceedWithGeneration();
  };

  const renderField = (field: typeof config.fields[0]) => {
    const value = formData[field.id] || '';

    if (field.type === 'textarea') {
      return (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
            rows={4}
          />
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <select
            id={field.id}
            value={value}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select...</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.id}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={field.id}
          type="text"
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold">{config.title}</h1>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Saved Strategies Dropdown */}
              {savedStrategies.length > 0 && (
                <SavedStrategiesDropdown
                  strategies={savedStrategies}
                  currentStrategyId={currentStrategyId}
                  onSelect={loadStrategy}
                />
              )}

              {/* Manage Button */}
              {savedStrategies.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStrategiesPanel(!showStrategiesPanel)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage ({savedStrategies.length})
                </Button>
              )}

              {/* New Strategy Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={createNewStrategy}
              >
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>

              {/* Decision Quality Header */}
              <CampaignDecisionHeader
                status={campaignDecision.status}
                coverage={campaignDecision.coverage}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Main Content */}
          <div className={showStrategiesPanel ? 'col-span-9' : 'col-span-12'}>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="configure">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </TabsTrigger>
                <TabsTrigger value="insights">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Insights
                </TabsTrigger>
                <TabsTrigger value="output" disabled={!hasGenerated}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Output
                </TabsTrigger>
              </TabsList>

              {/* Configure Tab */}
              <TabsContent value="configure" className="space-y-6 mt-6">
                {/* Strategy Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Strategy Details
                    </CardTitle>
                    <CardDescription>
                      Define the core parameters for your {config.title.toLowerCase()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {config.fields.map(renderField)}
                  </CardContent>
                </Card>

                {/* Knowledge Base Assets */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          Knowledge Base Assets
                          <SectionDecisionIndicator
                            status={sectionDecisions.brand.status}
                            coverage={sectionDecisions.brand.coverage}
                            mini
                          />
                        </CardTitle>
                        <CardDescription>
                          Connect relevant assets from your knowledge hub
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Brand Assets */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <Label>Brand Assets</Label>
                          <Badge variant="secondary">{selectedBrandAssets.length}</Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAssetPicker(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                      {selectedBrandAssets.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedBrandAssets.map(id => {
                            const asset = mockBrandAssets.find(a => a.id === id);
                            return asset ? (
                              <Badge key={id} variant="secondary" className="gap-2">
                                {asset.type}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => setSelectedBrandAssets(prev => prev.filter(a => a !== id))}
                                />
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Personas */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <Label>Personas</Label>
                          <Badge variant="secondary">{selectedPersonas.length}</Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPersonaPicker(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                      {selectedPersonas.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedPersonas.map(id => {
                            const persona = mockPersonas.find(p => p.id === id);
                            return persona ? (
                              <Badge key={id} variant="secondary" className="gap-2">
                                {persona.name}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => setSelectedPersonas(prev => prev.filter(p => p !== id))}
                                />
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Products */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <Label>Products & Services</Label>
                          <Badge variant="secondary">{selectedProducts.length}</Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowProductPicker(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                      {selectedProducts.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedProducts.map(id => {
                            const product = mockProducts.find(p => p.id === id);
                            return product ? (
                              <Badge key={id} variant="secondary" className="gap-2">
                                {product.name}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => setSelectedProducts(prev => prev.filter(p => p !== id))}
                                />
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Market Trends */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <Label>Market Trends</Label>
                          <Badge variant="secondary">{selectedTrends.length}</Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTrendPicker(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                      {selectedTrends.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedTrends.map(id => {
                            const trend = trends.find(t => t.id === id);
                            return trend ? (
                              <Badge key={id} variant="secondary" className="gap-2">
                                {trend.name}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => setSelectedTrends(prev => prev.filter(t => t !== id))}
                                />
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Generate Button */}
                <Card className="border-2 border-primary/20 bg-primary/5">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold mb-1">Ready to Generate?</h4>
                        <p className="text-sm text-muted-foreground">
                          AI will analyze your inputs and create a comprehensive {config.title.toLowerCase()}
                        </p>
                      </div>
                      <Button size="lg" onClick={handleGenerate} className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        Generate Strategy
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights" className="space-y-6 mt-6">
                <DecisionSummaryPanel
                  status={campaignDecision.status}
                  rootCauses={campaignDecision.rootCauses}
                  risks={campaignDecision.risks}
                  improvements={campaignDecision.improvements}
                  onImproveClick={() => {
                    setSelectedTab('configure');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </TabsContent>

              {/* Output Tab */}
              <TabsContent value="output" className="space-y-6 mt-6">
                {hasGenerated && (
                  <div className="space-y-6">
                    <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-emerald-900 dark:text-emerald-100">
                        Your {config.title.toLowerCase()} has been generated successfully!
                      </AlertDescription>
                    </Alert>

                    {config.outputSections.map((section, idx) => (
                      <Card key={idx}>
                        <CardHeader>
                          <CardTitle>{section}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">
                            AI-generated content for {section} will appear here based on your configuration and selected knowledge base assets.
                          </p>
                        </CardContent>
                      </Card>
                    ))}

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold mb-1">Export Strategy</h4>
                            <p className="text-sm text-muted-foreground">
                              Download as PDF or share with your team
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <Button variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Export PDF
                            </Button>
                            <Button>
                              Share
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Saved Strategies Panel */}
          {showStrategiesPanel && (
            <div className="col-span-3">
              <SavedStrategiesPanel
                strategies={savedStrategies}
                currentStrategyId={currentStrategyId}
                onSelect={loadStrategy}
                onDelete={deleteStrategy}
                onDuplicate={duplicateStrategy}
                onRename={renameStrategy}
                onClose={() => setShowStrategiesPanel(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAssetPicker && (
        <EnhancedAssetPickerModal
          title="Select Brand Assets"
          description="Choose brand assets to ensure your strategy aligns with your brand identity"
          type="brand-assets"
          items={mockBrandAssets.map(a => ({ 
            id: a.id, 
            name: a.title, 
            subtitle: a.category,
            description: a.category === 'Foundation' 
              ? 'Core brand identity elements that define who you are' 
              : a.category === 'Differentiation'
              ? 'What sets you apart from competitors'
              : 'Strategic brand elements',
            isCritical: a.category === 'Foundation',
            status: a.status
          }))}
          selected={selectedBrandAssets}
          onSelect={setSelectedBrandAssets}
          onClose={() => setShowAssetPicker(false)}
        />
      )}

      {showPersonaPicker && (
        <EnhancedAssetPickerModal
          title="Select Personas"
          description="Choose target personas to tailor your strategy to the right audience"
          type="personas"
          items={mockPersonas.map(p => ({ 
            id: p.id, 
            name: p.name, 
            subtitle: p.role || 'Persona',
            description: p.company || '',
            status: p.status
          }))}
          selected={selectedPersonas}
          onSelect={setSelectedPersonas}
          onClose={() => setShowPersonaPicker(false)}
        />
      )}

      {showProductPicker && (
        <EnhancedAssetPickerModal
          title="Select Products & Services"
          description="Choose products or services this strategy will focus on"
          items={mockProducts.map(p => ({ 
            id: p.id, 
            name: p.name, 
            subtitle: p.type || 'Product',
            description: p.description || '',
          }))}
          selected={selectedProducts}
          onSelect={setSelectedProducts}
          onClose={() => setShowProductPicker(false)}
        />
      )}

      {showTrendPicker && (
        <EnhancedAssetPickerModal
          title="Select Market Trends"
          description="Choose relevant market trends to inform your strategy"
          items={trends.map(t => ({ 
            id: t.id, 
            name: t.name, 
            subtitle: t.category || 'Trend',
            description: t.description || '',
          }))}
          selected={selectedTrends}
          onSelect={setSelectedTrends}
          onClose={() => setShowTrendPicker(false)}
          onAddNew={() => {
            setShowTrendPicker(false);
            setShowAddTrendModal(true);
          }}
        />
      )}

      {showAddTrendModal && (
        <AddTrendModal
          onClose={() => setShowAddTrendModal(false)}
          onTrendAdded={(newTrend) => {
            setTrends(prev => [...prev, newTrend]);
            setSelectedTrends(prev => [...prev, newTrend.id]);
            setShowAddTrendModal(false);
          }}
        />
      )}

      {showDecisionWarning && warningStatusInfo && (
        <DecisionWarningModal
          statusInfo={warningStatusInfo}
          onProceed={handleWarningProceed}
          onCancel={handleWarningDismiss}
          actionLabel="Generate Anyway"
        />
      )}
    </div>
  );
}