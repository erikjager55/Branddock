/**
 * COMPONENT: Decision Summary Panel
 * 
 * Panel voor OUTPUT scherm dat decision status, oorzaken,
 * risico's en verbeteracties samenvat.
 * 
 * Verschil met CampaignDecisionHeader: 
 * - Header = proactief (voor generate)
 * - Summary = retrospectief (na generate)
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ArrowRight,
  TrendingDown,
  AlertCircle
} from 'lucide-react';

interface DecisionSummaryPanelProps {
  /** Huidige decision status */
  status: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
  /** Belangrijkste oorzaken (max 3) */
  rootCauses: string[];
  /** Concrete risico's van deze status */
  risks: string[];
  /** Concrete verbeteracties */
  improvements: string[];
  /** Callback voor improvement acties */
  onImproveClick?: () => void;
  /** Optional: metadata voor context */
  metadata?: {
    generatedAt: Date;
    avgCoverage: number;
    totalAssets: number;
    safeAssets: number;
  };
}

export function DecisionSummaryPanel({
  status,
  rootCauses,
  risks,
  improvements,
  onImproveClick,
  metadata
}: DecisionSummaryPanelProps) {
  
  // Status configuratie
  const statusConfig = {
    'safe-to-decide': {
      icon: CheckCircle,
      label: 'Safe to Decide',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-500',
      textColor: 'text-green-900 dark:text-green-100',
      badgeBg: 'bg-green-600',
      iconColor: 'text-green-600',
      message: 'Deze campagne is gebaseerd op voldoende gevalideerde merkdata. Strategische beslissingen kunnen met vertrouwen genomen worden.'
    },
    'decision-at-risk': {
      icon: AlertTriangle,
      label: 'Decision at Risk',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      borderColor: 'border-amber-500',
      textColor: 'text-amber-900 dark:text-amber-100',
      badgeBg: 'bg-amber-600',
      iconColor: 'text-amber-600',
      message: 'Deze campagne bevat elementen met beperkte validatie. Beslissingen dragen verhoogd risico. Overweeg pilot testing.'
    },
    'do-not-decide': {
      icon: XCircle,
      label: 'Do Not Decide',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-500',
      textColor: 'text-red-900 dark:text-red-100',
      badgeBg: 'bg-red-600',
      iconColor: 'text-red-600',
      message: 'Deze campagne is gebaseerd op onvoldoende gevalideerde data. Strategische beslissingen zijn speculatief. Research eerst voltooien wordt sterk aangeraden.'
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className={`border-l-4 ${config.borderColor}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-6 w-6 ${config.iconColor}`} />
            <div>
              <CardTitle className="text-lg">Campaign Decision Summary</CardTitle>
              <Badge className={`${config.badgeBg} text-white mt-1`}>
                {config.label}
              </Badge>
            </div>
          </div>
          {metadata && (
            <div className="text-right text-xs text-muted-foreground">
              <p>Gegenereerd op {metadata.generatedAt.toLocaleDateString('nl-NL')}</p>
              <p className="mt-1">
                {metadata.safeAssets} van {metadata.totalAssets} assets veilig
                ({metadata.avgCoverage}% gem. coverage)
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status uitleg */}
        <Alert className={config.bgColor}>
          <AlertDescription className={config.textColor}>
            {config.message}
          </AlertDescription>
        </Alert>

        {/* Belangrijkste oorzaken */}
        {rootCauses.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Belangrijkste oorzaken
            </h4>
            <ul className="space-y-1.5 text-sm">
              {rootCauses.map((cause, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{cause}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concrete risico's */}
        {risks.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              Risico's bij huidige status
            </h4>
            <ul className="space-y-1.5 text-sm">
              {risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">⚠</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Verbeteracties */}
        {improvements.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-blue-600" />
              Verbeteracties
            </h4>
            <ul className="space-y-1.5 text-sm mb-3">
              {improvements.map((improvement, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5 font-semibold">{i + 1}.</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
            {onImproveClick && (
              <Button onClick={onImproveClick} variant="outline" className="w-full">
                Start met verbeteren
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}

        {/* Disclaimer bij niet-safe status */}
        {status !== 'safe-to-decide' && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Let op:</strong> Deze campagne kan worden uitgevoerd, maar de kwaliteit 
              van strategische beslissingen is beperkt door onvolledige research validatie. 
              Behandel outputs als hypotheses die getest moeten worden, niet als gevalideerde strategieën.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * MOTIVATIE:
 * 
 * 1. RETROSPECTIEF BEWUSTZIJN
 *    - Na generate: gebruiker moet weten op welke basis campagne gemaakt is
 *    - "Gegenereerd op" + coverage stats geven context
 *    - Niet alleen "leuk idee", maar "hoe betrouwbaar?"
 * 
 * 2. ROOT CAUSE ANALYSE
 *    - "Belangrijkste oorzaken" helpt bij begrip
 *    - Niet alleen "dit is fout", maar "waarom is dit fout"
 *    - Educatief, niet alleen correctief
 * 
 * 3. RISK AWARENESS
 *    - "Risico's" maakt impact concreet
 *    - Business taal: "inconsistente positionering", "verspilling budget"
 *    - Niet tech taal: "low coverage", "missing methods"
 * 
 * 4. ACTIONABLE IMPROVEMENTS
 *    - Genummerde lijst (1, 2, 3) geeft prioriteit
 *    - "Start met verbeteren" CTA maakt next step evident
 *    - Gebruiker kan kiezen: accepteer risico of verbeter
 * 
 * 5. DISCLAIMER
 *    - "Behandel outputs als hypotheses" = realistisch
 *    - Niet blokkerend, maar wel eerlijk over kwaliteit
 *    - Gebruiker kan informed decision maken
 * 
 * 6. VERSCHIL MET HEADER
 *    - Header (configure) = "mag je dit doen?"
 *    - Summary (output) = "wat heb je gedaan en wat betekent dat?"
 *    - Header = preventief, Summary = retrospectief
 */
