import { Suggestion, EntityType } from '../types/relationship';
import { RelationshipService } from './RelationshipService';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { mockPersonas } from '../data/mock-personas';

/**
 * SmartSuggestionsService
 * Analyzes user's current state and provides intelligent next-step recommendations
 */
export class SmartSuggestionsService {
  
  static getSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Pattern 1: Sequential Asset Completion
    suggestions.push(...this.checkSequentialCompletion());
    
    // Pattern 2: Missing Relationships
    suggestions.push(...this.checkMissingRelationships());
    
    // Pattern 3: Research Method Diversity
    suggestions.push(...this.checkResearchDiversity());
    
    // Pattern 4: Consistency Issues
    suggestions.push(...this.checkConsistencyIssues());
    
    // Pattern 5: Stale Data
    suggestions.push(...this.checkStaleData());
    
    // Pattern 6: Validation Opportunities
    suggestions.push(...this.checkValidationOpportunities());

    // Pattern 7: Low Coverage Assets
    suggestions.push(...this.checkLowCoverage());

    // Sort by priority
    return suggestions.sort((a, b) => this.getPriorityScore(b) - this.getPriorityScore(a));
  }

  private static checkSequentialCompletion(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Pattern: Golden Circle → Brand Archetype
    const goldenCircle = mockBrandAssets.find(a => a.type === 'Golden Circle');
    const archetype = mockBrandAssets.find(a => a.type === 'Brand Archetype');
    
    if (goldenCircle?.status === 'validated' && (!archetype || archetype.status === 'not-started')) {
      suggestions.push({
        id: 'suggest-archetype',
        type: 'next-asset',
        priority: 'high',
        title: 'Define Your Brand Archetype',
        description: 'Now that you have your Golden Circle, defining your Brand Archetype will help personify your brand.',
        action: 'Create Brand Archetype',
        actionUrl: '/brand/create/archetype',
        reasoning: 'Companies that complete Golden Circle + Archetype have 60% higher brand consistency scores',
        icon: 'Sparkles',
        estimatedTime: '15 minutes',
        estimatedImpact: 'high'
      });
    }

    // Pattern: Vision → Mission
    const vision = mockBrandAssets.find(a => a.type === 'Vision Statement');
    const mission = mockBrandAssets.find(a => a.type === 'Mission Statement');
    
    if (vision?.status === 'validated' && (!mission || mission.status === 'not-started')) {
      suggestions.push({
        id: 'suggest-mission',
        type: 'next-asset',
        priority: 'high',
        title: 'Create Your Mission Statement',
        description: 'Your Vision is clear - now define how you\'ll achieve it with a Mission Statement.',
        action: 'Create Mission',
        actionUrl: '/brand/create/mission',
        reasoning: 'Mission provides tactical direction to your strategic Vision',
        icon: 'Target',
        estimatedTime: '20 minutes',
        estimatedImpact: 'high'
      });
    }

    // Pattern: Brand Assets → First Persona
    const validatedAssets = mockBrandAssets.filter(a => a.status === 'validated');
    if (validatedAssets.length >= 3 && mockPersonas.length === 0) {
      suggestions.push({
        id: 'suggest-first-persona',
        type: 'next-asset',
        priority: 'high',
        title: 'Create Your First Persona',
        description: 'You have strong brand foundations - now define who you serve with target personas.',
        action: 'Create Persona',
        actionUrl: '/personas/create',
        reasoning: 'Personas help you apply your brand strategy to real customer segments',
        icon: 'Users',
        estimatedTime: '30 minutes',
        estimatedImpact: 'high'
      });
    }

    return suggestions;
  }

  private static checkMissingRelationships(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    const goldenCircle = mockBrandAssets.find(a => a.type === 'Golden Circle');
    if (goldenCircle && mockPersonas.length > 0) {
      const relationships = RelationshipService.getForEntity('brand-asset', goldenCircle.id);
      const linkedPersonas = relationships.filter(r => r.targetType === 'persona');
      
      const unlinkedCount = mockPersonas.length - linkedPersonas.length;
      
      if (unlinkedCount > 0) {
        suggestions.push({
          id: 'link-personas-gc',
          type: 'relationship',
          priority: 'medium',
          title: 'Connect Golden Circle to All Personas',
          description: `${unlinkedCount} persona(s) are not yet connected to your Golden Circle`,
          action: 'Review Connections',
          actionUrl: `/brand/${goldenCircle.id}/relationships`,
          reasoning: 'Linking your core brand purpose to personas ensures consistent messaging',
          icon: 'Link',
          estimatedTime: '10 minutes',
          estimatedImpact: 'medium',
          stats: {
            label: 'Unlinked personas',
            value: unlinkedCount
          }
        });
      }
    }

    return suggestions;
  }

  private static checkResearchDiversity(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Find assets with only one research method
    const assetsWithOnlyOneMethod = mockBrandAssets.filter(asset => {
      const completedMethods = asset.researchMethods?.filter(m => m.status === 'completed') || [];
      return completedMethods.length === 1 && asset.status !== 'not-started';
    });

    if (assetsWithOnlyOneMethod.length > 0) {
      suggestions.push({
        id: 'diversify-research',
        type: 'research',
        priority: 'medium',
        title: 'Strengthen Research with Multiple Methods',
        description: `${assetsWithOnlyOneMethod.length} asset(s) rely on only one research method`,
        action: 'Add Research Methods',
        actionUrl: '/research/plans',
        reasoning: 'Using 3+ research methods increases validation confidence by 40%',
        icon: 'TrendingUp',
        estimatedTime: '1-2 hours per asset',
        estimatedImpact: 'high',
        stats: {
          label: 'Assets at risk',
          value: assetsWithOnlyOneMethod.length
        },
        relatedEntities: assetsWithOnlyOneMethod.map(a => ({
          id: a.id,
          type: 'brand-asset' as EntityType,
          name: a.title,
          relationshipType: 'validates',
          strength: 'weak'
        }))
      });
    }

    return suggestions;
  }

  private static checkConsistencyIssues(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    const report = RelationshipService.runConsistencyCheck();
    
    if (report.criticalCount > 0) {
      suggestions.push({
        id: 'fix-critical-issues',
        type: 'warning',
        priority: 'critical',
        urgent: true,
        title: 'Resolve Critical Brand Inconsistencies',
        description: `${report.criticalCount} critical conflict(s) detected between your brand assets`,
        action: 'Review Issues',
        actionUrl: '/brand/consistency-check',
        reasoning: 'Inconsistent brand messaging confuses audiences and dilutes brand strength',
        icon: 'AlertTriangle',
        estimatedTime: '30-60 minutes',
        estimatedImpact: 'high',
        stats: {
          label: 'Critical issues',
          value: report.criticalCount
        }
      });
    } else if (report.warningCount > 0) {
      suggestions.push({
        id: 'fix-warnings',
        type: 'warning',
        priority: 'medium',
        title: 'Address Brand Consistency Warnings',
        description: `${report.warningCount} potential issue(s) detected in your brand assets`,
        action: 'Review Warnings',
        actionUrl: '/brand/consistency-check',
        reasoning: 'Addressing these warnings will improve overall brand coherence',
        icon: 'Info',
        estimatedTime: '15-30 minutes',
        estimatedImpact: 'medium',
        stats: {
          label: 'Warnings',
          value: report.warningCount
        }
      });
    }

    return suggestions;
  }

  private static checkStaleData(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const staleAssets = mockBrandAssets.filter(asset => {
      const assetDate = new Date(asset.lastUpdated);
      return assetDate < sixMonthsAgo && asset.status === 'validated';
    });

    if (staleAssets.length > 0) {
      suggestions.push({
        id: 'refresh-stale',
        type: 'maintenance',
        priority: 'low',
        title: 'Refresh Outdated Assets',
        description: `${staleAssets.length} asset(s) haven't been updated in 6+ months`,
        action: 'Review & Update',
        actionUrl: '/brand/maintenance',
        reasoning: 'Markets evolve - refreshing brand assets keeps you competitive and relevant',
        icon: 'Clock',
        estimatedTime: '15 minutes per asset',
        estimatedImpact: 'medium',
        stats: {
          label: 'Stale assets',
          value: staleAssets.length
        },
        relatedEntities: staleAssets.map(a => ({
          id: a.id,
          type: 'brand-asset' as EntityType,
          name: a.title,
          relationshipType: 'references',
          strength: 'medium',
          lastUpdated: a.lastUpdated
        }))
      });
    }

    return suggestions;
  }

  private static checkValidationOpportunities(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Find assets ready to validate
    const readyToValidate = mockBrandAssets.filter(a => a.status === 'ready-to-validate');
    
    if (readyToValidate.length > 0) {
      suggestions.push({
        id: 'validate-ready-assets',
        type: 'opportunity',
        priority: 'high',
        title: 'Validate Ready Assets',
        description: `${readyToValidate.length} asset(s) have completed research and are ready for validation`,
        action: 'Start Validation',
        actionUrl: '/brand/validation',
        reasoning: 'Validating these assets will increase your overall brand confidence score',
        icon: 'CheckCircle',
        estimatedTime: '5-10 minutes per asset',
        estimatedImpact: 'high',
        stats: {
          label: 'Ready to validate',
          value: readyToValidate.length
        },
        relatedEntities: readyToValidate.map(a => ({
          id: a.id,
          type: 'brand-asset' as EntityType,
          name: a.title,
          relationshipType: 'validates',
          strength: 'strong'
        }))
      });
    }

    // Find assets with high coverage but not validated
    const highCoverageUnvalidated = mockBrandAssets.filter(a => 
      (a.researchCoverage || 0) >= 75 && 
      a.status !== 'validated' && 
      a.status !== 'ready-to-validate'
    );

    if (highCoverageUnvalidated.length > 0) {
      suggestions.push({
        id: 'validate-high-coverage',
        type: 'opportunity',
        priority: 'medium',
        title: 'Assets Ready for Final Review',
        description: `${highCoverageUnvalidated.length} asset(s) have high research coverage (75%+) but need final review`,
        action: 'Review for Validation',
        actionUrl: '/brand/review',
        reasoning: 'These assets are well-researched and just need a final review to validate',
        icon: 'Award',
        estimatedTime: '10 minutes per asset',
        estimatedImpact: 'medium',
        stats: {
          label: 'High coverage',
          value: highCoverageUnvalidated.length
        }
      });
    }

    return suggestions;
  }

  private static checkLowCoverage(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Find critical assets with low research coverage
    const criticalLowCoverage = mockBrandAssets.filter(a => 
      a.isCritical && 
      (a.researchCoverage || 0) < 50 && 
      a.status !== 'validated'
    );

    if (criticalLowCoverage.length > 0) {
      suggestions.push({
        id: 'boost-critical-coverage',
        type: 'research',
        priority: 'high',
        title: 'Boost Research on Critical Assets',
        description: `${criticalLowCoverage.length} critical asset(s) have low research coverage (<50%)`,
        action: 'Start Research',
        actionUrl: '/research/create',
        reasoning: 'Critical brand assets need strong research backing to ensure credibility',
        icon: 'Target',
        estimatedTime: '2-3 hours per asset',
        estimatedImpact: 'high',
        stats: {
          label: 'Critical assets',
          value: criticalLowCoverage.length
        },
        relatedEntities: criticalLowCoverage.map(a => ({
          id: a.id,
          type: 'brand-asset' as EntityType,
          name: a.title,
          relationshipType: 'validates',
          strength: 'strong'
        }))
      });
    }

    return suggestions;
  }

  private static getPriorityScore(suggestion: Suggestion): number {
    const priorityScores = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25
    };
    
    let score = priorityScores[suggestion.priority];
    
    // Boost for urgent items
    if (suggestion.urgent) {
      score += 50;
    }
    
    // Boost for high impact
    if (suggestion.estimatedImpact === 'high') {
      score += 20;
    }
    
    return score;
  }

  static dismissSuggestion(suggestionId: string): void {
    // In production, store dismissed suggestions in localStorage or backend
    const dismissed = this.getDismissedSuggestions();
    dismissed.add(suggestionId);
    localStorage.setItem('dismissedSuggestions', JSON.stringify([...dismissed]));
  }

  static getDismissedSuggestions(): Set<string> {
    const stored = localStorage.getItem('dismissedSuggestions');
    return new Set(stored ? JSON.parse(stored) : []);
  }

  static getSuggestionsFiltered(): Suggestion[] {
    const all = this.getSuggestions();
    const dismissed = this.getDismissedSuggestions();
    return all.filter(s => !dismissed.has(s.id) && (s.dismissible !== false));
  }
}
