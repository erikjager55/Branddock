/**
 * COMPONENT: Shareable Brand Report
 * 
 * Printbare en deelbare rapportversie van een brand asset.
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
  Package,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Users,
  FileText,
  TrendingUp,
  Lightbulb
} from 'lucide-react';
import { BrandAsset } from '../../data/mock-brand-assets';
import { calculateDecisionStatus, getMethodLabel } from '../../utils/decision-status-calculator';

interface ShareableBrandReportProps {
  asset: BrandAsset;
  onBack: () => void;
}

export function ShareableBrandReport({ asset, onBack }: ShareableBrandReportProps) {
  const decisionStatus = calculateDecisionStatus(
    asset.researchMethods || [],
    asset.researchCoverage || 0
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe-to-decide':
        return 'text-green-700 dark:text-green-400';
      case 'decision-at-risk':
        return 'text-amber-700 dark:text-amber-400';
      case 'blocked':
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
      case 'blocked':
        return AlertCircle;
      default:
        return AlertCircle;
    }
  };

  const StatusIcon = getStatusIcon(decisionStatus.status);

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
                onClick={() => alert('Share link: https://platform.example.com/reports/brand/' + asset.id)}
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
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-100 dark:bg-blue-900/50 mb-4">
            <Package className="h-8 w-8 text-blue-700 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Brand Asset Report</h1>
          <p className="text-xl text-muted-foreground">{asset.title}</p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>Versie {asset.version}</span>
            <span>•</span>
            <span>Gegenereerd: {new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* 1. Strategy Snapshot */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Strategy Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Categorie</p>
                <p className="font-medium">{asset.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Laatste Update</p>
                <p className="font-medium">
                  {new Date(asset.lastUpdated).toLocaleDateString('nl-NL')}
                </p>
              </div>
            </div>

            {/* Description */}
            {asset.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Beschrijving</p>
                <p className="text-sm leading-relaxed">{asset.description}</p>
              </div>
            )}

            {/* Research Methods */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Onderzoeksmethoden</p>
              <div className="flex flex-wrap gap-2">
                {asset.researchMethods && asset.researchMethods.length > 0 ? (
                  asset.researchMethods.map((method) => (
                    <Badge key={method} variant="outline">
                      {getMethodLabel(method)}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Geen onderzoeksmethoden gedefinieerd</p>
                )}
              </div>
            </div>

            {/* Research Coverage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Research Coverage</p>
                <span className="text-sm font-semibold">{asset.researchCoverage}%</span>
              </div>
              <Progress value={asset.researchCoverage} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* 2. Decision Quality */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Decision Quality
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Decision Status */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3 mb-2">
                <StatusIcon className={`h-6 w-6 ${getStatusColor(decisionStatus.status)}`} />
                <div className="flex-1">
                  <p className="font-semibold">{decisionStatus.label}</p>
                  <p className="text-sm text-muted-foreground">{decisionStatus.description}</p>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            {decisionStatus.keyInsights && decisionStatus.keyInsights.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Key Insights</p>
                <div className="space-y-2">
                  {decisionStatus.keyInsights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risks */}
            {decisionStatus.risks && decisionStatus.risks.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Risico's</p>
                <div className="space-y-2">
                  {decisionStatus.risks.map((risk, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Change Awareness */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Change Awareness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                    Asset is Actueel
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Er zijn geen significante wijzigingen gedetecteerd sinds de laatste validatie.
                    De strategische beslissingen gebaseerd op dit asset blijven valide.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Laatste Validatie</p>
              <p className="text-sm">
                {new Date(asset.lastUpdated).toLocaleDateString('nl-NL', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Recommendations */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Aanbevelingen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {decisionStatus.status === 'safe-to-decide' ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-background border">
                  <p className="font-medium text-sm mb-1">Onderhoud Kwaliteit</p>
                  <p className="text-sm text-muted-foreground">
                    Plan periodieke reviews (elk kwartaal) om de validiteit van de onderzoeksdata te waarborgen.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <p className="font-medium text-sm mb-1">Uitbreiding Mogelijk</p>
                  <p className="text-sm text-muted-foreground">
                    Overweeg aanvullend onderzoek in nieuwe marktsegmenten of channels voor bredere toepasbaarheid.
                  </p>
                </div>
              </div>
            ) : decisionStatus.status === 'decision-at-risk' ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <p className="font-medium text-sm mb-1 text-amber-900 dark:text-amber-100">
                    Voer Aanvullend Onderzoek Uit
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Versterk de validatie door minimaal één extra onderzoeksmethode toe te voegen uit de top 2 aanbevolen methoden.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <p className="font-medium text-sm mb-1 text-red-900 dark:text-red-100">
                    Start Validatie Onderzoek
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Dit asset heeft onvoldoende onderzoeksvalidatie. Begin met de aanbevolen onderzoeksmethoden voordat je strategische beslissingen neemt.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Footer */}
        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>Dit rapport is automatisch gegenereerd op {new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="mt-1">Gebaseerd op real-time platformdata en onderzoeksvalidatie</p>
        </div>
      </div>
    </div>
  );
}