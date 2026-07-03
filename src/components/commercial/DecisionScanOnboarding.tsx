/**
 * COMPONENT: Decision Scan Onboarding
 * 
 * Entry product: Onboarding flow that ends in decision status,
 * top 3 risks, action plan, and example campaign.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('commercial');
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
    decisionStatus: 'at-risk' as const,
    overallScore: 62,
    risks: [
      {
        title: t('scan.data.risk1Title'),
        severity: 'high' as const,
        impact: t('scan.data.risk1Impact'),
        action: t('scan.data.risk1Action')
      },
      {
        title: t('scan.data.risk2Title'),
        severity: 'medium' as const,
        impact: t('scan.data.risk2Impact'),
        action: t('scan.data.risk2Action')
      },
      {
        title: t('scan.data.risk3Title'),
        severity: 'medium' as const,
        impact: t('scan.data.risk3Impact'),
        action: t('scan.data.risk3Action')
      }
    ],
    actionPlan: {
      immediate: [
        t('scan.data.immediate1'),
        t('scan.data.immediate2')
      ],
      shortTerm: [
        t('scan.data.shortTerm1'),
        t('scan.data.shortTerm2')
      ],
      ongoing: [
        t('scan.data.ongoing1'),
        t('scan.data.ongoing2')
      ]
    },
    exampleCampaign: {
      name: t('scan.data.campaignName'),
      objective: 'product-launch',
      confidenceScore: 58,
      warnings: [
        t('scan.data.warning1'),
        t('scan.data.warning2')
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
              <p className="text-sm font-medium text-muted-foreground mb-1">{t('scan.welcome.certaintyLevel')}</p>
              <p className="text-2xl font-bold mb-2">{tierInfo.certaintyLevel}</p>
              <p className="text-sm text-muted-foreground">{tierInfo.certaintyDescription}</p>
            </div>

            {/* What You'll Get */}
            <div>
              <h3 className="font-semibold mb-4 text-center">{t('scan.welcome.whatYouGet')}</h3>
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
                {t('scan.welcome.oneTimeTitle')}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t('scan.welcome.oneTimeBody')}
              </p>
            </div>

            {/* CTA */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 gap-2"
                onClick={startScan}
              >
                {t('scan.welcome.startFreeScan')}
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
      { threshold: 20, label: t('scan.scanning.stage1') },
      { threshold: 40, label: t('scan.scanning.stage2') },
      { threshold: 60, label: t('scan.scanning.stage3') },
      { threshold: 80, label: t('scan.scanning.stage4') },
      { threshold: 100, label: t('scan.scanning.stage5') }
    ];

    const currentStage = scanStages.find(s => scanProgress <= s.threshold) || scanStages[scanStages.length - 1];

    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-2">
          <CardContent className="p-12 text-center">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-blue-100 dark:bg-blue-900/50 mx-auto mb-6 animate-pulse">
              <Shield className="h-10 w-10 text-blue-700 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">{t('scan.scanning.title')}</h2>
            <p className="text-muted-foreground mb-8">
              {t('scan.scanning.body')}
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
      case 'safe':
        return 'text-green-700 dark:text-green-400';
      case 'at-risk':
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
              <CardTitle className="text-2xl mb-2">{t('scan.results.title')}</CardTitle>
              <CardDescription>
                {t('scan.results.subtitle')}
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
            {t('scan.results.decisionStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 rounded-lg border bg-muted/30 text-center">
            <p className={`text-4xl font-bold mb-2 ${getStatusColor(scanResults.decisionStatus)}`}>
              {scanResults.overallScore}%
            </p>
            <p className="font-semibold mb-1">{t('scan.results.decisionAtRisk')}</p>
            <p className="text-sm text-muted-foreground">
              {t('scan.results.decisionAtRiskBody')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Top 3 Risks */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t('scan.results.topRisks')}
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
                      {risk.severity === 'high' ? t('scan.results.severityHigh') : t('scan.results.severityMedium')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{risk.impact}</p>
                  <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      {t('scan.results.recommendedAction', { action: risk.action })}
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
            {t('scan.results.actionPlan')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('scan.results.immediateActions')}</p>
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
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('scan.results.shortTerm')}</p>
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
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('scan.results.ongoingProcess')}</p>
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
            {t('scan.results.exampleCampaign')}
          </CardTitle>
          <CardDescription>
            {t('scan.results.exampleCampaignSubtitle')}
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
                <span className="text-sm text-muted-foreground">{t('scan.results.confidenceScore')}</span>
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
              {t('scan.results.upsellTitle')}
            </p>
            <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
              {t('scan.results.upsellBody')}
            </p>
            <Button
              variant="default"
              size="sm"
              className="w-full gap-2"
              onClick={onUpgrade}
            >
              {t('scan.results.upsellCta')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onComplete} className="flex-1">
          {t('scan.results.viewInDashboard')}
        </Button>
        <Button onClick={onUpgrade} className="flex-1 gap-2">
          {t('scan.results.upgradeFullControl')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
