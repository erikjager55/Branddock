/**
 * COMPONENT: Shareable Campaign Report
 * 
 * Printbare en deelbare rapportversie van een campagne.
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
import { nl } from 'date-fns/locale';

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
              Geen metadata beschikbaar voor dit rapport
            </p>
            <Button className="mt-4" onClick={onBack}>
              Terug
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metadata = campaign.generationMetadata;
  const generatedDate = new Date(metadata.generatedAt);
  const timeAgo = formatDistanceToNow(generatedDate, { addSuffix: true, locale: nl });

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
              Terug
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => alert('Share link: https://platform.example.com/reports/campaign/' + campaign.id)}
              >
                <Share2 className="h-4 w-4" />
                Deel Link
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
                onClick={() => alert('Download als PDF...')}
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
            <span>Gegenereerd: {generatedDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span>•</span>
            <span>Rapport: {new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
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
                <p className="text-sm font-medium text-muted-foreground mb-1">Generatiedatum</p>
                <p className="font-medium">
                  {generatedDate.toLocaleDateString('nl-NL', { 
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
                  <span>Gemiddelde validatie van gebruikte assets</span>
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
                    Status op moment van genereren
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed">
                {metadata.decisionStatus === 'safe-to-decide' && 
                  'Deze campagne is gegenereerd met voldoende gevalideerde strategische input. Alle gebruikte brand assets en personas hebben adequate onderzoeksvalidatie.'}
                {metadata.decisionStatus === 'decision-at-risk' && 
                  'Deze campagne bevat elementen met beperkte validatie. De strategische keuzes zijn gebaseerd op gedeeltelijk gevalideerde input. Aanbevolen wordt extra validatie voordat uitvoering.'}
                {metadata.decisionStatus === 'do-not-decide' && 
                  'Deze campagne is gegenereerd met onvoldoende gevalideerde input. Sterke aanbeveling: valideer eerst de onderliggende strategie voordat uitvoering.'}
              </p>
            </div>

            {/* Risks */}
            {metadata.decisionRisks && metadata.decisionRisks.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Geïdentificeerde Risico's</p>
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
                    Campagne is Stabiel
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Er zijn geen significante wijzigingen gedetecteerd in de onderliggende strategische assets sinds het genereren van deze campagne. De campagne strategie blijft valide en actueel.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Laatste Verificatie</p>
              <p className="text-sm">
                {new Date().toLocaleDateString('nl-NL', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Aanbeveling:</strong> Monitor de onderliggende brand assets en personas voor wijzigingen. 
                Herbereken de campagne als er significante updates zijn in de strategische input.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Recommendations */}
        <Card className="border-2 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-700 dark:text-amber-400" />
              Aanbevelingen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metadata.decisionStatus === 'safe-to-decide' ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-background border">
                  <p className="font-medium text-sm mb-1">✓ Campagne Executie</p>
                  <p className="text-sm text-muted-foreground">
                    Deze campagne is klaar voor uitvoering. Alle strategische elementen zijn voldoende gevalideerd.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <p className="font-medium text-sm mb-1">Monitor & Optimize</p>
                  <p className="text-sm text-muted-foreground">
                    Track campagne performance en vergelijk met de onderzoeksvoorspellingen. Gebruik learnings voor toekomstige optimalisaties.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <p className="font-medium text-sm mb-1">Periodieke Review</p>
                  <p className="text-sm text-muted-foreground">
                    Plan kwartaal reviews van de onderliggende strategie om validiteit te waarborgen.
                  </p>
                </div>
              </div>
            ) : metadata.decisionStatus === 'decision-at-risk' ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <p className="font-medium text-sm mb-1 text-amber-900 dark:text-amber-100">
                    ⚠ Verhoogd Risico - Extra Validatie Aanbevolen
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Voer aanvullend onderzoek uit voor de zwakke elementen voordat je significant budget investeert in deze campagne.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <p className="font-medium text-sm mb-1">Start met Kleine Test</p>
                  <p className="text-sm text-muted-foreground">
                    Begin met een beperkte pilot of A/B test om de aannames te valideren voordat volledige uitrol.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <p className="font-medium text-sm mb-1 text-red-900 dark:text-red-100">
                    🚫 Niet Uitvoeren - Validatie Vereist
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Deze campagne heeft onvoldoende strategische validatie. Sterke aanbeveling om eerst onderzoek uit te voeren voordat budget allocatie.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <p className="font-medium text-sm mb-1">Start Validatie Onderzoek</p>
                  <p className="text-sm text-muted-foreground">
                    Begin met de aanbevolen onderzoeksmethoden voor de kritieke brand assets en personas.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Footer */}
        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>Dit rapport is automatisch gegenereerd op {new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="mt-1">Gebaseerd op campagne generatie metadata en real-time platformdata</p>
        </div>
      </div>
    </div>
  );
}