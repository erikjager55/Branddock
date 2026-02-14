/**
 * COMPONENT: Campaign Decision Header (VERFIJND)
 * 
 * Strategisch control panel dat decision status toont.
 * NIET een foutmelding. WEL een rustig, duidelijk overzicht met directe actie.
 * 
 * WIJZIGINGEN v2:
 * - Compacter (minder "error" gevoel)
 * - Primaire actie links, visueel dominant
 * - Secundaire "doorgaan met risico" rechts
 * - Toon minstens 2 oorzaken indien aanwezig
 * - Rustiger kleurgebruik
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AlertTriangle, CheckCircle, ShieldAlert, ArrowRight, AlertCircle } from 'lucide-react';

interface CampaignDecisionHeaderProps {
  /** Overall decision status voor de campagne */
  status: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
  /** Primaire actie die gebruiker moet nemen */
  primaryAction: string;
  /** Callback voor primaire actie button */
  onPrimaryAction?: () => void;
  /** Callback voor "doorgaan met risico" */
  onProceedAnyway?: () => void;
  /** Details over affected assets - GEEN status field meer (consistentie) */
  details?: {
    affectedAssets: Array<{ name: string; coverage: number }>;
    missingResearch: string[];
  };
}

export function CampaignDecisionHeader({
  status,
  primaryAction,
  onPrimaryAction,
  onProceedAnyway,
  details
}: CampaignDecisionHeaderProps) {
  
  // Status configuratie - rustiger, minder "error" gevoel
  const statusConfig = {
    'safe-to-decide': {
      icon: CheckCircle,
      label: 'Safe to Decide',
      bgColor: 'bg-green-50/70 dark:bg-green-950/10',
      borderColor: 'border-l-green-600',
      iconColor: 'text-green-600',
      badgeColor: 'bg-green-600/90'
    },
    'decision-at-risk': {
      icon: AlertTriangle,
      label: 'Decision at Risk',
      bgColor: 'bg-amber-50/70 dark:bg-amber-950/10',
      borderColor: 'border-l-amber-600',
      iconColor: 'text-amber-600',
      badgeColor: 'bg-amber-600/90'
    },
    'do-not-decide': {
      icon: ShieldAlert,
      label: 'Do Not Decide',
      bgColor: 'bg-slate-50 dark:bg-slate-950/20', // Rustiger dan rood
      borderColor: 'border-l-red-600',
      iconColor: 'text-red-600',
      badgeColor: 'bg-red-600/90'
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Verzamel oorzaken (minimaal 2 indien aanwezig)
  const rootCauses = details?.affectedAssets || [];
  const displayCauses = rootCauses.slice(0, 3); // Max 3 voor compactheid

  // Alleen tonen indien niet safe
  if (status === 'safe-to-decide') {
    return (
      <Card className={`border-l-4 ${config.borderColor} ${config.bgColor}`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-5 w-5 ${config.iconColor}`} />
            <Badge className={`${config.badgeColor} text-white text-xs`}>
              {config.label}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Alle gekoppelde merkdata is voldoende gevalideerd. Je kunt veilig campagne genereren.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-l-4 ${config.borderColor} ${config.bgColor}`}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-4">
          {/* Left: Status + Oorzaken */}
          <div className="flex-1 min-w-0">
            {/* Status header - compact */}
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={`h-5 w-5 ${config.iconColor} flex-shrink-0`} />
              <Badge className={`${config.badgeColor} text-white text-xs`}>
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Strategische risico's gedetecteerd
              </span>
            </div>

            {/* Oorzaken - altijd minstens 2 tonen indien aanwezig */}
            {displayCauses.length > 0 && (
              <div className="space-y-1.5 ml-7">
                {displayCauses.map((asset, i) => (
                  <div 
                    key={i} 
                    className="flex items-baseline gap-2 text-sm"
                  >
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{asset.name}:</span>{' '}
                      <span className="text-muted-foreground">
                        {asset.coverage}% research coverage
                      </span>
                    </div>
                  </div>
                ))}
                {rootCauses.length > 3 && (
                  <p className="text-xs text-muted-foreground ml-5">
                    + {rootCauses.length - 3} meer {rootCauses.length - 3 === 1 ? 'item' : 'items'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Acties - PRIMAIR + SECUNDAIR */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {/* PRIMAIRE ACTIE - Visueel Dominant */}
            <Button 
              onClick={onPrimaryAction}
              size="default"
              className="font-semibold shadow-md"
            >
              Los dit nu op
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            {/* SECUNDAIRE ACTIE - Tekstlink */}
            {onProceedAnyway && (
              <button
                onClick={onProceedAnyway}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors text-center"
              >
                Doorgaan met risico
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * MOTIVATIE WIJZIGINGEN v2:
 * 
 * 1. COMPACTER & RUSTIGER
 *    - py-3 ipv py-4 (minder hoogte)
 *    - bg-slate-50 bij do-not-decide (niet fel rood)
 *    - Rustiger gradaties (/70, /90)
 *    - Geen grote iconografie meer
 * 
 * 2. STRATEGISCH CONTROL PANEL GEVOEL
 *    - "Strategische risico's gedetecteerd" (niet "ERROR")
 *    - Oorzaken met bullet points (gestructureerd)
 *    - Compacte typografie (text-sm)
 *    - Minder ruimte, meer inhoud
 * 
 * 3. PRIMAIRE ACTIE DOMINANT
 *    - "Los dit nu op" button links (eerste wat je ziet)
 *    - size="default" + shadow-md (visueel zwaarder)
 *    - Secundaire actie is kleine tekstlink (veel lichter)
 *    - Actie hiërarchie is kristalhelder
 * 
 * 4. OORZAKEN ALTIJD TONEN (min 2)
 *    - "Sarah: 48% research coverage"
 *    - "Core Values: 50% research coverage"
 *    - Concrete, specifieke informatie
 *    - Geen abstracte "some items have issues"
 *    - CONSISTENTIE: alleen percentage, geen formulier status
 * 
 * 5. GEDRAGSSTURING
 *    - Primaire actie = probleem oplossen (encouraged)
 *    - Secundaire actie = doorgaan (discouraged maar mogelijk)
 *    - Visual hierarchy stuurt naar gewenst gedrag
 * 
 * 6. SAFE STATE
 *    - Compact (py-3)
 *    - Geen prominentie (green is good, geen aandacht nodig)
 *    - Korte bevestiging, dan door
 */