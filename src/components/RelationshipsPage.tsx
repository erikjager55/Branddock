import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { 
  Network,
  TrendingUp,
  ShieldCheck,
  Shield,
  AlertTriangle,
  XCircle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Target,
  Info,
  Zap,
  ChevronRight
} from 'lucide-react';
import { RelationshipService } from '../services/RelationshipService';
import { EntityType } from '../types/relationship';
import { DecisionStatusBadge } from './decision-status/DecisionStatusBadge';

interface RelationshipsPageProps {
  initialEntityType?: EntityType;
  initialEntityId?: string;
  initialEntityName?: string;
  onNavigate?: (url: string) => void;
  onBack?: () => void;
}

// Insight with decision impact
interface DecisionInsight {
  id: string;
  relationship: {
    from: { type: string; name: string; id: string };
    to: { type: string; name: string; id: string };
    type: string;
    strength: 'strong' | 'moderate' | 'weak';
  };
  insight: string;
  decisionImpact: 'increases-certainty' | 'no-impact' | 'creates-risk';
  impactDescription: string;
  affectedDecisions: string[];
  recommendation: string;
}

export function RelationshipsPage({ 
  initialEntityType,
  initialEntityId,
  initialEntityName,
  onNavigate,
  onBack
}: RelationshipsPageProps) {
  const [selectedTab, setSelectedTab] = useState<string>('decision-insights');
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const stats = React.useMemo(() => RelationshipService.getStats(), []);

  // Generate decision-focused insights from relationships
  const decisionInsights: DecisionInsight[] = useMemo(() => {
    return [
      {
        id: 'brand-purpose-personas-alignment',
        relationship: {
          from: { type: 'brand', name: 'Brand Purpose: "Empower creative professionals"', id: '1' },
          to: { type: 'persona', name: 'Sarah (Product Manager)', id: 'sarah-product-manager' },
          type: 'targets',
          strength: 'strong',
        },
        insight: 'Brand Purpose has strong alignment with 3 of 4 target personas',
        decisionImpact: 'increases-certainty',
        impactDescription: 'Campaign messaging decisions targeting these personas are safe. Positioning strategy is validated.',
        affectedDecisions: [
          'Campaign Strategy Generator: Safe to build campaigns targeting Sarah, Marcus, Lisa',
          'Messaging Framework: Validated positioning for product professionals',
          'Content Strategy: Confirmed audience alignment',
        ],
        recommendation: 'Proceed with confidence for campaign decisions targeting aligned personas. Consider research for David (Operations) who shows weaker alignment.',
      },
      {
        id: 'brand-values-product-mismatch',
        relationship: {
          from: { type: 'brand', name: 'Brand Value: "Sustainability"', id: '3' },
          to: { type: 'product', name: 'Premium Plan (High Resource Usage)', id: 'product-1' },
          type: 'supports',
          strength: 'weak',
        },
        insight: 'Sustainability brand value has weak connection to premium product tier',
        decisionImpact: 'creates-risk',
        impactDescription: 'Product positioning and go-to-market decisions carry risk of brand misalignment. Cannot confidently market premium tier without addressing sustainability gap.',
        affectedDecisions: [
          'Product Positioning: Blocked for premium tier',
          'Go-to-Market Strategy: At risk without sustainability story',
          'Campaign messaging: Cannot authentically highlight sustainability',
        ],
        recommendation: 'Block product marketing decisions until sustainability alignment is strengthened. Either adjust product features or reframe brand value positioning.',
      },
      {
        id: 'persona-product-strong-fit',
        relationship: {
          from: { type: 'persona', name: 'Marcus (Entrepreneur)', id: 'marcus-entrepreneur' },
          to: { type: 'product', name: 'Starter Plan', id: 'product-2' },
          type: 'uses',
          strength: 'strong',
        },
        insight: 'Marcus persona shows strong product-market fit with Starter Plan',
        decisionImpact: 'increases-certainty',
        impactDescription: 'Feature prioritization and product roadmap decisions for Starter Plan are safe. User needs are validated.',
        affectedDecisions: [
          'Feature Prioritization Matrix: Safe for Starter Plan features',
          'Product Concept Generator: Validated audience for new concepts',
          'Pricing Strategy: Confirmed willingness to pay',
        ],
        recommendation: 'Proceed confidently with Starter Plan development and positioning. This is your strongest product-persona alignment.',
      },
      {
        id: 'orphaned-communication-style',
        relationship: {
          from: { type: 'brand', name: 'Communication Style: "Casual & Friendly"', id: '7' },
          to: { type: 'none', name: 'No connections', id: '' },
          type: 'orphaned',
          strength: 'weak',
        },
        insight: 'Communication Style is orphaned - not connected to personas, products, or channels',
        decisionImpact: 'creates-risk',
        impactDescription: 'Content and channel strategy decisions cannot validate if this style resonates. Messaging decisions carry high risk.',
        affectedDecisions: [
          'Content Strategy Planner: Cannot confirm style effectiveness',
          'Channel Strategy: Unknown if style fits channel audiences',
          'Messaging Framework: Style validation missing',
        ],
        recommendation: 'Do not make content or messaging decisions until Communication Style is connected to validated personas and tested on target channels.',
      },
      {
        id: 'trend-brand-opportunity',
        relationship: {
          from: { type: 'trend', name: 'AI-Powered Automation', id: 'trend-1' },
          to: { type: 'brand', name: 'Brand Positioning: "Innovative Solutions"', id: '4' },
          type: 'influences',
          strength: 'strong',
        },
        insight: 'Market trend "AI Automation" strongly aligns with brand positioning',
        decisionImpact: 'increases-certainty',
        impactDescription: 'Innovation and product strategy decisions aligned with this trend are safe. Market timing is validated.',
        affectedDecisions: [
          'Innovation Opportunity Scanner: Safe to pursue AI features',
          'Product Roadmap: Validated market demand',
          'Go-to-Market Timing: Confirmed market readiness',
        ],
        recommendation: 'High confidence for innovation decisions in AI automation space. Market demand and brand fit are both validated.',
      },
      {
        id: 'missing-persona-research-link',
        relationship: {
          from: { type: 'persona', name: 'David (Operations)', id: 'david-operations' },
          to: { type: 'research', name: 'No completed research methods', id: '' },
          type: 'requires',
          strength: 'weak',
        },
        insight: 'David persona lacks research validation - only 30% research coverage',
        decisionImpact: 'creates-risk',
        impactDescription: 'Any strategic decisions targeting David are at risk. Cannot confidently build campaigns or products for this audience.',
        affectedDecisions: [
          'Campaign Strategy: Blocked for David-targeted campaigns',
          'Product Development: Cannot validate feature needs',
          'Customer Journey Mapping: Missing empathy research',
        ],
        recommendation: 'Block all decisions targeting David until research coverage reaches 80%+. Complete interviews and surveys first.',
      },
      {
        id: 'consistent-brand-architecture',
        relationship: {
          from: { type: 'brand', name: 'Brand Purpose', id: '1' },
          to: { type: 'brand', name: 'Brand Values, Positioning, Messaging', id: 'multi' },
          type: 'aligns-with',
          strength: 'strong',
        },
        insight: 'Core brand elements show strong internal consistency',
        decisionImpact: 'increases-certainty',
        impactDescription: 'Brand-level strategic decisions are safe. Foundation is solid and aligned.',
        affectedDecisions: [
          'Brand Extension Opportunities: Safe to explore',
          'Brand Architecture: Validated hierarchy',
          'Competitive Positioning: Consistent differentiation story',
        ],
        recommendation: 'High confidence for brand strategy decisions. Your brand foundation is strong and internally consistent.',
      },
      {
        id: 'product-channel-mismatch',
        relationship: {
          from: { type: 'product', name: 'Enterprise Plan', id: 'product-3' },
          to: { type: 'channel', name: 'Social Media (Primary Channel)', id: 'channel-1' },
          type: 'distributed-via',
          strength: 'weak',
        },
        insight: 'Enterprise product has weak presence on primary distribution channel',
        decisionImpact: 'creates-risk',
        impactDescription: 'Channel strategy and content distribution decisions for Enterprise tier are at risk. Distribution-market fit not validated.',
        affectedDecisions: [
          'Channel Strategy: Cannot optimize Enterprise acquisition',
          'Content Distribution: Unknown effectiveness',
          'Marketing Budget Allocation: Risk of misallocated spend',
        ],
        recommendation: 'Do not commit marketing budget to social channels for Enterprise until channel-product fit is strengthened or alternative channels are validated.',
      },
    ];
  }, []);

  // Filter insights by decision impact
  const insightsByImpact = useMemo(() => {
    return {
      'increases-certainty': decisionInsights.filter(i => i.decisionImpact === 'increases-certainty'),
      'creates-risk': decisionInsights.filter(i => i.decisionImpact === 'creates-risk'),
      'no-impact': decisionInsights.filter(i => i.decisionImpact === 'no-impact'),
    };
  }, [decisionInsights]);

  const getImpactConfig = (impact: 'increases-certainty' | 'no-impact' | 'creates-risk') => {
    switch (impact) {
      case 'increases-certainty':
        return {
          icon: Shield,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          borderColor: 'border-green-200 dark:border-green-800',
          badgeColor: 'bg-green-100 text-green-700 border-green-300',
          label: 'Increases Decision Certainty',
          decisionStatus: 'safe-to-decide' as const,
        };
      case 'creates-risk':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          borderColor: 'border-red-200 dark:border-red-800',
          badgeColor: 'bg-red-100 text-red-700 border-red-300',
          label: 'Creates Decision Risk',
          decisionStatus: 'blocked' as const,
        };
      case 'no-impact':
        return {
          icon: Info,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-950/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          badgeColor: 'bg-gray-100 text-gray-700 border-gray-300',
          label: 'No Decision Impact',
          decisionStatus: 'decision-at-risk' as const,
        };
    }
  };

  const handleNavigateToEntity = (type: string, id: string) => {
    console.log('Navigate to:', type, id);
    if (onNavigate) {
      onNavigate(`/${type}/${id}`);
    }
  };

  return (
    <div className="h-full overflow-auto">
      {/* Page Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {onBack && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
              <Network className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold mb-1">Relationships & Insights</h1>
              <p className="text-muted-foreground">
                Every insight translates to a clear decision: safe, at risk, or blocked
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Info Alert */}
        <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong className="font-semibold">Decision-Focused Insights:</strong> Relationships are only shown if they directly impact your decision certainty. 
            Each insight ends with: does this increase our certainty, create risk, or have no impact on decisions?
          </AlertDescription>
        </Alert>

        {/* Decision Impact Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <DecisionStatusBadge status="safe-to-decide" size="sm" />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{insightsByImpact['increases-certainty'].length}</p>
                <p className="text-sm text-muted-foreground">Relationships Increase Certainty</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200 dark:border-red-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <DecisionStatusBadge status="blocked" size="sm" />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{insightsByImpact['creates-risk'].length}</p>
                <p className="text-sm text-muted-foreground">Relationships Create Risk</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 dark:border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900/20">
                  <Info className="h-5 w-5 text-gray-600" />
                </div>
                <Badge variant="outline" className="text-xs">Neutral</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{stats.totalRelationships - insightsByImpact['increases-certainty'].length - insightsByImpact['creates-risk'].length}</p>
                <p className="text-sm text-muted-foreground">Informational Only</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Decision-Impacting Insights */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Decision-Impacting Insights</h2>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Filtered by Decision Impact
            </Badge>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="decision-insights" className="gap-2">
                <Target className="h-4 w-4" />
                Actionable Insights
              </TabsTrigger>
              <TabsTrigger value="summary" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Summary View
              </TabsTrigger>
            </TabsList>

            {/* Actionable Insights Tab */}
            <TabsContent value="decision-insights" className="space-y-6">
              {/* Increases Certainty Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold">Increases Decision Certainty ({insightsByImpact['increases-certainty'].length})</h3>
                </div>
                <div className="space-y-4">
                  {insightsByImpact['increases-certainty'].map((insight) => {
                    const config = getImpactConfig(insight.decisionImpact);
                    const Icon = config.icon;
                    const isExpanded = expandedInsight === insight.id;

                    return (
                      <Card 
                        key={insight.id} 
                        className={`border-l-4 ${config.borderColor} hover:shadow-md transition-all`}
                      >
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <Icon className={`h-6 w-6 ${config.color} flex-shrink-0 mt-0.5`} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold">{insight.insight}</h4>
                                    <DecisionStatusBadge status={config.decisionStatus} size="sm" />
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {insight.impactDescription}
                                  </p>
                                  
                                  {/* Relationship Details */}
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                                    <Badge variant="outline" className="text-xs">
                                      {insight.relationship.strength} connection
                                    </Badge>
                                    <span>•</span>
                                    <span>{insight.relationship.from.name}</span>
                                    <ArrowRight className="h-3 w-3" />
                                    <span>{insight.relationship.to.name}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                              >
                                {isExpanded ? 'Hide' : 'Details'}
                                <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </Button>
                            </div>

                            {isExpanded && (
                              <>
                                <Separator />
                                
                                {/* Affected Decisions */}
                                <div className={`p-4 rounded-lg ${config.bgColor}`}>
                                  <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <CheckCircle className={`h-4 w-4 ${config.color}`} />
                                    Decisions Now Safe:
                                  </h5>
                                  <ul className="space-y-1.5">
                                    {insight.affectedDecisions.map((decision, idx) => (
                                      <li key={idx} className="text-sm flex items-start gap-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>{decision}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Recommendation */}
                                <div className="p-4 rounded-lg border bg-background">
                                  <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-blue-600" />
                                    Recommendation:
                                  </h5>
                                  <p className="text-sm leading-relaxed">{insight.recommendation}</p>
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <Separator className="my-8" />

              {/* Creates Risk Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold">Creates Decision Risk ({insightsByImpact['creates-risk'].length})</h3>
                </div>
                <div className="space-y-4">
                  {insightsByImpact['creates-risk'].map((insight) => {
                    const config = getImpactConfig(insight.decisionImpact);
                    const Icon = config.icon;
                    const isExpanded = expandedInsight === insight.id;

                    return (
                      <Card 
                        key={insight.id} 
                        className={`border-l-4 ${config.borderColor} hover:shadow-md transition-all`}
                      >
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <Icon className={`h-6 w-6 ${config.color} flex-shrink-0 mt-0.5`} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold">{insight.insight}</h4>
                                    <DecisionStatusBadge status={config.decisionStatus} size="sm" />
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {insight.impactDescription}
                                  </p>
                                  
                                  {/* Relationship Details */}
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                                    <Badge variant="outline" className="text-xs border-red-200 text-red-700">
                                      {insight.relationship.strength} connection
                                    </Badge>
                                    {insight.relationship.to.type !== 'none' && (
                                      <>
                                        <span>•</span>
                                        <span>{insight.relationship.from.name}</span>
                                        <ArrowRight className="h-3 w-3" />
                                        <span>{insight.relationship.to.name}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                              >
                                {isExpanded ? 'Hide' : 'Details'}
                                <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </Button>
                            </div>

                            {isExpanded && (
                              <>
                                <Separator />
                                
                                {/* Affected Decisions */}
                                <div className={`p-4 rounded-lg ${config.bgColor}`}>
                                  <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <AlertTriangle className={`h-4 w-4 ${config.color}`} />
                                    Decisions Blocked or At Risk:
                                  </h5>
                                  <ul className="space-y-1.5">
                                    {insight.affectedDecisions.map((decision, idx) => (
                                      <li key={idx} className="text-sm flex items-start gap-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>{decision}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Recommendation */}
                                <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/10">
                                  <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-red-600" />
                                    Action Required:
                                  </h5>
                                  <p className="text-sm leading-relaxed text-red-900 dark:text-red-100">
                                    {insight.recommendation}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Summary View Tab */}
            <TabsContent value="summary" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Decision Certainty Summary</CardTitle>
                  <CardDescription>
                    How relationships across your brand are impacting strategic decision quality
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Safe Decisions */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-green-700 dark:text-green-400">
                        ✓ Decisions Made Safe by Relationships
                      </h4>
                      <Badge className="bg-green-100 text-green-700">
                        {insightsByImpact['increases-certainty'].length} areas
                      </Badge>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {insightsByImpact['increases-certainty'].flatMap(i => i.affectedDecisions).slice(0, 5).map((decision, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{decision}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  {/* Risky Decisions */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-red-700 dark:text-red-400">
                        ✗ Decisions Blocked by Relationship Gaps
                      </h4>
                      <Badge className="bg-red-100 text-red-700">
                        {insightsByImpact['creates-risk'].length} areas
                      </Badge>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {insightsByImpact['creates-risk'].flatMap(i => i.affectedDecisions).slice(0, 5).map((decision, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <span>{decision}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  {/* Overall Assessment */}
                  <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Overall Relationship Health</AlertTitle>
                    <AlertDescription className="text-blue-900 dark:text-blue-100 mt-2">
                      Your relationships are creating <strong>{insightsByImpact['increases-certainty'].length} safe decision areas</strong> but 
                      also <strong>{insightsByImpact['creates-risk'].length} decision risks</strong>. 
                      Focus on strengthening weak connections and establishing missing relationships to reduce decision risk.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}