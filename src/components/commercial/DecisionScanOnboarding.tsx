/**
 * COMPONENT: Decision Scan Onboarding
 * 
 * Entry product: Onboarding flow die eindigt in decision status,
 * top 3 risico's, actieplan, en voorbeeldcampagne.
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
        title: 'Beperkte persona validatie',
        severity: 'high' as const,
        impact: 'Marketing naar ongevalideerde doelgroepen verhoogt het risico op lage conversie met 45%',
        action: 'Start user interviews voor top 3 persona segmenten'
      },
      {
        title: 'Inconsistente brand messaging',
        severity: 'medium' as const,
        impact: 'Boodschap is niet consistent getest over verschillende kanalen',
        action: 'Valideer kernboodschap via A/B testing'
      },
      {
        title: 'Verouderde competitive data',
        severity: 'medium' as const,
        impact: 'Positionering gebaseerd op 6+ maanden oude marktdata',
        action: 'Update competitive analysis'
      }
    ],
    actionPlan: {
      immediate: [
        'Valideer top 3 personas via user research',
        'Test kernboodschap in primaire kanalen'
      ],
      shortTerm: [
        'Update competitive positioning analyse',
        'Voer brand perception study uit'
      ],
      ongoing: [
        'Implementeer kwartaal research reviews',
        'Monitor decision quality metrics'
      ]
    },
    exampleCampaign: {
      name: 'Product Launch Campaign (Example)',
      objective: 'product-launch',
      confidenceScore: 58,
      warnings: [
        'Onvoldoende validatie van doelgroep segment',
        'Beperkte data voor channel effectiviteit'
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
              <p className="text-sm font-medium text-muted-foreground mb-1">Besliszekerheid Niveau</p>
              <p className="text-2xl font-bold mb-2">{tierInfo.certaintyLevel}</p>
              <p className="text-sm text-muted-foreground">{tierInfo.certaintyDescription}</p>
            </div>

            {/* What You'll Get */}
            <div>
              <h3 className="font-semibold mb-4 text-center">Wat je krijgt na de scan:</h3>
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
                Let op: Dit is een eenmalige scan
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Voor continue monitoring, campagne generatie en research tools heb je een Strategic Control abonnement nodig.
              </p>
            </div>

            {/* CTA */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 gap-2"
                onClick={startScan}
              >
                Start Gratis Scan
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
      { threshold: 20, label: 'Brand assets analyseren...' },
      { threshold: 40, label: 'Research coverage berekenen...' },
      { threshold: 60, label: 'Risico\'s identificeren...' },
      { threshold: 80, label: 'Actieplan genereren...' },
      { threshold: 100, label: 'Resultaten voorbereiden...' }
    ];

    const currentStage = scanStages.find(s => scanProgress <= s.threshold) || scanStages[scanStages.length - 1];

    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-2">
          <CardContent className="p-12 text-center">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-blue-100 dark:bg-blue-900/50 mx-auto mb-6 animate-pulse">
              <Shield className="h-10 w-10 text-blue-700 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Decision Scan Actief</h2>
            <p className="text-muted-foreground mb-8">
              We analyseren je strategische besluitvorming...
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
              <CardTitle className="text-2xl mb-2">Je Decision Scan Resultaten</CardTitle>
              <CardDescription>
                Inzicht in de kwaliteit van je strategische besluitvorming
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
              Je strategische beslissingen hebben matige validatie. Verhoogd risico op suboptimale resultaten.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Top 3 Risks */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Top 3 Strategische Risico's
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
                      {risk.severity === 'high' ? 'Hoog' : 'Middel'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{risk.impact}</p>
                  <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      Aanbevolen actie: {risk.action}
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
            Jouw Actieplan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Directe Acties</p>
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
            <p className="text-sm font-medium text-muted-foreground mb-2">Korte Termijn (1-3 maanden)</p>
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
            <p className="text-sm font-medium text-muted-foreground mb-2">Continu Proces</p>
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
            Voorbeeld Campagne
          </CardTitle>
          <CardDescription>
            Zo zou een campagne er nu uitzien met je huidige decision quality
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
              Wil je campagnes genereren met hogere confidence scores?
            </p>
            <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
              Met Strategic Control krijg je toegang tot de volledige decision engine, research tools, en onbeperkte campagne generatie.
            </p>
            <Button
              variant="default"
              size="sm"
              className="w-full gap-2"
              onClick={onUpgrade}
            >
              Upgrade naar Strategic Control
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onComplete} className="flex-1">
          Bekijk in Dashboard
        </Button>
        <Button onClick={onUpgrade} className="flex-1 gap-2">
          Upgrade voor Volledige Controle
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
