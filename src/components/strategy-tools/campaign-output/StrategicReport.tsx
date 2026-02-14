/**
 * COMPONENT: Strategic Report (Laag 1)
 * 
 * Het volledige strategische verslag dat de campagne uitlegt
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { 
  Target, 
  Users, 
  Lightbulb, 
  TrendingUp, 
  Calendar,
  DollarSign,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  Share2,
  Printer,
  Mail,
  ArrowUp,
  ShieldCheck,
  Shield,
  Info
} from 'lucide-react';
import { mockBrandAssets } from '../../../data/mock-brand-assets';
import { mockPersonas } from '../../../data/mock-personas';
import { calculateDecisionStatus, getMethodLabel } from '../../../utils/decision-status-calculator';
import { DecisionStatusBadge } from '../../decision-status/DecisionStatusBadge';

interface StrategicReportProps {
  campaignConfig: {
    name: string;
    objective: string;
    targetMarket: string;
    keyMessage: string;
    timeline: string;
    budget: string;
    primaryKPI: string;
    secondaryKPIs: string[];
  };
  selectedBrandAssets: string[];
  selectedPersonas: string[];
  selectedProducts: string[];
  selectedTrends: string[];
  selectedKnowledge: string[];
  selectedResearch: string[];
  selectedChannels: string[];
  channelBudgets: Record<string, number>;
}

export function StrategicReport({
  campaignConfig,
  selectedBrandAssets,
  selectedPersonas,
  selectedProducts,
  selectedTrends,
  selectedKnowledge,
  selectedResearch,
  selectedChannels,
  channelBudgets
}: StrategicReportProps) {
  const getObjectiveLabel = (value: string) => {
    const labels: Record<string, string> = {
      'brand-awareness': 'Build Brand Awareness',
      'lead-generation': 'Generate Qualified Leads',
      'product-launch': 'Launch New Product/Service',
      'customer-retention': 'Improve Customer Retention'
    };
    return labels[value] || value;
  };

  const getTimelineLabel = (value: string) => {
    const labels: Record<string, string> = {
      '2-weeks': '2 Weeks',
      '4-weeks': '4 Weeks',
      '8-weeks': '8 Weeks',
      '12-weeks': '12 Weeks',
      '6-months': '6 Months',
      'ongoing': 'Ongoing'
    };
    return labels[value] || value;
  };

  const getBudgetLabel = (value: string) => {
    const labels: Record<string, string> = {
      'under-10k': '< €10,000',
      '10k-50k': '€10,000 - €50,000',
      '50k-100k': '€50,000 - €100,000',
      '100k-250k': '€100,000 - €250,000',
      'over-250k': '> €250,000'
    };
    return labels[value] || value;
  };

  const getKPILabel = (value: string) => {
    const labels: Record<string, string> = {
      'awareness': 'Brand Awareness',
      'leads': 'Lead Generation',
      'sales': 'Sales Revenue',
      'engagement': 'Engagement Rate',
      'traffic': 'Website Traffic',
      'retention': 'Customer Retention Rate',
      'social-followers': 'Social Media Followers',
      'email-subscribers': 'Email List Growth',
      'content-downloads': 'Content Downloads'
    };
    return labels[value] || value;
  };

  // Scroll to top functionality
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate decision quality audit trail
  const decisionAudit = React.useMemo(() => {
    const allItems = [
      ...selectedBrandAssets.map(id => {
        const asset = mockBrandAssets.find(a => a.id === id);
        return asset ? { ...asset, category: 'Brand Asset' as const } : null;
      }).filter(Boolean),
      ...selectedPersonas.map(id => {
        const persona = mockPersonas.find(p => p.id === id);
        return persona ? { ...persona, category: 'Persona' as const, type: persona.name } : null;
      }).filter(Boolean)
    ];

    const withStatus = allItems.map(item => ({
      item: item!,
      statusInfo: calculateDecisionStatus(item!)
    }));

    const safeCount = withStatus.filter(i => i.statusInfo.status === 'safe-to-decide').length;
    const atRiskCount = withStatus.filter(i => i.statusInfo.status === 'decision-at-risk').length;
    const blockedCount = withStatus.filter(i => i.statusInfo.status === 'blocked').length;
    const avgCoverage = withStatus.length > 0 
      ? Math.round(withStatus.reduce((sum, i) => sum + i.statusInfo.coverage, 0) / withStatus.length)
      : 0;

    return {
      items: withStatus,
      safeCount,
      atRiskCount,
      blockedCount,
      avgCoverage,
      totalItems: withStatus.length
    };
  }, [selectedBrandAssets, selectedPersonas]);

  return (
    <div className="space-y-6">
      {/* Header with Export Actions */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {campaignConfig.name || 'Campaign Strategy Report'}
                  </CardTitle>
                  <CardDescription>
                    Generated on {new Date().toLocaleDateString('en-US', { 
                      day: 'numeric',
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </CardDescription>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          </div>

          {/* Export Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              Word
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Table of Contents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Table of Contents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { num: '1', title: 'Executive Summary', icon: FileText },
              { num: '2', title: 'Strategic Framework', icon: Target },
              { num: '3', title: 'Audience & Insights', icon: Users },
              { num: '4', title: 'Campaign Approach', icon: Lightbulb },
              { num: '5', title: 'Channel Strategy', icon: TrendingUp },
              { num: '6', title: 'Measurement & Optimization', icon: BarChart3 },
              { num: '7', title: 'Timeline & Budget', icon: Calendar },
              { num: '8', title: 'Risks & Key Considerations', icon: AlertCircle }
            ].map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.num}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  onClick={() => {
                    const element = document.getElementById(`section-${section.num}`);
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded bg-muted text-sm font-semibold">
                    {section.num}
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{section.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* DECISION QUALITY AUDIT - Shows research validation behind this strategy */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-background">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Decision Quality Audit
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                    {decisionAudit.avgCoverage}% avg coverage
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Research validation status for all strategic inputs used in this campaign
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Quality Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-blue-700">{decisionAudit.totalItems}</div>
                    <div className="text-xs text-blue-600">Total Inputs</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-700">{decisionAudit.safeCount}</div>
                    <div className="text-xs text-green-600">Safe to Decide</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div>
                    <div className="text-2xl font-bold text-amber-700">{decisionAudit.atRiskCount}</div>
                    <div className="text-xs text-amber-600">At Risk</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 bg-gray-50/50 dark:bg-gray-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Info className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="text-2xl font-bold text-gray-700">{decisionAudit.blockedCount}</div>
                    <div className="text-xs text-gray-600">Blocked</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Audit Trail */}
          <div>
            <h4 className="font-semibold mb-3">Research Validation Details</h4>
            <div className="space-y-3">
              {decisionAudit.items.map(({ item, statusInfo }) => (
                <Card key={item.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <h5 className="font-medium">{item.type}</h5>
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                          <DecisionStatusBadge status={statusInfo.status} size="sm" />
                          <div className="flex items-center gap-2 ml-auto">
                            <Progress value={statusInfo.coverage} className="w-20 h-2" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {statusInfo.coverage}%
                            </span>
                          </div>
                        </div>

                        {/* Research Methods Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Completed Methods */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              ✓ Completed Research ({statusInfo.completedMethods.length})
                            </p>
                            <div className="space-y-1">
                              {statusInfo.completedMethods.length > 0 ? (
                                statusInfo.completedMethods.map(method => (
                                  <div key={method} className="flex items-center gap-2">
                                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                                    <span className="text-sm">{getMethodLabel(method)}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground italic">No research completed</p>
                              )}
                            </div>
                          </div>

                          {/* Missing Top Methods */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              {statusInfo.missingTopMethods.length > 0 ? '⚠ Missing Critical Methods' : '✓ All Critical Methods Done'}
                            </p>
                            <div className="space-y-1">
                              {statusInfo.missingTopMethods.length > 0 ? (
                                statusInfo.missingTopMethods.map(method => (
                                  <div key={method} className="flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3 text-amber-600 flex-shrink-0" />
                                    <span className="text-sm">{getMethodLabel(method)}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-green-600">Top 2 methods validated ✓</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Risk Assessment */}
                        {statusInfo.status !== 'safe-to-decide' && (
                          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg">
                            <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">
                              Quality Risk:
                            </p>
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                              {statusInfo.risk}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Overall Assessment */}
          <div className={`p-4 rounded-lg border-2 ${
            decisionAudit.safeCount === decisionAudit.totalItems
              ? 'bg-green-50 border-green-200 dark:bg-green-950/20'
              : decisionAudit.blockedCount > 0
              ? 'bg-red-50 border-red-200 dark:bg-red-950/20'
              : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20'
          }`}>
            <div className="flex items-start gap-3">
              {decisionAudit.safeCount === decisionAudit.totalItems ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      Strong Research Foundation
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      All strategic inputs have been validated through comprehensive research. This campaign strategy is backed by solid evidence and can be executed with confidence.
                    </p>
                  </div>
                </>
              ) : decisionAudit.blockedCount > 0 ? (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                      Research Gaps Identified
                    </h4>
                    <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                      {decisionAudit.blockedCount} input(s) have insufficient research validation. Consider completing the recommended research methods before executing this strategy to minimize risk.
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      <strong>Recommendation:</strong> Treat campaign outputs based on under-researched inputs as hypotheses to test, not validated strategies to execute.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Partial Research Validation
                    </h4>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                      Some strategic inputs have partial research validation. The strategy is usable but would benefit from completing the recommended research methods for stronger confidence.
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>Recommendation:</strong> Proceed with caution and plan to validate key assumptions through pilot testing or additional research.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Executive Summary */}
      <Card id="section-1" className="scroll-mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 text-sm font-semibold text-blue-600">
              1
            </div>
            <CardTitle className="text-xl">Executive Summary</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campaign in het kort */}
          <div className="p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10">
            <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
              Campaign Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">OBJECTIVE</p>
                <p className="text-sm font-medium">{getObjectiveLabel(campaignConfig.objective)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">DURATION</p>
                <p className="text-sm font-medium">{getTimelineLabel(campaignConfig.timeline)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">BUDGET</p>
                <p className="text-sm font-medium">{getBudgetLabel(campaignConfig.budget)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">PRIMARY KPI</p>
                <p className="text-sm font-medium">{getKPILabel(campaignConfig.primaryKPI)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">CHANNELS</p>
                <p className="text-sm font-medium">{selectedChannels.length} Selected</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">AUDIENCES</p>
                <p className="text-sm font-medium">{selectedPersonas.length} Personas</p>
              </div>
            </div>
          </div>

          {/* Campaign Essence */}
          <div>
            <h3 className="font-semibold mb-3">Campaign Essence</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This campaign is designed to achieve {getObjectiveLabel(campaignConfig.objective).toLowerCase()} 
              through an integrated multi-channel approach. With a focus on{' '}
              <span className="font-medium text-foreground">{campaignConfig.targetMarket || 'the selected target audience'}</span>, 
              the core message "{campaignConfig.keyMessage}" will be communicated via {selectedChannels.length} primary channels 
              over a period of {getTimelineLabel(campaignConfig.timeline).toLowerCase()}.
            </p>
          </div>

          {/* Strategic Position */}
          <div>
            <h3 className="font-semibold mb-3">Strategic Position</h3>
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm italic leading-relaxed">
                "{campaignConfig.keyMessage || 'The core message we want to communicate'}"
              </p>
              <p className="text-xs text-muted-foreground mt-2">— Campaign Core Message</p>
            </div>
          </div>

          {/* Connected Assets & Research */}
          {(selectedBrandAssets.length > 0 || selectedResearch.length > 0 || selectedTrends.length > 0 || selectedKnowledge.length > 0) && (
            <div>
              <h3 className="font-semibold mb-3">Input & Foundation</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedBrandAssets.length > 0 && (
                  <div className="p-3 rounded-lg border bg-purple-50 dark:bg-purple-900/10">
                    <p className="text-xs text-muted-foreground mb-1">BRAND ASSETS</p>
                    <p className="text-2xl font-bold text-purple-600">{selectedBrandAssets.length}</p>
                  </div>
                )}
                {selectedPersonas.length > 0 && (
                  <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/10">
                    <p className="text-xs text-muted-foreground mb-1">PERSONAS</p>
                    <p className="text-2xl font-bold text-blue-600">{selectedPersonas.length}</p>
                  </div>
                )}
                {selectedResearch.length > 0 && (
                  <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-900/10">
                    <p className="text-xs text-muted-foreground mb-1">RESEARCH</p>
                    <p className="text-2xl font-bold text-green-600">{selectedResearch.length}</p>
                  </div>
                )}
                {selectedTrends.length > 0 && (
                  <div className="p-3 rounded-lg border bg-orange-50 dark:bg-orange-900/10">
                    <p className="text-xs text-muted-foreground mb-1">TRENDS</p>
                    <p className="text-2xl font-bold text-orange-600">{selectedTrends.length}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Strategisch Kader */}
      <Card id="section-2" className="scroll-mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 text-sm font-semibold text-blue-600">
              2
            </div>
            <CardTitle className="text-xl">Strategic Framework</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campaign Objective */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Campaign Objective
            </h3>
            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/10">
              <p className="font-medium mb-2">{getObjectiveLabel(campaignConfig.objective)}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {campaignConfig.objective === 'lead-generation' && 
                  'This campaign focuses on generating qualified leads who show interest in the offering through active engagement with campaign content.'
                }
                {campaignConfig.objective === 'brand-awareness' && 
                  'This campaign focuses on increasing brand awareness and positive brand associations within the target audience.'
                }
                {campaignConfig.objective === 'product-launch' && 
                  'This campaign introduces a new product or service to the market with the goal of creating initial adoption and awareness.'
                }
                {campaignConfig.objective === 'customer-retention' && 
                  'This campaign focuses on retaining and strengthening relationships with existing customers to reduce churn.'
                }
              </p>
            </div>
          </div>

          {/* Key Message */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-orange-600" />
              Core Message
            </h3>
            <div className="p-6 rounded-lg border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10">
              <p className="text-lg font-semibold text-center mb-2">
                "{campaignConfig.keyMessage || 'The core message we want to communicate'}"
              </p>
              <p className="text-xs text-center text-muted-foreground">
                This is the single-minded proposition - everything we communicate must lead to this
              </p>
            </div>
          </div>

          {/* Target Market */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Target Market
            </h3>
            <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-900/10">
              <p className="text-sm leading-relaxed">
                {campaignConfig.targetMarket || 'The primary target audience for this campaign.'}
              </p>
            </div>
            {selectedPersonas.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                ✓ {selectedPersonas.length} persona{selectedPersonas.length > 1 ? "'s" : ''} selected for detailed targeting
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Doelgroep & Insights */}
      <Card id="section-3" className="scroll-mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 text-sm font-semibold text-blue-600">
              3
            </div>
            <CardTitle className="text-xl">Audience & Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Selected Personas</h3>
            {selectedPersonas.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This campaign targets <span className="font-medium text-foreground">{selectedPersonas.length}</span> primary persona{selectedPersonas.length > 1 ? 's' : ''} 
                  selected from the Persona Library based on their fit with the campaign objective.
                </p>
                <div className="p-4 rounded-lg border bg-muted/50">
                  <p className="text-sm">
                    For detailed persona profiles, messaging strategies per persona, and customer journey mapping, 
                    see the next steps suggestions below.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border-2 border-dashed bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  No specific personas selected. The campaign targets the general market as described.
                </p>
              </div>
            )}
          </div>

          {selectedResearch.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Linked Research</h3>
              <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-900/10">
                <p className="text-sm mb-2">
                  This campaign strategy is based on insights from <span className="font-medium">{selectedResearch.length}</span> research report{selectedResearch.length > 1 ? 's' : ''}:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Market insights and trends</li>
                  <li>Target audience behavior and preferences</li>
                  <li>Competitive analysis</li>
                </ul>
              </div>
            </div>
          )}

          {selectedTrends.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Relevant Trends</h3>
              <div className="p-4 rounded-lg border bg-orange-50 dark:bg-orange-900/10">
                <p className="text-sm">
                  The campaign anticipates <span className="font-medium">{selectedTrends.length}</span> current trend{selectedTrends.length > 1 ? 's' : ''} 
                  relevant to the target audience and strategic positioning.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Campagne Aanpak */}
      <Card id="section-4" className="scroll-mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 text-sm font-semibold text-blue-600">
              4
            </div>
            <CardTitle className="text-xl">Campaign Approach</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Strategic Approach</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              The campaign uses an integrated multi-channel approach where each touchpoint contributes to \
              achieving the primary objective: {getObjectiveLabel(campaignConfig.objective).toLowerCase()}.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10">
                <h4 className="font-semibold text-sm mb-2">Phase 1: Awareness</h4>
                <p className="text-xs text-muted-foreground">
                  Create awareness and interest within the target audience
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10">
                <h4 className="font-semibold text-sm mb-2">Phase 2: Consideration</h4>
                <p className="text-xs text-muted-foreground">
                  Strengthen positioning and build trust
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10">
                <h4 className="font-semibold text-sm mb-2">Phase 3: Conversion</h4>
                <p className="text-xs text-muted-foreground">
                  Drive action and measure results
                </p>
              </div>
            </div>
          </div>

          {selectedBrandAssets.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Brand Assets & Creative</h3>
              <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-900/10">
                <p className="text-sm mb-2">
                  The campaign uses <span className="font-medium">{selectedBrandAssets.length}</span> selected brand asset{selectedBrandAssets.length > 1 ? 's' : ''} \
                  to ensure consistent brand experience.
                </p>
                <p className="text-xs text-muted-foreground">
                  All assets are available in the Brand Library and comply with brand guidelines.
                </p>
              </div>
            </div>
          )}

          {selectedKnowledge.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Content & Knowledge Base</h3>
              <div className="p-4 rounded-lg border bg-cyan-50 dark:bg-cyan-900/10">
                <p className="text-sm">
                  <span className="font-medium">{selectedKnowledge.length}</span> knowledge resource{selectedKnowledge.length > 1 ? 's' : ''} \
                  selected to support the campaign content strategy.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Channel Strategie */}
      <Card id="section-5" className="scroll-mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 text-sm font-semibold text-blue-600">
              5
            </div>
            <CardTitle className="text-xl">Channel Strategy</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedChannels.length > 0 ? (
            <>
              <div>
                <h3 className="font-semibold mb-3">Selected Channels</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The campaign will be deployed across <span className="font-medium text-foreground">{selectedChannels.length}</span> primary channels, \
                  each with a specific role in the customer journey.
                </p>
              </div>

              {/* Channel Budget Allocation */}
              {Object.keys(channelBudgets).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Budget Allocation</h3>
                  <div className="space-y-2">
                    {Object.entries(channelBudgets).map(([channel, percentage]) => {
                      const channelNames: Record<string, string> = {
                        'social-media': 'Social Media',
                        'email': 'Email Marketing',
                        'paid-search': 'Paid Search',
                        'content': 'Content Marketing',
                        'paid-social': 'Paid Social',
                        'events': 'Events & Webinars'
                      };
                      
                      return (
                        <div key={channel} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{channelNames[channel] || channel}</span>
                              <span className="text-sm font-semibold">{percentage}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {Object.values(channelBudgets).reduce((a, b) => a + b, 0) === 100 && (
                    <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Budget fully allocated (100%)
                    </p>
                  )}
                </div>
              )}

              <div className="p-4 rounded-lg border bg-muted/50">
                <p className="text-sm">
                  For a detailed channel-by-channel strategy with tactical execution, see the next steps suggestions.
                </p>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-lg border-2 border-dashed bg-muted/30">
              <p className="text-sm text-muted-foreground">
                No specific channels selected. Choose channels in the configuration tab for a detailed channel strategy.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Meting & Optimalisatie */}
      <Card id="section-6" className="scroll-mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 text-sm font-semibold text-blue-600">
              6
            </div>
            <CardTitle className="text-xl">Measurement & Optimization</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary KPI */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Primary KPI
            </h3>
            <div className="p-4 rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SUCCESS METRIC</p>
                  <p className="text-lg font-semibold">{getKPILabel(campaignConfig.primaryKPI)}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-600 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                This metric is monitored daily and is the primary indicator for campaign success
              </p>
            </div>
          </div>

          {/* Secondary KPIs */}
          {campaignConfig.secondaryKPIs.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Secondary KPIs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {campaignConfig.secondaryKPIs.map((kpi) => (
                  <div key={kpi} className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-sm font-medium">{getKPILabel(kpi)}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These metrics support the primary KPI and provide additional insight into campaign performance
              </p>
            </div>
          )}

          {/* Reporting */}
          <div>
            <h3 className="font-semibold mb-3">Reporting Cadence</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="h-6 w-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">D</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Daily Dashboard</p>
                  <p className="text-xs text-muted-foreground">Automated real-time metrics for campaign team</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="h-6 w-6 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-purple-600">W</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Weekly Review</p>
                  <p className="text-xs text-muted-foreground">Performance summary for marketing team</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="h-6 w-6 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-green-600">M</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Monthly Stakeholder Update</p>
                  <p className="text-xs text-muted-foreground">Strategic review for management</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7. Timeline & Budget */}
      <Card id="section-7" className="scroll-mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 text-sm font-semibold text-blue-600">
              7
            </div>
            <CardTitle className="text-xl">Timeline & Budget</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timeline */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Campaign Duration
              </h3>
              <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/10">
                <p className="text-2xl font-bold text-blue-600 mb-1">
                  {getTimelineLabel(campaignConfig.timeline)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total campaign duration from start to finish
                </p>
              </div>
            </div>

            {/* Budget */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Budget Allocation
              </h3>
              <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-900/10">
                <p className="text-2xl font-bold text-green-600 mb-1">
                  {getBudgetLabel(campaignConfig.budget)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total media & marketing budget
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-muted/50">
            <p className="text-sm">
              For a detailed week-by-week timeline with milestones and budget pacing plan, \
              see the next steps suggestions below.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 8. Risico's & Aandachtspunten */}
      <Card id="section-8" className="scroll-mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 text-sm font-semibold text-blue-600">
              8
            </div>
            <CardTitle className="text-xl">Risks & Key Considerations</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Key Considerations
            </h3>
            
            <div className="space-y-3">
              <div className="p-4 rounded-lg border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-900/10">
                <h4 className="font-semibold text-sm mb-2">Campaign Dependencies</h4>
                <p className="text-sm text-muted-foreground">
                  Ensure all selected assets, personas and research are available and approved \
                  before the campaign launches.
                </p>
              </div>

              <div className="p-4 rounded-lg border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
                <h4 className="font-semibold text-sm mb-2">Tracking & Measurement</h4>
                <p className="text-sm text-muted-foreground">
                  Implement all tracking pixels and conversion events at least 1 week before campaign start to \
                  prevent data loss.
                </p>
              </div>

              <div className="p-4 rounded-lg border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/10">
                <h4 className="font-semibold text-sm mb-2">Stakeholder Alignment</h4>
                <p className="text-sm text-muted-foreground">
                  Ensure clear approvals and decision-making authority before budget is committed.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-muted/50">
            <p className="text-sm">
              For a comprehensive risk assessment with mitigation plans and contingency strategies, \
              see the next steps suggestions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps Teaser */}
      <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Your Strategy is Ready!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Based on this report, we've prepared concrete next steps and outputs for you. \
                Scroll down to see what you can do now.
              </p>
              <Button className="gap-2">
                View Next Steps
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-300 flex items-center justify-center group"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
}

const ArrowRight = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14"></path>
    <path d="m12 5 7 7-7 7"></path>
  </svg>
);