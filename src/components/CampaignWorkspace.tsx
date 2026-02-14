import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Lock,
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
  Search,
  Calendar,
  Palette,
  Presentation,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Activity,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { Slider } from './ui/slider';
import { Checkbox } from './ui/checkbox';
import { AssetSelectionModal } from './AssetSelectionModal';
import { CampaignDeliverableButton, CampaignDeliverable } from './campaign-strategy/CampaignDeliverableButton';
import { mockCampaigns } from '../data/mock-campaigns';
import { DeliverableCard } from './campaign-strategy/DeliverableCard';

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

interface CampaignWorkspaceProps {
  campaignId?: string | null;
  initialTab?: 'configure' | 'result';
  onBack?: () => void;
}

export function CampaignWorkspace({ campaignId, initialTab, onBack }: CampaignWorkspaceProps) {
  // Load campaign data if campaignId provided
  const campaignData = campaignId ? mockCampaigns[campaignId] : null;
  
  const [parametersExpanded, setParametersExpanded] = useState(true);
  const [budgetRange, setBudgetRange] = useState(campaignData?.budgetRange || [50, 100]);
  const [campaignTitle, setCampaignTitle] = useState(campaignData?.name || 'New Campaign');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [activeSection, setActiveSection] = useState('concept');
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'configure' | 'result'>(initialTab || 'configure');
  
  // Refs for scroll tracking
  const conceptRef = useRef<HTMLDivElement>(null);
  const channelMixRef = useRef<HTMLDivElement>(null);
  const audienceRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  const navSections: NavSection[] = [
    { id: 'concept', label: 'Core Concept', ref: conceptRef },
    { id: 'channelMix', label: 'Channel Mix', ref: channelMixRef },
    { id: 'audience', label: 'Target Audience', ref: audienceRef },
    { id: 'actions', label: 'Deliverables', ref: actionsRef }
  ];

  // Asset states with trust levels - load from campaign data or use defaults
  const [brandCore] = useState<Asset>(
    campaignData?.assets?.[0] || {
      id: 'brand-1',
      name: 'Brand Core',
      type: 'brand',
      trustLevel: 'high',
      trustLabel: 'Human Validated',
      locked: true
    }
  );

  const [assets, setAssets] = useState<Asset[]>(
    campaignData?.assets?.slice(1) || [
      {
        id: 'product-1',
        name: 'Sneakers',
        type: 'product',
        trustLevel: 'medium',
        trustLabel: 'Manual Add'
      },
      {
        id: 'persona-1',
        name: 'Gen-Z',
        type: 'persona',
        trustLevel: 'low',
        trustLabel: 'AI Draft'
      }
    ]
  );

  const [objective, setObjective] = useState(campaignData?.objective || 'Brand Awareness');
  const [channels, setChannels] = useState(campaignData?.channels || {
    social: true,
    email: true,
    ooh: false
  });

  // Calculate confidence score based on assets
  const calculateConfidenceScore = () => {
    const allAssets = [brandCore, ...assets];
    const trustScores = {
      high: 100,
      medium: 70,
      low: 40
    };
    
    const totalScore = allAssets.reduce((sum, asset) => sum + trustScores[asset.trustLevel], 0);
    const maxScore = allAssets.length * 100;
    return Math.round((totalScore / maxScore) * 100);
  };

  const confidenceScore = calculateConfidenceScore();
  const scoreLevel = confidenceScore >= 80 ? 'High' : confidenceScore >= 60 ? 'Medium' : 'Low';

  const removeAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleSelectAsset = (selectedAsset: any) => {
    const newAsset: Asset = {
      id: selectedAsset.id,
      name: selectedAsset.name,
      type: selectedAsset.type === 'audience' ? 'persona' : selectedAsset.type,
      trustLevel: selectedAsset.trustLevel,
      trustLabel: selectedAsset.trustLabel
    };
    
    setAssets([...assets, newAsset]);
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

  const trustBadgeStyles = {
    high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700',
    low: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700'
  };

  const assetIconBg = {
    high: 'bg-green-100 dark:bg-green-900/30',
    medium: 'bg-blue-100 dark:bg-blue-900/30',
    low: 'bg-orange-100 dark:bg-orange-900/30'
  };

  const assetIconColor = {
    high: 'text-green-600 dark:text-green-400',
    medium: 'text-blue-600 dark:text-blue-400',
    low: 'text-orange-600 dark:text-orange-400'
  };

  const allAssets = [brandCore, ...assets];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* GLOBAL WORKSPACE HEADER */}
      <div className="border-b border-border bg-background">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left - Back Button + Editable Title */}
            <div className="flex items-center gap-4 flex-1">
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              {isEditingTitle ? (
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setIsEditingTitle(false);
                  }}
                  className="text-xl font-semibold bg-transparent border-b-2 border-primary focus:outline-none flex-1"
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2 group flex-1">
                  <h2 className="text-xl font-semibold">{campaignTitle}</h2>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              )}
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
              {/* Team Avatars */}
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full bg-purple-500 border-2 border-background flex items-center justify-center text-white text-xs font-medium">
                  MS
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center text-white text-xs font-medium">
                  JD
                </div>
                <div className="h-8 w-8 rounded-full bg-green-500 border-2 border-background flex items-center justify-center text-white text-xs font-medium">
                  AK
                </div>
              </div>

              <Button variant="outline" size="sm">
                <Share2 className="h-3.5 w-3.5 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="px-8">
          <div className="flex gap-6 border-b border-border">
            <button
              onClick={() => setActiveTab('configure')}
              className={`pb-3 relative ${
                activeTab === 'configure'
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Configure Inputs
              {activeTab === 'configure' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('result')}
              className={`pb-3 relative ${
                activeTab === 'result'
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Strategy Result
              {activeTab === 'result' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        {/* CONTENT */}
        <div className="flex-1 flex flex-col">{/* Changed to flex-col without relative/overflow-hidden */}
          {activeTab === 'configure' ? (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-8">{/* Configure content */}
                <div className="space-y-8">
                  {/* Knowledge Assets */}
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Knowledge Assets</h3>
                      <p className="text-sm text-muted-foreground">
                        Source quality affects strategic confidence score
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* Brand Core */}
                      <Card className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`h-10 w-10 rounded-lg ${assetIconBg.high} flex items-center justify-center flex-shrink-0`}>
                                <Lock className={`h-5 w-5 ${assetIconColor.high}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm">{brandCore.name}</p>
                                <Badge
                                  variant="outline"
                                  className={`mt-1.5 ${trustBadgeStyles.high} border text-xs`}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {brandCore.trustLabel}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Other Assets */}
                      {assets.map((asset) => (
                        <Card key={asset.id} className="border-2">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`h-10 w-10 rounded-lg ${assetIconBg[asset.trustLevel]} flex items-center justify-center flex-shrink-0`}>
                                  {asset.type === 'persona' ? (
                                    <Users className={`h-5 w-5 ${assetIconColor[asset.trustLevel]}`} />
                                  ) : (
                                    <Package className={`h-5 w-5 ${assetIconColor[asset.trustLevel]}`} />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">{asset.name}</p>
                                  <Badge
                                    variant="outline"
                                    className={`mt-1.5 ${trustBadgeStyles[asset.trustLevel]} border text-xs`}
                                  >
                                    {asset.trustLevel === 'low' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                    {asset.trustLevel === 'medium' && <Info className="h-3 w-3 mr-1" />}
                                    {asset.trustLabel}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 flex-shrink-0"
                                onClick={() => removeAsset(asset.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAssetModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Asset
                      </Button>
                    </div>
                  </div>

                  {/* Parameters */}
                  <div>
                    <button
                      onClick={() => setParametersExpanded(!parametersExpanded)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <h3 className="text-lg font-semibold">Campaign Parameters</h3>
                      {parametersExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>

                    {parametersExpanded && (
                      <div className="mt-6 space-y-6">
                        {/* Objective */}
                        <div>
                          <label className="text-sm font-medium mb-3 block">Campaign Objective</label>
                          <select
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            className="w-full p-3 text-sm border border-border rounded-lg bg-background"
                          >
                            <option>Brand Awareness</option>
                            <option>Lead Generation</option>
                            <option>Sales Conversion</option>
                            <option>Product Launch</option>
                          </select>
                        </div>

                        {/* Budget Range */}
                        <div>
                          <label className="text-sm font-medium mb-3 block">
                            Budget Range: €{budgetRange[0]}k - €{budgetRange[1]}k
                          </label>
                          <Slider
                            value={budgetRange}
                            onValueChange={setBudgetRange}
                            min={10}
                            max={500}
                            step={10}
                            className="mt-4"
                          />
                        </div>

                        {/* Channels */}
                        <div>
                          <label className="text-sm font-medium mb-3 block">Distribution Channels</label>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="social"
                                checked={channels.social}
                                onCheckedChange={(checked) =>
                                  setChannels({ ...channels, social: checked as boolean })
                                }
                              />
                              <label htmlFor="social" className="text-sm cursor-pointer">
                                Social Media
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="email"
                                checked={channels.email}
                                onCheckedChange={(checked) =>
                                  setChannels({ ...channels, email: checked as boolean })
                                }
                              />
                              <label htmlFor="email" className="text-sm cursor-pointer">
                                Email Marketing
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="ooh"
                                checked={channels.ooh}
                                onCheckedChange={(checked) =>
                                  setChannels({ ...channels, ooh: checked as boolean })
                                }
                              />
                              <label htmlFor="ooh" className="text-sm cursor-pointer">
                                Out of Home (OOH)
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generate Button */}
                  <div className="pt-6 border-t border-border">
                    <Button
                      className="w-full h-12"
                      onClick={() => setActiveTab('result')}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Strategy
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // STRATEGY RESULT TAB
            <div className="h-full flex flex-col relative">
              {/* Scrollable content with sticky nav inside */}
              <div className="flex-1 overflow-y-auto" ref={contentAreaRef}>
                {/* TOP NAVIGATION - STICKY */}
                <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
                  <div className="max-w-7xl mx-auto px-8 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {navSections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                            activeSection === section.id
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : section.id === 'actions'
                              ? 'text-primary bg-primary/10 hover:bg-primary/20 font-semibold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          {section.label}
                          {section.id === 'actions' && (
                            <Badge 
                              variant="secondary" 
                              className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-4"
                            >
                              {campaignData?.deliverables?.filter((d: any) => d.status === 'completed').length || 0}/{campaignData?.deliverables?.length || 0}
                            </Badge>
                          )}
                        </button>
                      ))}
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
                      Based on {allAssets.length} knowledge assets: {allAssets.map(a => a.name).join(', ')}
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
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Strategic Campaign Approach</h1>
                    <p className="text-lg text-muted-foreground">
                      Comprehensive strategy for {campaignTitle}
                    </p>
                  </div>

                  {/* Core Concept Section */}
                  <div ref={conceptRef} className="mb-20">
                    <div className="flex items-baseline gap-4 mb-6">
                      <h2 className="text-2xl font-bold">Core Concept</h2>
                      <div className="h-px flex-1 bg-border"></div>
                    </div>
                    <div className="space-y-6">
                      <p className="text-base text-foreground/90 leading-relaxed">
                        The "Summer Launch 2025" campaign positions our sneaker line as essential elements 
                        of an active, confident summer lifestyle. By emphasizing the synergy between performance 
                        and style, we create a compelling narrative that resonates with Gen-Z consumers who value 
                        authenticity and self-expression.
                      </p>
                      <p className="text-base text-foreground/90 leading-relaxed">
                        The core insight: modern consumers don't separate "workout" from "lifestyle"—they demand 
                        products that seamlessly transition between contexts. Our campaign celebrates this fluidity 
                        by showcasing real moments of summer motion, from morning runs to evening social gatherings.
                      </p>
                      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/10">
                        <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          Strategic Positioning
                        </h3>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          We position the brand at the intersection of performance innovation and cultural relevance, 
                          creating an emotional connection through authentic storytelling that speaks to the values 
                          of our target audience: freedom, individuality, and preparedness for any moment.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Channel Mix Section */}
                  <div ref={channelMixRef} className="mb-20">
                    <div className="flex items-baseline gap-4 mb-6">
                      <h2 className="text-2xl font-bold">Channel Mix</h2>
                      <div className="h-px flex-1 bg-border"></div>
                    </div>
                    <div className="space-y-6">
                      <p className="text-base text-foreground/90 leading-relaxed">
                        Our multi-channel approach prioritizes digital-first platforms where our Gen-Z audience 
                        spends most of their time, while maintaining strategic presence in high-impact physical 
                        environments.
                      </p>
                      
                      <div className="grid gap-4">
                        <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-base">Social Media</h3>
                            <Badge variant="secondary" className="text-xs font-semibold">60% Budget</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            TikTok and Instagram serve as primary channels, leveraging short-form video content, 
                            influencer partnerships, and user-generated content campaigns. Focus on authentic, 
                            behind-the-scenes content that humanizes the brand.
                          </p>
                        </div>

                        <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-base">Email Marketing</h3>
                            <Badge variant="secondary" className="text-xs font-semibold">25% Budget</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Personalized email journeys targeting existing customers and newsletter subscribers, 
                            featuring exclusive early access, product education, and community stories.
                          </p>
                        </div>

                        <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-base">Strategic Partnerships</h3>
                            <Badge variant="secondary" className="text-xs font-semibold">15% Budget</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Collaborations with fitness studios, music festivals, and cultural events where our 
                            audience naturally congregates, creating memorable brand experiences.
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed pt-2">
                        All channels work in concert, with content repurposed and optimized for each platform 
                        while maintaining a consistent brand voice and visual identity. Cross-channel attribution 
                        tracking ensures we can measure impact and optimize in real-time.
                      </p>
                    </div>
                  </div>

                  {/* Target Audience Section */}
                  <div ref={audienceRef} className="mb-20">
                    <div className="flex items-baseline gap-4 mb-6">
                      <h2 className="text-2xl font-bold">Target Audience</h2>
                      <div className="h-px flex-1 bg-border"></div>
                    </div>
                    <div className="space-y-6">
                      <p className="text-base text-foreground/90 leading-relaxed">
                        Our primary audience consists of Gen-Z individuals aged 18-26 who prioritize experiences 
                        over possessions and seek brands that align with their values of authenticity, sustainability, 
                        and self-expression. They are digital natives who consume content primarily through mobile 
                        devices and value peer recommendations over traditional advertising.
                      </p>

                      <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-8 border border-border">
                        <h3 className="font-semibold text-base mb-6 flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Key Behavioral Characteristics
                        </h3>
                        <ul className="grid gap-4">
                          <li className="flex gap-3 items-start">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                            <span className="text-sm text-foreground/80 leading-relaxed">Active on TikTok and Instagram, consuming 3-5 hours of short-form video content daily</span>
                          </li>
                          <li className="flex gap-3 items-start">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                            <span className="text-sm text-foreground/80 leading-relaxed">Value peer recommendations and influencer endorsements over traditional brand messaging</span>
                          </li>
                          <li className="flex gap-3 items-start">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                            <span className="text-sm text-foreground/80 leading-relaxed">Seek products that offer both functional performance and aesthetic value</span>
                          </li>
                          <li className="flex gap-3 items-start">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                            <span className="text-sm text-foreground/80 leading-relaxed">Willing to pay premium for sustainable and ethically produced products</span>
                          </li>
                          <li className="flex gap-3 items-start">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                            <span className="text-sm text-foreground/80 leading-relaxed">Expect brands to take authentic stands on social and environmental issues</span>
                          </li>
                        </ul>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Secondary audiences include millennial fitness enthusiasts and early Gen-Z professionals 
                        who share similar values but may have higher purchasing power and brand loyalty potential.
                      </p>
                    </div>
                  </div>

                  {/* Campaign Deliverables Section */}
                  <div ref={actionsRef} className="mb-20">
                    <div className="flex items-baseline gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold">Campaign Deliverables</h2>
                        <Badge variant="secondary" className="text-xs">
                          {campaignData?.deliverables?.filter((d: any) => d.status === 'completed').length || 0} / {campaignData?.deliverables?.length || 0} Complete
                        </Badge>
                      </div>
                      <div className="h-px flex-1 bg-border"></div>
                    </div>
                    
                    <div className="space-y-3">
                      {campaignData?.deliverables?.map((deliverable: any) => (
                        <DeliverableCard
                          key={deliverable.id}
                          deliverable={deliverable}
                          onWorkClick={() => {
                            console.log('Work on deliverable:', deliverable.name);
                          }}
                          onViewClick={() => {
                            console.log('View deliverable:', deliverable.name);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Asset Selection Modal */}
      {showAssetModal && (
        <AssetSelectionModal
          onClose={() => setShowAssetModal(false)}
          onSelect={handleSelectAsset}
          onSelectMultiple={handleSelectMultipleAssets}
        />
      )}
    </div>
  );
}