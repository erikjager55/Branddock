/**
 * Change Impact Service
 *
 * Analyzes the impact of asset changes on decisions, campaigns, and personas.
 * Ensures that NOTHING is automatically adjusted without explicit user consent.
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
import type { BrandAssetWithMeta } from '../types/brand-asset';
import { logger } from '../utils/logger';

export class ChangeImpactService {
  /**
   * Analyzes an asset change and determines the impact on decisions
   */
  static analyzeAssetChange(
    change: AssetChange,
    asset: BrandAssetWithMeta,
    previousAsset?: BrandAssetWithMeta
  ): ImpactAnalysis {
    logger.info(`Analyzing impact for change ${change.id} on asset ${asset.id}`);

    // Calculate decision impact
    const decisionImpact = this.calculateDecisionImpact(
      change,
      asset,
      previousAsset
    );

    // Determine which personas may be affected (but NOT modify them!)
    const affectedPersonas = this.identifyAffectedPersonas(asset);

    // Generate human-readable summaries
    const personaNote = affectedPersonas.length > 0
      ? `This change may be relevant to ${affectedPersonas.length} persona(s). Manually check if updates are needed.`
      : 'This change likely has no direct impact on existing personas.';

    const researchPriorityNote = change.researchAdded
      ? 'New research added. Consider whether research priorities need to be adjusted.'
      : 'No new research input. Research priorities remain unchanged.';

    const impactAnalysis: ImpactAnalysis = {
      change,
      decisionImpact,
      campaignImpacts: [], // Populated by checkCampaignImpacts
      affectedPersonas,
      personaNote,
      researchPriorityNote,
      analyzedAt: new Date().toISOString(),
    };

    logger.debug('Impact analysis completed', impactAnalysis);
    return impactAnalysis;
  }

  /**
   * Calculates whether and how the decision status changes
   */
  private static calculateDecisionImpact(
    change: AssetChange,
    asset: BrandAssetWithMeta,
    previousAsset?: BrandAssetWithMeta
  ): DecisionImpact {
    // Decision status changes ONLY with new research or validation
    const shouldRecalculate =
      change.changeType === 'research-added' ||
      change.changeType === 'validation';

    if (!shouldRecalculate) {
      return {
        decisionStatusChanged: false,
        affectedDecisions: [],
        impactLevel: 'none',
        summary: 'Content update without new research. Decision status remains unchanged.',
      };
    }

    // Calculate old and new decision status
    const previousStatus = previousAsset
      ? this.getSimplifiedStatus(previousAsset)
      : undefined;

    const newStatus = this.getSimplifiedStatus(asset);

    const statusChanged = previousStatus !== newStatus;

    // Determine impact level
    let impactLevel: ImpactLevel = 'none';
    if (statusChanged) {
      if (newStatus === 'safe' && previousStatus !== 'safe') {
        impactLevel = 'high'; // Decision is now safe!
      } else if (newStatus === 'blocked' && previousStatus !== 'blocked') {
        impactLevel = 'high'; // Decision is now blocked
      } else {
        impactLevel = 'medium';
      }
    } else if (change.changeType === 'research-added') {
      impactLevel = 'low'; // Research added but status not changed
    }

    // Generate human-readable summary
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
   * Checks impact on active campaigns
   */
  static checkCampaignImpacts(
    impactAnalysis: ImpactAnalysis,
    // Minimal contract — only fields actually read in this method.
    // Full Campaign type lives in campaign strategy module; intentionally not imported
    // to keep this service decoupled.
    activeCampaigns: Array<{ id: string; name: string; selectedAssets?: string[] }>
  ): CampaignImpact[] {
    const assetId = impactAnalysis.change.assetId;

    return activeCampaigns
      .filter(campaign => {
        // Check if this campaign uses the modified asset
        return campaign.selectedAssets?.includes(assetId);
      })
      .map(campaign => {
        const hasNewerInput = impactAnalysis.decisionImpact.decisionStatusChanged ||
                             impactAnalysis.change.researchAdded === true;

        const summary = hasNewerInput
          ? `Newer strategic input available for "${impactAnalysis.change.assetTitle}". Consider recalculation.`
          : `Asset "${impactAnalysis.change.assetTitle}" updated, but no impact on strategy.`;

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
   * Identifies which personas may be affected
   * NOTE: This does NOT modify the personas!
   */
  private static identifyAffectedPersonas(asset: BrandAssetWithMeta): string[] {
    // Simple heuristic: READY + high coverage assets are brand-critical
    // and may influence personas. Placeholder — real impl needs per-asset
    // persona linkage.
    if (asset.status === 'READY' && asset.coveragePercentage >= 70) {
      return ['all-personas'];
    }
    return [];
  }

  /**
   * Simplified decision status for comparison
   */
  private static getSimplifiedStatus(asset: BrandAssetWithMeta): 'safe' | 'at-risk' | 'blocked' {
    const coverage = asset.coveragePercentage || 0;

    if (coverage >= 80) return 'safe';
    if (coverage >= 50) return 'at-risk';
    return 'blocked';
  }

  /**
   * Generates a human-readable summary of the decision impact
   */
  private static generateDecisionSummary(
    change: AssetChange,
    statusChanged: boolean,
    previousStatus: 'safe' | 'at-risk' | 'blocked' | undefined,
    newStatus: 'safe' | 'at-risk' | 'blocked',
    asset: BrandAssetWithMeta
  ): string {
    if (!statusChanged) {
      if (change.changeType === 'research-added') {
        return `Research added to "${asset.name}". Decision status remains ${this.statusToText(newStatus)} (${asset.coveragePercentage}% coverage).`;
      }
      return `Update to "${asset.name}" without impact on decision status.`;
    }

    // Status has changed
    if (newStatus === 'safe') {
      return `"${asset.name}" is now safe to decide! (${asset.coveragePercentage}% research coverage reached)`;
    }

    if (newStatus === 'blocked') {
      return `"${asset.name}" is now blocked for decisions (${asset.coveragePercentage}% coverage, minimum 50% required).`;
    }

    // at-risk
    return `"${asset.name}" status changed to ${this.statusToText(newStatus)} (${asset.coveragePercentage}% coverage).`;
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
   * Creates a notification for the user
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
   * Formats a short summary for UI display
   */
  static formatShortSummary(impactAnalysis: ImpactAnalysis): string {
    const { decisionImpact, change } = impactAnalysis;

    if (decisionImpact.impactLevel === 'none') {
      return 'Content update — no impact on decisions';
    }

    if (decisionImpact.impactLevel === 'high' && decisionImpact.newStatus === 'safe') {
      return `${change.assetTitle} is now safe to decide`;
    }

    if (change.researchAdded) {
      return `New research added to ${change.assetTitle}`;
    }

    return decisionImpact.summary;
  }

  /**
   * Formats a detailed summary for tooltips/modals
   */
  static formatDetailedSummary(impactAnalysis: ImpactAnalysis): {
    title: string;
    sections: { label: string; content: string; }[];
  } {
    const { change, decisionImpact, personaNote, researchPriorityNote } = impactAnalysis;

    const sections = [
      {
        label: 'What changed?',
        content: change.description,
      },
      {
        label: 'Impact on decisions',
        content: decisionImpact.summary,
      }
    ];

    // Only show if relevant
    if (decisionImpact.impactLevel !== 'none') {
      sections.push({
        label: 'Personas',
        content: personaNote,
      });
    }

    if (change.researchAdded) {
      sections.push({
        label: 'Research priorities',
        content: researchPriorityNote,
      });
    }

    return {
      title: `Change: ${change.assetTitle}`,
      sections,
    };
  }
}
