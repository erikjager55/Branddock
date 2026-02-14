/**
 * COMPONENT: Framework Workspace
 * 
 * Two-tab workspace for all strategy frameworks (except Campaign Strategy)
 * Tab 1: Configure Inputs - Define strategy parameters and select assets
 * Tab 2: Strategy Result - View generated strategy output
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import {
  ArrowLeft,
  ArrowRight,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Package,
  Users,
  TrendingUp,
  Target,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lock,
  FileText,
  BookOpen,
  Download,
  Activity,
  Zap
} from 'lucide-react';
import { AssetSelectionModal } from '../AssetSelectionModal';

interface Asset {
  id: string;
  name: string;
  type: 'brand' | 'product' | 'persona' | 'trend' | 'research';
  trustLevel: 'high' | 'medium' | 'low';
  trustLabel: string;
  locked?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  ref: React.RefObject<HTMLDivElement>;
}

interface FrameworkField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

interface FrameworkConfig {
  title: string;
  description: string;
  fields: FrameworkField[];
  outputSections: Array<{
    id: string;
    title: string;
    description: string;
  }>;
}

interface FrameworkWorkspaceProps {
  frameworkId: string;
  config: FrameworkConfig;
  onBack: () => void;
}

export function FrameworkWorkspace({ frameworkId, config, onBack }: FrameworkWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'configure' | 'result'>('configure');
  const [parametersExpanded, setParametersExpanded] = useState(true);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  // Assets
  const [brandCore] = useState<Asset>({
    id: 'brand-1',
    name: 'Brand Core',
    type: 'brand',
    trustLevel: 'high',
    trustLabel: 'Human Validated',
    locked: true
  });

  const [assets, setAssets] = useState<Asset[]>([]);
  
  // Refs for scroll tracking (for Result tab navigation)
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const outputRefsMap = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
  
  // Initialize output section refs
  useEffect(() => {
    config.outputSections.forEach(section => {
      if (!outputRefsMap.current[section.id]) {
        outputRefsMap.current[section.id] = React.createRef<HTMLDivElement>();
      }
    });
  }, [config.outputSections]);

  const navSections: NavSection[] = [
    { id: 'overview', label: 'Overview', ref: overviewRef },
    ...config.outputSections.map(section => ({
      id: section.id,
      label: section.title,
      ref: outputRefsMap.current[section.id]
    }))
  ];

  // Calculate confidence score
  const calculateConfidenceScore = () => {
    const allAssets = [brandCore, ...assets];
    const trustScores = { high: 100, medium: 70, low: 40 };
    const totalScore = allAssets.reduce((sum, asset) => sum + trustScores[asset.trustLevel], 0);
    const maxScore = allAssets.length * 100;
    return Math.round((totalScore / maxScore) * 100);
  };

  const confidenceScore = calculateConfidenceScore();
  const scoreLevel = confidenceScore >= 80 ? 'High' : confidenceScore >= 60 ? 'Medium' : 'Low';

  const removeAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleSelectMultipleAssets = (selectedAssets: any[]) => {
    const newAssets: Asset[] = selectedAssets.map(selectedAsset => ({
      id: selectedAsset.id,
      name: selectedAsset.name,
      type: selectedAsset.type === 'audience' ? 'persona' : selectedAsset.type,
      trustLevel: selectedAsset.trustLevel,
      trustLabel: selectedAsset.trustLabel
    }));
    setAssets([...assets, ...newAssets]);
  };

  const scrollToSection = (sectionId: string) => {
    const section = navSections.find(s => s.id === sectionId);
    if (section?.ref.current && contentAreaRef.current) {
      const container = contentAreaRef.current;
      const element = section.ref.current;
      const offsetTop = element.offsetTop - container.offsetTop - 20;
      container.scrollTo({ top: offsetTop, behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  // Track scroll position
  useEffect(() => {
    if (!contentAreaRef.current) return;

    const handleScroll = () => {
      const container = contentAreaRef.current;
      if (!container) return;

      const scrollPosition = container.scrollTop + 100;

      for (let i = navSections.length - 1; i >= 0; i--) {
        const section = navSections[i];
        if (section.ref.current) {
          const offsetTop = section.ref.current.offsetTop - container.offsetTop;
          if (scrollPosition >= offsetTop) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    const container = contentAreaRef.current;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  const handleGenerate = () => {
    setHasGenerated(true);
    setActiveTab('result');
  };

  const trustBadgeStyles = {
    high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700',
    low: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700'
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'brand': return Target;
      case 'product': return Package;
      case 'persona': return Users;
      case 'trend': return TrendingUp;
      case 'research': return FileText;
      default: return FileText;
    }
  };

  const renderField = (field: FrameworkField) => {
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
            className="resize-none"
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
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
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
            
            {/* Confidence Score Badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className={`text-sm font-semibold ${
                  scoreLevel === 'High' ? 'text-green-600' : 
                  scoreLevel === 'Medium' ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  {confidenceScore}% • {scoreLevel}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-6 border-b border-border -mb-[1px]">
            <button
              onClick={() => setActiveTab('configure')}
              className={`pb-3 px-1 relative transition-colors ${
                activeTab === 'configure'
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Configure Inputs
              {activeTab === 'configure' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>

            <button
              onClick={() => hasGenerated && setActiveTab('result')}
              className={`pb-3 px-1 relative transition-colors ${
                !hasGenerated ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                activeTab === 'result'
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              disabled={!hasGenerated}
            >
              Strategy Result
              {activeTab === 'result' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'configure' ? (
          // CONFIGURE INPUTS TAB
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Strategy Parameters */}
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setParametersExpanded(!parametersExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Strategy Parameters</CardTitle>
                        <CardDescription>Define the core details for your strategy</CardDescription>
                      </div>
                    </div>
                    {parametersExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {parametersExpanded && (
                  <CardContent className="space-y-6 pt-6">
                    {config.fields.map(renderField)}
                  </CardContent>
                )}
              </Card>

              {/* Knowledge Assets */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Knowledge Assets</CardTitle>
                      <CardDescription>Connect brand assets, personas, and insights</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Brand Core (Locked) */}
                  <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const Icon = getAssetIcon(brandCore.type);
                          return <Icon className="h-5 w-5 text-green-700 dark:text-green-400" />;
                        })()}
                        <div>
                          <p className="font-medium text-green-900 dark:text-green-100">{brandCore.name}</p>
                          <p className="text-xs text-green-700 dark:text-green-400">Always included</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={trustBadgeStyles[brandCore.trustLevel]}>
                          {brandCore.trustLabel}
                        </Badge>
                        <Lock className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  </div>

                  {/* Additional Assets */}
                  {assets.length > 0 && (
                    <div className="space-y-2">
                      {assets.map(asset => {
                        const Icon = getAssetIcon(asset.type);
                        return (
                          <div key={asset.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{asset.name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{asset.type}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-xs ${trustBadgeStyles[asset.trustLevel]}`}>
                                  {asset.trustLabel}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAsset(asset.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Assets Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAssetModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Assets (Personas, Products, Trends)
                  </Button>
                </CardContent>
              </Card>

              {/* Generate Button */}
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold mb-1">Ready to Generate?</h4>
                      <p className="text-sm text-muted-foreground">
                        AI will create your {config.title.toLowerCase()} based on selected assets
                      </p>
                    </div>
                    <Button size="lg" onClick={handleGenerate} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Generate Strategy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          // STRATEGY RESULT TAB
          <div className="h-full flex flex-col relative">
            {/* Scrollable content with sticky nav inside */}
            <div className="flex-1 overflow-y-auto" ref={contentAreaRef}>
              {/* TOP NAVIGATION - On this page - STICKY */}
              <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
                <div className="max-w-[900px] mx-auto px-8 py-4">
                  <div className="flex items-center gap-6">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      On this page
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {navSections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                            activeSection === section.id
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          {section.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content area */}
              <div className="max-w-[900px] mx-auto px-8 py-12 pb-40">
                {/* Intelligence Bar */}
                <div className="mb-10 pb-8 border-b border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge
                      variant="outline"
                      className={`${
                        confidenceScore >= 80
                          ? 'bg-[#1FD1B2]/10 text-[#1FD1B2] border-[#1FD1B2]/30'
                          : confidenceScore >= 60
                          ? 'bg-[#F9FD48]/10 text-[#64748B] border-[#F9FD48]/30'
                          : 'bg-[#FF6B48]/10 text-[#FF6B48] border-[#FF6B48]/30'
                      } text-xs font-semibold px-3 py-1.5`}
                    >
                      <Activity className="h-3.5 w-3.5 mr-1.5" />
                      {confidenceScore}% Confidence
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {scoreLevel} Quality
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on {assets.length + 1} knowledge assets: {[brandCore, ...assets].map(a => a.name).join(', ')}
                  </p>
                </div>

                {/* Document Title */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="outline" className="bg-[#5252E3]/10 text-[#5252E3] border-[#5252E3]/30">
                      <Sparkles className="h-3 w-3 mr-1.5" />
                      AI Generated
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Version 1.0
                    </Badge>
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight mb-2">{config.title}</h1>
                  <p className="text-lg text-muted-foreground">
                    {config.description}
                  </p>
                </div>

                {/* Overview Section */}
                <div ref={overviewRef} className="mb-20">
                  <div className="flex items-baseline gap-4 mb-6">
                    <h2 className="text-2xl font-bold">Overview</h2>
                    <div className="h-px flex-1 bg-border"></div>
                  </div>
                  <div className="space-y-6">
                    <p className="text-base text-foreground/90 leading-relaxed">
                      This {config.title.toLowerCase()} has been generated based on your inputs and {assets.length + 1} connected 
                      knowledge assets. The AI has analyzed your brand positioning, target personas, and market insights 
                      to create a comprehensive strategic framework tailored to your objectives.
                    </p>
                    <p className="text-base text-foreground/90 leading-relaxed">
                      The recommendations below are grounded in your brand's unique value proposition and target audience 
                      characteristics, ensuring alignment with your overall business strategy and market positioning.
                    </p>
                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/10">
                      <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Strategic Foundation
                      </h3>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        Every recommendation in this framework is contextually aware of your connected knowledge assets, 
                        ensuring consistency with your brand voice, audience insights, and market positioning.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Output Sections */}
                {config.outputSections.map((section, index) => (
                  <div key={section.id} ref={outputRefsMap.current[section.id]} className="mb-20">
                    <div className="flex items-baseline gap-4 mb-6">
                      <h2 className="text-2xl font-bold">{section.title}</h2>
                      <div className="h-px flex-1 bg-border"></div>
                    </div>
                    <div className="space-y-6">
                      <p className="text-base text-foreground/90 leading-relaxed">
                        {section.description}
                      </p>
                      
                      <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-8 border border-border">
                        <div className="mb-6">
                          <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            AI-Generated Strategic Content
                          </h3>
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            Detailed strategic recommendations for {section.title} will be generated here based on your 
                            configuration parameters and the {assets.length + 1} connected knowledge assets. The AI 
                            analyzes patterns across your brand positioning, personas, and market trends to deliver 
                            contextually relevant, actionable insights.
                          </p>
                        </div>

                        <Separator className="my-6" />

                        <div>
                          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            Connected Knowledge Assets
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-xs">{brandCore.name}</Badge>
                            {assets.map(asset => (
                              <Badge key={asset.id} variant="secondary" className="text-xs">{asset.name}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        All strategic recommendations are aligned with your brand voice and target audience insights, 
                        ensuring consistency across all touchpoints and maximizing the effectiveness of your implementation.
                      </p>
                    </div>
                  </div>
                ))}

                {/* Spacer for sticky footer */}
                <div className="h-32"></div>
              </div>
            </div>

            {/* FIXED FOOTER - NEXT ACTIONS */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-8">
              <div className="max-w-[900px] mx-auto px-8 pb-8">
                <div className="bg-card rounded-2xl p-6 border border-border shadow-xl">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Zap className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold text-base">Next Best Actions</h3>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
                    {/* Card 1 */}
                    <button className="group flex flex-col items-center gap-3 p-5 rounded-xl bg-background border border-border hover:border-primary/40 hover:shadow-md transition-all">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/20 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                        <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-xs font-semibold text-center leading-tight">Export PDF</span>
                    </button>

                    {/* Card 2 */}
                    <button className="group flex flex-col items-center gap-3 p-5 rounded-xl bg-background border border-border hover:border-primary/40 hover:shadow-md transition-all">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/20 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-xs font-semibold text-center leading-tight">Share Team</span>
                    </button>

                    {/* Card 3 */}
                    <button className="group flex flex-col items-center gap-3 p-5 rounded-xl bg-background border border-border hover:border-primary/40 hover:shadow-md transition-all">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-900/20 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                        <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-xs font-semibold text-center leading-tight">Save Draft</span>
                    </button>

                    {/* Card 4 */}
                    <button className="group flex flex-col items-center gap-3 p-5 rounded-xl bg-background border border-border hover:border-primary/40 hover:shadow-md transition-all">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/20 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                        <Pencil className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-xs font-semibold text-center leading-tight">Edit Config</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Asset Selection Modal */}
      {showAssetModal && (
        <AssetSelectionModal
          onClose={() => setShowAssetModal(false)}
          onSelectMultiple={handleSelectMultipleAssets}
        />
      )}
    </div>
  );
}