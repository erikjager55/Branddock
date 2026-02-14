/**
 * COMPONENT: Section Decision Indicator (VERFIJND)
 * 
 * Mini indicator bij elke sectie titel (groen/oranje/rood) die toont
 * of deze sectie veilig is voor besluitvorming.
 * 
 * WIJZIGINGEN v2:
 * - Simpeler visueel (badge only, geen grote cards)
 * - Hover/click: tooltip met oorzaak + wat nodig is
 * - Consistent met header kleuren
 * - Erft status van gekoppelde items
 */

import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { CheckCircle, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';

interface SectionDecisionIndicatorProps {
  /** Status van deze sectie */
  status: 'safe' | 'risk' | 'blocked';
  /** Sectie naam voor labeling */
  sectionName: string;
  /** Welke oorzaak(en) deze sectie raken */
  causes?: string[];
  /** Wat nodig is om deze sectie veilig te maken */
  requiredActions?: string[];
  /** Optional callback voor action */
  onActionClick?: () => void;
}

export function SectionDecisionIndicator({
  status,
  sectionName,
  causes = [],
  requiredActions = [],
  onActionClick
}: SectionDecisionIndicatorProps) {

  // Status configuratie - consistent met header
  const statusConfig = {
    'safe': {
      icon: CheckCircle,
      label: 'Veilig',
      color: 'text-green-600',
      bg: 'bg-green-100/80 dark:bg-green-900/20',
      border: 'border-green-300',
      iconSize: 'h-3 w-3'
    },
    'risk': {
      icon: AlertTriangle,
      label: 'Risico',
      color: 'text-amber-600',
      bg: 'bg-amber-100/80 dark:bg-amber-900/20',
      border: 'border-amber-300',
      iconSize: 'h-3 w-3'
    },
    'blocked': {
      icon: ShieldAlert,
      label: 'Niet Veilig',
      color: 'text-red-600',
      bg: 'bg-red-100/80 dark:bg-red-900/20',
      border: 'border-red-300',
      iconSize: 'h-3 w-3'
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const hasDetails = causes.length > 0 || requiredActions.length > 0;

  // Als safe en geen details, toon compacte badge
  if (status === 'safe' && !hasDetails) {
    return (
      <Badge variant="outline" className={`${config.bg} ${config.color} ${config.border} text-xs`}>
        <StatusIcon className={`${config.iconSize} mr-1`} />
        {config.label}
      </Badge>
    );
  }

  // Bij risk/blocked of indien details: toon met popover
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`
            inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
            ${config.bg} ${config.color} border ${config.border}
            hover:opacity-80 transition-opacity cursor-help
          `}
        >
          <StatusIcon className={config.iconSize} />
          <span>{config.label}</span>
          {hasDetails && <Info className="h-3 w-3 opacity-60" />}
        </button>
      </PopoverTrigger>
      
      {hasDetails && (
        <PopoverContent className="w-80 p-3 text-sm" align="start">
          <div className="space-y-2">
            {/* Sectie naam */}
            <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
              {sectionName}
            </div>

            {/* Oorzaken */}
            {causes.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">
                  Oorzaak{causes.length > 1 ? 'en' : ''}:
                </p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {causes.map((cause, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1">•</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Vereiste acties */}
            {requiredActions.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium mb-1">
                  Nodig om veilig te maken:
                </p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {requiredActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-blue-600 font-semibold">{i + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

/**
 * MOTIVATIE WIJZIGINGEN v2:
 * 
 * 1. SIMPELER VISUEEL
 *    - Badge only (geen grote expandable cards)
 *    - Compacte afmetingen (text-xs, px-2 py-1)
 *    - Minder visuele ruis bij "safe" state
 * 
 * 2. POPOVER IN PLAATS VAN EXPAND
 *    - Hover/click toont tooltip
 *    - Geen layout shift
 *    - Betere UX op mobile (click)
 *    - Desktop: hover is genoeg
 * 
 * 3. CONSISTENT MET HEADER
 *    - Zelfde kleurenschema
 *    - Zelfde iconografie (ShieldAlert ipv XCircle)
 *    - Zelfde taal ("Niet Veilig" niet "Blocked")
 * 
 * 4. STRUCTUUR IN POPOVER
 *    - Sectie naam als header
 *    - Oorzaken eerst
 *    - Dan vereiste acties (genummerd)
 *    - Logische flow
 * 
 * 5. CURSOR-HELP
 *    - Cursor verandert naar help (?)
 *    - Signaleert: "klik voor info"
 *    - Betere discoverability
 * 
 * 6. INHERITANCE LOGICA
 *    - Component ontvangt status van parent
 *    - "Connect Brand Assets" sectie kan blocked zijn
 *      als gekoppelde asset blocked is
 *    - Status wordt doorgegeven, niet berekend in component
 */
