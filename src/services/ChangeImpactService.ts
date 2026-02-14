/**
 * Change Impact Service
 * 
 * Analyseert de impact van asset wijzigingen op beslissingen, campagnes, en persona's.
 * Zorgt ervoor dat NIETS automatisch wordt aangepast zonder expliciete gebruikerstoestemming.
 */

import { 
  AssetChange, 
  ImpactAnalysis, 
  DecisionImpact, 
  CampaignImpact,
  ChangeNotification,
  ImpactLevel,
  ChangeType
} from '../types/change-impact';
import { BrandAsset } from '../types/brand-asset';
import { logger } from '../utils/logger';
import { calculateDecisionStatus } from '../utils/decision-status-calculator';

export class ChangeImpactService {
  /**
   * Analyseert een asset wijziging en bepaalt de impact op beslissingen
   */
  static analyzeAssetChange(
    change: AssetChange,
    asset: BrandAsset,
    previousAsset?: BrandAsset
  ): ImpactAnalysis {
    logger.info(`Analyzing impact for change ${change.id} on asset ${asset.id}`);

    // Bereken decision impact
    const decisionImpact = this.calculateDecisionImpact(
      change,
      asset,
      previousAsset
    );

    // Bepaal welke persona's mogelijk beïnvloed worden (maar NIET aanpassen!)
    const affectedPersonas = this.identifyAffectedPersonas(asset);

    // Genereer menselijke samenvattingen
    const personaNote = affectedPersonas.length > 0
      ? `Deze wijziging kan relevant zijn voor ${affectedPersonas.length} persona('s). Check handmatig of updates nodig zijn.`
      : 'Deze wijziging heeft waarschijnlijk geen directe impact op bestaande persona\'s.';

    const researchPriorityNote = change.researchAdded
      ? 'Nieuw onderzoek toegevoegd. Overweeg of research prioriteiten aangepast moeten worden.'
      : 'Geen nieuwe onderzoeksinput. Research prioriteiten blijven ongewijzigd.';

    const impactAnalysis: ImpactAnalysis = {
      change,
      decisionImpact,
      campaignImpacts: [], // Wordt gevuld door checkCampaignImpacts
      affectedPersonas,
      personaNote,
      researchPriorityNote,
      analyzedAt: new Date().toISOString(),
    };

    logger.debug('Impact analysis completed', impactAnalysis);
    return impactAnalysis;
  }

  /**
   * Berekent of en hoe de decision status verandert
   */
  private static calculateDecisionImpact(
    change: AssetChange,
    asset: BrandAsset,
    previousAsset?: BrandAsset
  ): DecisionImpact {
    // Decision status verandert ALLEEN bij nieuw onderzoek of validatie
    const shouldRecalculate = 
      change.changeType === 'research-added' || 
      change.changeType === 'validation';

    if (!shouldRecalculate) {
      return {
        decisionStatusChanged: false,
        affectedDecisions: [],
        impactLevel: 'none',
        summary: 'Content update zonder nieuw onderzoek. Decision status blijft ongewijzigd.',
      };
    }

    // Bereken oude en nieuwe decision status
    const previousStatus = previousAsset 
      ? this.getSimplifiedStatus(previousAsset)
      : undefined;
    
    const newStatus = this.getSimplifiedStatus(asset);

    const statusChanged = previousStatus !== newStatus;

    // Bepaal impact level
    let impactLevel: ImpactLevel = 'none';
    if (statusChanged) {
      if (newStatus === 'safe' && previousStatus !== 'safe') {
        impactLevel = 'high'; // Beslissing is nu veilig!
      } else if (newStatus === 'blocked' && previousStatus !== 'blocked') {
        impactLevel = 'high'; // Beslissing is nu geblokkeerd
      } else {
        impactLevel = 'medium';
      }
    } else if (change.changeType === 'research-added') {
      impactLevel = 'low'; // Onderzoek toegevoegd maar status niet veranderd
    }

    // Genereer menselijke samenvatting
    const summary = this.generateDecisionSummary(
      change,
      statusChanged,
      previousStatus,
      newStatus,
      asset
    );

    return {
      decisionStatusChanged: statusChanged,
      previousStatus,
      newStatus,
      affectedDecisions: [asset.id],
      impactLevel,
      summary,
    };
  }

  /**
   * Controleert impact op lopende campagnes
   */
  static checkCampaignImpacts(
    impactAnalysis: ImpactAnalysis,
    activeCampaigns: any[] // Type from campaign strategy
  ): CampaignImpact[] {
    const assetId = impactAnalysis.change.assetId;
    
    return activeCampaigns
      .filter(campaign => {
        // Check of deze campagne het gewijzigde asset gebruikt
        return campaign.selectedAssets?.includes(assetId);
      })
      .map(campaign => {
        const hasNewerInput = impactAnalysis.decisionImpact.decisionStatusChanged ||
                             impactAnalysis.change.researchAdded === true;

        const summary = hasNewerInput
          ? `Nieuwere strategische input beschikbaar voor "${impactAnalysis.change.assetTitle}". Overweeg herberekening.`
          : `Asset "${impactAnalysis.change.assetTitle}" geüpdatet, maar geen impact op strategie.`;

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          hasNewerInput,
          affectedAssets: [assetId],
          recalculationSuggested: hasNewerInput,
          summary,
        };
      });
  }

  /**
   * Identificeert welke persona's mogelijk beïnvloed worden
   * LET OP: Dit past de persona's NIET aan!
   */
  private static identifyAffectedPersonas(asset: BrandAsset): string[] {
    // Simpele logica: als het asset validated is en essentieel,
    // kan het relevant zijn voor persona development
    if (asset.status === 'validated' && asset.priority === 'essential') {
      return ['all-personas']; // Placeholder - in echte implementatie zou dit specifieker zijn
    }
    return [];
  }

  /**
   * Vereenvoudigde decision status voor vergelijking
   */
  private static getSimplifiedStatus(asset: BrandAsset): 'safe' | 'at-risk' | 'blocked' {
    const coverage = asset.researchCoverage || 0;
    
    if (coverage >= 80) return 'safe';
    if (coverage >= 50) return 'at-risk';
    return 'blocked';
  }

  /**
   * Genereert menselijke samenvatting van decision impact
   */
  private static generateDecisionSummary(
    change: AssetChange,
    statusChanged: boolean,
    previousStatus: 'safe' | 'at-risk' | 'blocked' | undefined,
    newStatus: 'safe' | 'at-risk' | 'blocked',
    asset: BrandAsset
  ): string {
    if (!statusChanged) {
      if (change.changeType === 'research-added') {
        return `Onderzoek toegevoegd aan "${asset.title}". Decision status blijft ${this.statusToText(newStatus)} (${asset.researchCoverage}% coverage).`;
      }
      return `Update aan "${asset.title}" zonder impact op decision status.`;
    }

    // Status is veranderd
    if (newStatus === 'safe') {
      return `✓ "${asset.title}" is nu safe to decide! (${asset.researchCoverage}% research coverage bereikt)`;
    }

    if (newStatus === 'blocked') {
      return `⚠ "${asset.title}" is nu blocked voor beslissingen (${asset.researchCoverage}% coverage, minimum 50% vereist).`;
    }

    // at-risk
    return `"${asset.title}" status gewijzigd naar ${this.statusToText(newStatus)} (${asset.researchCoverage}% coverage).`;
  }

  private static statusToText(status: 'safe' | 'at-risk' | 'blocked'): string {
    const map = {
      'safe': 'safe to decide',
      'at-risk': 'decision at risk',
      'blocked': 'blocked'
    };
    return map[status];
  }

  /**
   * Creëert een notificatie voor de gebruiker
   */
  static createNotification(
    impactAnalysis: ImpactAnalysis,
    showInDecisionStatus: boolean = true,
    showInCampaignGenerator: boolean = true
  ): ChangeNotification {
    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      impactAnalysis,
      seen: false,
      dismissed: false,
      showInDecisionStatus,
      showInCampaignGenerator,
    };
  }

  /**
   * Formatteert een korte samenvatting voor UI display
   */
  static formatShortSummary(impactAnalysis: ImpactAnalysis): string {
    const { decisionImpact, change } = impactAnalysis;
    
    if (decisionImpact.impactLevel === 'none') {
      return 'Content update – geen impact op beslissingen';
    }

    if (decisionImpact.impactLevel === 'high' && decisionImpact.newStatus === 'safe') {
      return `✓ ${change.assetTitle} is nu safe to decide`;
    }

    if (change.researchAdded) {
      return `Nieuw onderzoek toegevoegd aan ${change.assetTitle}`;
    }

    return decisionImpact.summary;
  }

  /**
   * Formatteert een uitgebreide samenvatting voor tooltips/modals
   */
  static formatDetailedSummary(impactAnalysis: ImpactAnalysis): {
    title: string;
    sections: { label: string; content: string; }[];
  } {
    const { change, decisionImpact, personaNote, researchPriorityNote } = impactAnalysis;

    const sections = [
      {
        label: 'Wat is er veranderd?',
        content: change.description,
      },
      {
        label: 'Impact op beslissingen',
        content: decisionImpact.summary,
      }
    ];

    // Alleen tonen als relevant
    if (decisionImpact.impactLevel !== 'none') {
      sections.push({
        label: 'Persona\'s',
        content: personaNote,
      });
    }

    if (change.researchAdded) {
      sections.push({
        label: 'Research prioriteiten',
        content: researchPriorityNote,
      });
    }

    return {
      title: `Wijziging: ${change.assetTitle}`,
      sections,
    };
  }
}
