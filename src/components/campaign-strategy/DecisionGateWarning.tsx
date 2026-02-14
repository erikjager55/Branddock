/**
 * COMPONENT: Decision Gate Warning
 * 
 * Blokkeert campaign generation wanneer personas/assets onveilig zijn.
 * Toont waarom + snelste fix.
 * 
 * DOEL: Voorkom campagnes gebouwd op onbetrouwbare data
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  ShieldX, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight,
  Zap,
  CheckCircle
} from 'lucide-react';

interface FailedItem {
  id: string;
  name: string;
  type: 'persona' | 'asset';
  coverage: number;
  status: 'blocked' | 'decision-at-risk';
  missingTopMethod?: string;
}

interface DecisionGateWarningProps {
  status: 'safe' | 'at-risk' | 'blocked';
  failedItems: FailedItem[];
  onFixItem?: (itemId: string, itemType: 'persona' | 'asset') => void;
}

export function DecisionGateWarning({
  status,
  failedItems,
  onFixItem
}: DecisionGateWarningProps) {
  
  if (status === 'safe') {
    // GREEN: Safe to proceed
    return (
      <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  Safe to Generate
                </h3>
                <Badge className="bg-green-600 text-white text-xs">
                  Verified Data
                </Badge>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Alle geselecteerde personas en assets zijn voldoende gevalideerd. Je campagne wordt gebouwd op betrouwbare data.
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'at-risk') {
    // AMBER: Can proceed but with warning
    const atRiskItems = failedItems.filter(item => item.status === 'decision-at-risk');
    
    return (
      <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                    Verhoogd Strategisch Risico
                  </h3>
                  <Badge className="bg-amber-600 text-white text-xs">
                    {atRiskItems.length} item{atRiskItems.length > 1 ? 's' : ''} at risk
                  </Badge>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Je kunt doorgaan, maar enkele elementen hebben beperkte validatie (50-79% coverage). Dit verhoogt de kans op sub-optimale strategische keuzes.
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600 shrink-0" />
            </div>

            {/* Failed Items */}
            <div className="space-y-2">
              {atRiskItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg bg-white dark:bg-amber-950/20 border border-amber-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{item.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {item.type === 'persona' ? 'Persona' : 'Asset'}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-amber-600">
                          {item.coverage}% coverage
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>Risico:</strong> Campagne-keuzes gebaseerd op dit {item.type === 'persona' ? 'persona' : 'asset'} kunnen 
                        leiden tot 40-60% lagere ROI dan optimaal mogelijk.
                      </p>
                      {item.missingTopMethod && (
                        <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                          <strong>Snelste fix:</strong> Voeg {item.missingTopMethod} toe (~1-2 uur)
                        </p>
                      )}
                    </div>
                    {onFixItem && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onFixItem(item.id, item.type)}
                        className="shrink-0"
                      >
                        Fix Nu
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Notice */}
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                ⚠️ Je kunt doorgaan met genereren, maar we raden aan om eerst de bovenstaande items te verbeteren voor optimale resultaten.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // BLOCKED: Cannot proceed
  const blockedItems = failedItems.filter(item => item.status === 'blocked');
  
  return (
    <Card className="border-2 border-red-300 bg-gradient-to-r from-red-50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <ShieldX className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Generatie Geblokkeerd
                </h3>
                <Badge className="bg-red-600 text-white text-xs">
                  {blockedItems.length} item{blockedItems.length > 1 ? 's' : ''} blocked
                </Badge>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                Je kunt niet doorgaan met genereren. Kritieke research ontbreekt op onderstaande elementen (&lt;50% coverage). Campagnes gebaseerd op deze data dragen onaanvaardbaar hoog risico.
              </p>
            </div>
            <ShieldX className="h-8 w-8 text-red-600 shrink-0" />
          </div>

          {/* Failed Items */}
          <div className="space-y-2">
            {blockedItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg bg-white dark:bg-red-950/20 border-2 border-red-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{item.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {item.type === 'persona' ? 'Persona' : 'Asset'}
                      </Badge>
                      <Badge className="bg-red-600 text-white text-xs">
                        {item.coverage}% coverage
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong>Waarom geblokkeerd:</strong> Dit {item.type === 'persona' ? 'persona' : 'asset'} heeft onvoldoende validatie. 
                      Strategische beslissingen gebaseerd hierop kunnen leiden tot fundamentele fouten en verspilde budgetten.
                    </p>
                    {item.missingTopMethod && (
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 mb-3">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                          <Zap className="h-4 w-4 inline mr-1" />
                          Snelste reparatie
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Start {item.missingTopMethod} research (~{item.missingTopMethod === 'Workshop' ? '2-4' : '1-2'} uur) om dit item te ontgrendelen
                        </p>
                      </div>
                    )}
                  </div>
                  {onFixItem && (
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white shrink-0 gap-1"
                      onClick={() => onFixItem(item.id, item.type)}
                    >
                      <Zap className="h-4 w-4" />
                      Fix Nu
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Critical Notice */}
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-950/40 border-2 border-red-300">
            <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
              🚫 Generate button is uitgeschakeld
            </p>
            <p className="text-xs text-red-800 dark:text-red-200">
              Repareer eerst alle geblokkeerde items om door te gaan. Dit beschermt je tegen campagnes gebouwd op onbetrouwbare data.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * DESIGN PRINCIPES:
 * 
 * 1. DECISION GATE
 *    - Safe: groen, kan doorgaan
 *    - At Risk: amber, waarschuwing maar kan doorgaan
 *    - Blocked: rood, GEBLOKKEERD
 * 
 * 2. BLOCKED STATE
 *    - Rood blok (border-2 border-red-300)
 *    - Welk element faalt (naam + type)
 *    - Waarom strategisch risico (business impact)
 *    - Snelste reparatie (concrete actie + tijd)
 *    - "Fix Nu" CTA prominent
 * 
 * 3. AT-RISK STATE
 *    - Amber blok (border-2 border-amber-300)
 *    - Waarschuwing
 *    - Kan doorgaan maar niet aanbevolen
 *    - Fix optie beschikbaar
 * 
 * 4. SAFE STATE
 *    - Groen blok (border-2 border-green-200)
 *    - Positieve bevestiging
 *    - "Verified Data" badge
 *    - Checkmark
 * 
 * 5. BUSINESS FRAMING
 *    - "40-60% lagere ROI" (niet "coverage laag")
 *    - "Fundamentele fouten" (niet "onvoldoende data")
 *    - "Verspilde budgetten" (niet "risico")
 *    - Concrete tijd (~1-2 uur)
 * 
 * 6. NON-DISMISSABLE
 *    - Geen close button
 *    - Altijd zichtbaar
 *    - Moet actief gefixed worden
 */
