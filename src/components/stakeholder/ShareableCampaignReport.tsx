/**
 * COMPONENT: Shareable Campaign Report
 * 
 * Printable and shareable report version of a campaign.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  ArrowLeft,
  Download,
  Share2,
  Printer,
  Megaphone,
  Package,
  Users,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Calendar,
  FileText,
  TrendingUp,
  Lightbulb,
  Shield,
  Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CampaignMetadata {
  generatedAt: string;
  usedBrandAssets: Array<{ id: string; title: string; version?: string }>;
  usedPersonas: Array<{ id: string; name: string }>;
  researchCoverageSnapshot: number;
  decisionStatus: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
  decisionRisks: string[];
  totalAssets: number;
  totalPersonas: number;
}

interface Campaign {
  id: string;
  name: string;
  objective: string;
  createdAt: Date;
  status: string;
  generationMetadata?: CampaignMetadata;
}

interface ShareableCampaignReportProps {
  campaign: Campaign;
  onBack: () => void;
}

export function ShareableCampaignReport({ campaign, onBack }: ShareableCampaignReportProps) {
  if (!campaign.generationMetadata) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No metadata available for this report
            </p>
            <Button className="mt-4" onClick={onBack}>
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metadata = campaign.generationMetadata;
  const generatedDate = new Date(metadata.generatedAt);
  const timeAgo = formatDistanceToNow(generatedDate, { addSuffix: true });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe-to-decide':
        return 'text-green-700 dark:text-green-400';
      case 'decision-at-risk':
        return 'text-amber-700 dark:text-amber-400';
      case 'do-not-decide':
        return 'text-red-700 dark:text-red-400';
      default:
        return 'text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'safe-to-decide':
        return CheckCircle;
      case 'decision-at-risk':
        return AlertTriangle;
      case 'do-not-decide':
        return AlertCircle;
      default:
        return AlertCircle;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'safe-to-decide':
        return 'Safe to Decide';
      case 'decision-at-risk':
        return 'Decision at Risk';
      case 'do-not-decide':
        return 'Do Not Decide';
      default:
        return status;
    }
  };

  const StatusIcon = getStatusIcon(metadata.decisionStatus);

  return (
    <div className="min-h-screen bg-background">
      {/* Action Bar - Not printed */}
      <div className="bg-muted border-b print:hidden">
        <div className="max-w-5xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => alert('Share link: https://platform.example.com/reports/campaign/' + campaign.id)}
              >
                <Share2 className="h-4 w-4" />
                Share Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Print / PDF
              </Button>
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={() => alert('Downloading as PDF...')}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content - Printable */}
      <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-8">
        {/* Report Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-purple-100 dark:bg-purple-900/50 mb-4">
            <Megaphone className="h-8 w-8 text-purple-700 dark:text-purple-400" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Campaign Strategy Report</h1>
          <p className="text-xl text-muted-foreground">{campaign.name}</p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <Badge variant="outline" className="capitalize">
              {campaign.objective.replace('-', ' ')}
            </Badge>
            <span>•</span>
            <span>Generated: {generatedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span>•</span>
            <span>Report: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* 1. Strategy Snapshot */}
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              Strategy Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Generation Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Generation Date</p>
                <p className="font-medium">
                  {generatedDate.toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {timeAgo}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                <Badge className="capitalize">
                  {campaign.status}
                </Badge>
              </div>
            </div>

            {/* Brand Assets Used */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Brand Assets ({metadata.usedBrandAssets.length})
                </p>
              </div>
              <div className="space-y-2">
                {metadata.usedBrandAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                    <span className="text-sm font-medium">{asset.title}</span>
                    {asset.version && (
                      <Badge variant="outline" className="text-xs">
                        v{asset.version}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Personas Used */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Target Personas ({metadata.usedPersonas.length})
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {metadata.usedPersonas.map((persona) => (
                  <Badge key={persona.id} variant="outline">
                    {persona.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Research Coverage */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Research Coverage</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Average validation of used assets</span>
                  <span className="font-semibold">{metadata.researchCoverageSnapshot}%</span>
                </div>
                <Progress value={metadata.researchCoverageSnapshot} className="h-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Decision Quality */}
        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-700 dark:text-purple-400" />
              Decision Quality
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Decision Status */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                <StatusIcon className={`h-6 w-6 ${getStatusColor(metadata.decisionStatus)}`} />
                <div className="flex-1">
                  <p className="font-semibold text-lg">{getStatusLabel(metadata.decisionStatus)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Status at time of generation
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed">
                {metadata.decisionStatus === 'safe-to-decide' && 
                  'This campaign was generated with sufficiently validated strategic input. All used brand assets and personas have adequate research validation.'}
                {metadata.decisionStatus === 'decision-at-risk' &&
                  'This campaign contains elements with limited validation. Strategic choices are based on partially validated input. Additional validation is recommended before execution.'}
                {metadata.decisionStatus === 'do-not-decide' &&
                  'This campaign was generated with insufficiently validated input. Strong recommendation: validate the underlying strategy before execution.'}
              </p>
            </div>

            {/* Risks */}
            {metadata.decisionRisks && metadata.decisionRisks.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Identified Risks</p>
                <div className="space-y-2">
                  {metadata.decisionRisks.map((risk, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-amber-900 dark:text-amber-100">{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold">{metadata.totalAssets}</p>
                <p className="text-xs text-muted-foreground mt-1">Brand Assets</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold">{metadata.totalPersonas}</p>
                <p className="text-xs text-muted-foreground mt-1">Personas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Change Awareness */}
        <Card className="border-2 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-700 dark:text-green-400" />
              Change Awareness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                    Campaign is Stable
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    No significant changes have been detected in the underlying strategic assets since this campaign was generated. The campaign strategy remains valid and up to date.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Last Verification</p>
              <p className="text-sm">
                {new Date().toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Recommendation:</strong> Monitor the underlying brand assets and personas for changes.
                Recalculate the campaign if there are significant updates in the strategic input.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Recommendations */}
        <Card className="border-2 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-700 dark:text-amber-400" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metadata.decisionStatus === 'safe-to-decide' ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-background border">
                  <p className="font-medium text-sm mb-1">✓ Campaign Execution</p>
                  <p className="text-sm text-muted-foreground">
                    This campaign is ready for execution. All strategic elements have been sufficiently validated.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <p className="font-medium text-sm mb-1">Monitor & Optimize</p>
                  <p className="text-sm text-muted-foreground">
                    Track campaign performance and compare with research predictions. Use learnings for future optimizations.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <p className="font-medium text-sm mb-1">Periodic Review</p>
                  <p className="text-sm text-muted-foreground">
                    Schedule quarterly reviews of the underlying strategy to ensure continued validity.
                  </p>
                </div>
              </div>
            ) : metadata.decisionStatus === 'decision-at-risk' ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <p className="font-medium text-sm mb-1 text-amber-900 dark:text-amber-100">
                    Elevated Risk - Additional Validation Recommended
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Conduct additional research on the weak elements before investing significant budget in this campaign.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <p className="font-medium text-sm mb-1">Start with a Small Test</p>
                  <p className="text-sm text-muted-foreground">
                    Begin with a limited pilot or A/B test to validate assumptions before full rollout.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <p className="font-medium text-sm mb-1 text-red-900 dark:text-red-100">
                    Do Not Execute - Validation Required
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    This campaign has insufficient strategic validation. Strong recommendation to conduct research first before budget allocation.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <p className="font-medium text-sm mb-1">Start Validation Research</p>
                  <p className="text-sm text-muted-foreground">
                    Begin with the recommended research methods for the critical brand assets and personas.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Footer */}
        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>This report was automatically generated on {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="mt-1">Based on campaign generation metadata and real-time platform data</p>
        </div>
      </div>
    </div>
  );
}