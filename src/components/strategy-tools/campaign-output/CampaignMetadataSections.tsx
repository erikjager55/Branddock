/**
 * COMPONENT: Campaign Metadata Sections
 * 
 * Toont drie vaste secties bovenaan elke gegenereerde campagne:
 * 1. Strategy Snapshot - gebruikte inputs en metadata
 * 2. Decision Quality - status op moment van genereren
 * 3. Change Awareness - wijzigingen sinds genereren
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import {
  Package,
  Users,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Calendar,
  CheckCircle,
  TrendingUp,
  FileText,
  Sparkles
} from 'lucide-react';
import { DecisionStatusBadge } from '../../decision-status/DecisionStatusBadge';
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

interface ChangeImpact {
  hasAssetChanges: boolean;
  hasNewResearch: boolean;
  recommendsRecalculation: boolean;
  changedAssets: Array<{ id: string; title: string; changeDescription: string }>;
  newResearchCount: number;
}

interface CampaignMetadataSectionsProps {
  metadata: CampaignMetadata;
  changeImpact?: ChangeImpact;
  onRecalculate: () => void;
}

export function CampaignMetadataSections({
  metadata,
  changeImpact,
  onRecalculate
}: CampaignMetadataSectionsProps) {
  const generatedDate = new Date(metadata.generatedAt);
  const timeAgo = formatDistanceToNow(generatedDate, { addSuffix: true, locale: nl });

  // Bereken of er significante wijzigingen zijn
  const hasSignificantChanges = changeImpact && (
    changeImpact.hasAssetChanges || 
    changeImpact.hasNewResearch ||
    changeImpact.recommendsRecalculation
  );

  const getDecisionStatusColor = (status: string) => {
    switch (status) {
      case 'safe-to-decide':
        return 'text-green-700 dark:text-green-400';
      case 'decision-at-risk':
        return 'text-amber-700 dark:text-amber-400';
      case 'do-not-decide':
        return 'text-red-700 dark:text-red-400';
      default:
        return 'text-gray-700 dark:text-gray-400';
    }
  };

  const getDecisionStatusLabel = (status: string) => {
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

  return (
    <div className="space-y-4 mb-6">
      {/* 1. STRATEGY SNAPSHOT */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-blue-700 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">Strategy Snapshot</CardTitle>
                <CardDescription className="text-xs">
                  Gegenereerd {timeAgo}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs gap-1">
              <Calendar className="h-3 w-3" />
              {generatedDate.toLocaleDateString('nl-NL', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Brand Assets */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Brand Assets</p>
              <Badge variant="secondary" className="text-xs">
                {metadata.usedBrandAssets.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {metadata.usedBrandAssets.map((asset) => (
                <Badge key={asset.id} variant="outline" className="text-xs">
                  {asset.title}
                  {asset.version && (
                    <span className="ml-1 text-muted-foreground">v{asset.version}</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Personas */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Target Personas</p>
              <Badge variant="secondary" className="text-xs">
                {metadata.usedPersonas.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {metadata.usedPersonas.map((persona) => (
                <Badge key={persona.id} variant="outline" className="text-xs">
                  {persona.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Research Coverage */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Research Coverage</p>
              <Badge 
                variant={metadata.researchCoverageSnapshot >= 80 ? 'default' : 'secondary'} 
                className="text-xs"
              >
                {metadata.researchCoverageSnapshot}%
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    metadata.researchCoverageSnapshot >= 80 
                      ? 'bg-green-500' 
                      : metadata.researchCoverageSnapshot >= 50 
                      ? 'bg-amber-500' 
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${metadata.researchCoverageSnapshot}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. DECISION QUALITY */}
      <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-purple-700 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-base">Decision Quality</CardTitle>
              <CardDescription className="text-xs">
                Status op moment van genereren
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Decision Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/60 border">
            <div className="flex items-center gap-3">
              {metadata.decisionStatus === 'safe-to-decide' && (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              )}
              {metadata.decisionStatus === 'decision-at-risk' && (
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
              {metadata.decisionStatus === 'do-not-decide' && (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {getDecisionStatusLabel(metadata.decisionStatus)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {metadata.decisionStatus === 'safe-to-decide' && 'Voldoende onderzoek voor besluitvorming'}
                  {metadata.decisionStatus === 'decision-at-risk' && 'Beperkt onderzoek - voorzichtigheid geboden'}
                  {metadata.decisionStatus === 'do-not-decide' && 'Onvoldoende onderzoek voor besluitvorming'}
                </p>
              </div>
            </div>
            <DecisionStatusBadge 
              status={metadata.decisionStatus}
              showIcon={false}
            />
          </div>

          {/* Risks */}
          {metadata.decisionRisks && metadata.decisionRisks.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Belangrijkste Risico's
              </p>
              <div className="space-y-1.5">
                {metadata.decisionRisks.map((risk, index) => (
                  <div 
                    key={index} 
                    className="flex items-start gap-2 text-xs text-muted-foreground p-2 rounded bg-background/60"
                  >
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. CHANGE AWARENESS */}
      {changeImpact && (
        <Card className={`${
          hasSignificantChanges 
            ? 'border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20' 
            : 'border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/20'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  hasSignificantChanges 
                    ? 'bg-amber-100 dark:bg-amber-900/50' 
                    : 'bg-gray-100 dark:bg-gray-900/50'
                }`}>
                  <TrendingUp className={`h-4 w-4 ${
                    hasSignificantChanges 
                      ? 'text-amber-700 dark:text-amber-400' 
                      : 'text-gray-700 dark:text-gray-400'
                  }`} />
                </div>
                <div>
                  <CardTitle className="text-base">Change Awareness</CardTitle>
                  <CardDescription className="text-xs">
                    {hasSignificantChanges 
                      ? 'Wijzigingen gedetecteerd sinds genereren' 
                      : 'Geen wijzigingen sinds genereren'
                    }
                  </CardDescription>
                </div>
              </div>
              {hasSignificantChanges && (
                <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                  Updates beschikbaar
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!hasSignificantChanges ? (
              <Alert className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-sm text-green-900 dark:text-green-100">
                  Deze campagne is actueel. Er zijn geen wijzigingen in de onderliggende strategie sinds het genereren.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Asset Changes */}
                {changeImpact.hasAssetChanges && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      Gewijzigde Brand Assets
                      <Badge variant="secondary" className="text-xs">
                        {changeImpact.changedAssets.length}
                      </Badge>
                    </p>
                    <div className="space-y-1.5">
                      {changeImpact.changedAssets.map((asset) => (
                        <div 
                          key={asset.id} 
                          className="flex items-start gap-2 text-xs p-2 rounded bg-background/60 border"
                        >
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                          <div>
                            <p className="font-medium">{asset.title}</p>
                            <p className="text-muted-foreground">{asset.changeDescription}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Research */}
                {changeImpact.hasNewResearch && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Nieuw Onderzoek Toegevoegd
                      <Badge variant="secondary" className="text-xs">
                        +{changeImpact.newResearchCount}
                      </Badge>
                    </p>
                    <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                        Er is nieuw onderzoek beschikbaar dat de strategische keuzes kan beïnvloeden.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Recommendation */}
                {changeImpact.recommendsRecalculation && (
                  <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-sm text-amber-900 dark:text-amber-100">
                      <strong>Aanbeveling:</strong> Herbereken de campagne met de huidige strategische input voor de meest actuele inzichten.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Recalculate Action */}
                <Button 
                  onClick={onRecalculate}
                  className="w-full gap-2"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4" />
                  Herbereken Campagne met Huidige Strategie
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Dit creëert een nieuwe versie zonder de originele campagne aan te passen
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
