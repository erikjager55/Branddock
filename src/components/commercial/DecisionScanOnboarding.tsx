/**
 * COMPONENT: Decision Scan Onboarding
 * 
 * Entry product: Onboarding flow that ends in decision status,
 * top 3 risks, action plan, and example campaign.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  ArrowRight,
  CheckCircle,
  Shield,
  AlertTriangle,
  ListChecks,
  Sparkles,
  ArrowLeft,
  Rocket
} from 'lucide-react';
import { PRODUCT_TIERS } from '../../types/product-tier';

type ScanStep = 'welcome' | 'scanning' | 'results';

interface DecisionScanOnboardingProps {
  onComplete: () => void;
  onUpgrade?: () => void;
}

export function DecisionScanOnboarding({ onComplete, onUpgrade }: DecisionScanOnboardingProps) {
  const [step, setStep] = useState<ScanStep>('welcome');
  const [scanProgress, setScanProgress] = useState(0);

  const tierInfo = PRODUCT_TIERS['decision-scan'];

  // Simulate scanning process
  const startScan = () => {
    setStep('scanning');
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setStep('results'), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  };

  // Mock scan results
  const scanResults = {
    decisionStatus: 'decision-at-risk' as const,
    overallScore: 62,
    risks: [
      {
        title: 'Limited persona validation',
        severity: 'high' as const,
        impact: 'Marketing to unvalidated target audiences increases the risk of low conversion by 45%',
        action: 'Start user interviews for top 3 persona segments'
      },
      {
        title: 'Inconsistent brand messaging',
        severity: 'medium' as const,
        impact: 'Messaging has not been consistently tested across different channels',
        action: 'Validate core messaging via A/B testing'
      },
      {
        title: 'Outdated competitive data',
        severity: 'medium' as const,
        impact: 'Positioning based on 6+ months old market data',
        action: 'Update competitive analysis'
      }
    ],
    actionPlan: {
      immediate: [
        'Validate top 3 personas via user research',
        'Test core messaging in primary channels'
      ],
      shortTerm: [
        'Update competitive positioning analysis',
        'Conduct brand perception study'
      ],
      ongoing: [
        'Implement quarterly research reviews',
        'Monitor decision quality metrics'
      ]
    },
    exampleCampaign: {
      name: 'Product Launch Campaign (Example)',
      objective: 'product-launch',
      confidenceScore: 58,
      warnings: [
        'Insufficient validation of target audience segment',
        'Limited data on channel effectiveness'
      ]
    }
  };

  if (step === 'welcome') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-2">
          <CardHeader className="text-center pb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-100 dark:bg-blue-900/50 mx-auto mb-6">
              <Shield className="h-8 w-8 text-blue-700 dark:text-blue-400" />
            </div>
            <CardTitle className="text-3xl mb-3">{tierInfo.name}</CardTitle>
            <CardDescription className="text-lg">
              {tierInfo.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Certainty Level */}
            <div className="text-center p-6 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium text-muted-foreground mb-1">Decision Certainty Level</p>
              <p className="text-2xl font-bold mb-2">{tierInfo.certaintyLevel}</p>
              <p className="text-sm text-muted-foreground">{tierInfo.certaintyDescription}</p>
            </div>

            {/* What You'll Get */}
            <div>
              <h3 className="font-semibold mb-4 text-center">What you get after the scan:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tierInfo.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Limitations */}
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                Note: This is a one-time scan
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                For continuous monitoring, campaign generation, and research tools you need a Strategic Control subscription.
              </p>
            </div>

            {/* CTA */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 gap-2"
                onClick={startScan}
              >
                Start Free Scan
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'scanning') {
    const scanStages = [
      { threshold: 20, label: 'Analyzing brand assets...' },
      { threshold: 40, label: 'Calculating research coverage...' },
      { threshold: 60, label: 'Identifying risks...' },
      { threshold: 80, label: 'Generating action plan...' },
      { threshold: 100, label: 'Preparing results...' }
    ];

    const currentStage = scanStages.find(s => scanProgress <= s.threshold) || scanStages[scanStages.length - 1];

    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-2">
          <CardContent className="p-12 text-center">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-blue-100 dark:bg-blue-900/50 mx-auto mb-6 animate-pulse">
              <Shield className="h-10 w-10 text-blue-700 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Decision Scan Active</h2>
            <p className="text-muted-foreground mb-8">
              We are analyzing your strategic decision-making...
            </p>

            <div className="space-y-4">
              <Progress value={scanProgress} className="h-3" />
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {currentStage.label}
              </p>
              <p className="text-2xl font-bold">{scanProgress}%</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results step
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe-to-decide':
        return 'text-green-700 dark:text-green-400';
      case 'decision-at-risk':
        return 'text-amber-700 dark:text-amber-400';
      default:
        return 'text-red-700 dark:text-red-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">Your Decision Scan Results</CardTitle>
              <CardDescription>
                Insight into the quality of your strategic decision-making
              </CardDescription>
            </div>
            <Badge className={tierInfo.color.badge} variant="outline">
              {tierInfo.name}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* 1. Decision Status */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Decision Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 rounded-lg border bg-muted/30 text-center">
            <p className={`text-4xl font-bold mb-2 ${getStatusColor(scanResults.decisionStatus)}`}>
              {scanResults.overallScore}%
            </p>
            <p className="font-semibold mb-1">Decision at Risk</p>
            <p className="text-sm text-muted-foreground">
              Your strategic decisions have moderate validation. Increased risk of suboptimal outcomes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Top 3 Risks */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Top 3 Strategic Risks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scanResults.risks.map((risk, index) => (
            <div key={index} className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{risk.title}</h4>
                    <Badge className={getSeverityColor(risk.severity)} variant="outline">
                      {risk.severity === 'high' ? 'High' : 'Medium'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{risk.impact}</p>
                  <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      Recommended action: {risk.action}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3. Action Plan */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Your Action Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Immediate Actions</p>
            <div className="space-y-2">
              {scanResults.actionPlan.immediate.map((action, index) => (
                <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-900 dark:text-red-100">{action}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Short Term (1-3 months)</p>
            <div className="space-y-2">
              {scanResults.actionPlan.shortTerm.map((action, index) => (
                <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <CheckCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-amber-900 dark:text-amber-100">{action}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Ongoing Process</p>
            <div className="space-y-2">
              {scanResults.actionPlan.ongoing.map((action, index) => (
                <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <Rocket className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-blue-900 dark:text-blue-100">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Example Campaign */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Example Campaign
          </CardTitle>
          <CardDescription>
            This is how a campaign would look with your current decision quality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/30 border">
            <h4 className="font-semibold mb-2">{scanResults.exampleCampaign.name}</h4>
            <div className="flex items-center gap-4 mb-3">
              <Badge variant="outline" className="capitalize">
                {scanResults.exampleCampaign.objective.replace('-', ' ')}
              </Badge>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Confidence Score:</span>
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {scanResults.exampleCampaign.confidenceScore}%
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {scanResults.exampleCampaign.warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-amber-900 dark:text-amber-100">{warning}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
              Want to generate campaigns with higher confidence scores?
            </p>
            <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
              With Strategic Control you get access to the full decision engine, research tools, and unlimited campaign generation.
            </p>
            <Button
              variant="default"
              size="sm"
              className="w-full gap-2"
              onClick={onUpgrade}
            >
              Upgrade to Strategic Control
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onComplete} className="flex-1">
          View in Dashboard
        </Button>
        <Button onClick={onUpgrade} className="flex-1 gap-2">
          Upgrade for Full Control
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
