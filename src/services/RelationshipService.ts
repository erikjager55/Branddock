import { 
  Relationship, 
  ImpactAnalysis, 
  ConsistencyReport, 
  ConsistencyIssue,
  EntityReference,
  EntityType,
  RelationshipStats,
  RelationType
} from '../types/relationship';
import { mockRelationships, getAllRelationships } from '../data/mock-relationships';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { mockPersonas } from '../data/mock-personas';

/**
 * RelationshipService
 * Core service for managing relationships between entities
 */
export class RelationshipService {
  
  // ==================== BASIC CRUD ====================
  
  static getAll(): Relationship[] {
    return getAllRelationships();
  }

  static getById(relationshipId: string): Relationship | undefined {
    return mockRelationships.find(r => r.id === relationshipId);
  }

  static getForEntity(entityType: EntityType, entityId: string): Relationship[] {
    return mockRelationships.filter(rel => 
      (rel.sourceType === entityType && rel.sourceId === entityId) ||
      (rel.targetType === entityType && rel.targetId === entityId)
    );
  }

  static create(relationship: Omit<Relationship, 'id' | 'createdAt'>): Relationship {
    const newRelationship: Relationship = {
      ...relationship,
      id: `rel-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: relationship.status || 'active'
    };
    mockRelationships.push(newRelationship);
    return newRelationship;
  }

  static update(relationshipId: string, updates: Partial<Relationship>): Relationship | null {
    const index = mockRelationships.findIndex(r => r.id === relationshipId);
    if (index === -1) return null;

    mockRelationships[index] = {
      ...mockRelationships[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return mockRelationships[index];
  }

  static delete(relationshipId: string): boolean {
    const index = mockRelationships.findIndex(r => r.id === relationshipId);
    if (index === -1) return false;
    mockRelationships.splice(index, 1);
    return true;
  }

  // ==================== IMPACT ANALYSIS ====================
  
  static getImpactAnalysis(entityType: EntityType, entityId: string): ImpactAnalysis {
    const relationships = this.getForEntity(entityType, entityId);
    
    // Get direct relationships
    const directRelationships = relationships.filter(r => r.status === 'active');
    
    // Calculate indirect impacts (relationships of relationships)
    const indirectRelationships = this.getIndirectRelationships(entityType, entityId);
    
    // Group by entity type
    const affectedByType = this.groupRelationshipsByTargetType(relationships);
    
    // Determine risk level
    const criticalCount = directRelationships.filter(r => r.strength === 'strong').length;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (criticalCount >= 5) riskLevel = 'critical';
    else if (criticalCount >= 3) riskLevel = 'high';
    else if (criticalCount >= 1) riskLevel = 'medium';
    
    // Get entity name
    const entityName = this.getEntityName(entityType, entityId);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      entityType,
      relationships,
      riskLevel
    );

    return {
      entityType,
      entityId,
      entityName,
      riskLevel,
      directImpacts: directRelationships.length,
      indirectImpacts: indirectRelationships.length,
      totalAffected: directRelationships.length + indirectRelationships.length,
      affectedByType,
      criticalRelationships: directRelationships.filter(r => r.strength === 'strong'),
      recommendations,
      estimatedUpdateTime: this.estimateUpdateTime(directRelationships.length)
    };
  }

  private static getIndirectRelationships(entityType: EntityType, entityId: string): Relationship[] {
    const direct = this.getForEntity(entityType, entityId);
    const indirect: Relationship[] = [];
    
    direct.forEach(rel => {
      // Get the connected entity
      const connectedType = rel.targetType === entityType ? rel.sourceType : rel.targetType;
      const connectedId = rel.targetId === entityId ? rel.sourceId : rel.targetId;
      
      // Get relationships of the connected entity
      const secondLevel = this.getForEntity(connectedType, connectedId);
      secondLevel.forEach(secondRel => {
        // Don't include the original relationship
        if (secondRel.id !== rel.id && 
            !(secondRel.sourceId === entityId || secondRel.targetId === entityId)) {
          indirect.push(secondRel);
        }
      });
    });
    
    // Remove duplicates
    return Array.from(new Map(indirect.map(item => [item.id, item])).values());
  }

  private static groupRelationshipsByTargetType(relationships: Relationship[]): ImpactAnalysis['affectedByType'] {
    const grouped: ImpactAnalysis['affectedByType'] = {
      personas: [],
      brandAssets: [],
      researchPlans: [],
      strategyTools: [],
      trends: [],
      knowledge: [],
      products: []
    };

    relationships.forEach(rel => {
      const entityRef: EntityReference = {
        id: rel.targetId,
        type: rel.targetType,
        name: rel.targetName,
        relationshipType: rel.relationType,
        strength: rel.strength
      };

      switch (rel.targetType) {
        case 'persona':
          grouped.personas.push(entityRef);
          break;
        case 'brand-asset':
          grouped.brandAssets.push(entityRef);
          break;
        case 'research-plan':
          grouped.researchPlans.push(entityRef);
          break;
        case 'strategy-tool':
          grouped.strategyTools.push(entityRef);
          break;
        case 'trend':
          grouped.trends.push(entityRef);
          break;
        case 'knowledge':
          grouped.knowledge.push(entityRef);
          break;
        case 'product':
          grouped.products.push(entityRef);
          break;
      }
    });

    return grouped;
  }

  private static generateRecommendations(
    entityType: EntityType,
    relationships: Relationship[],
    riskLevel: string
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Create a backup snapshot before making changes');
      recommendations.push('Review all strongly connected entities for alignment');
      recommendations.push('Consider notifying team members about upcoming changes');
    }

    const strongRelationships = relationships.filter(r => r.strength === 'strong');
    if (strongRelationships.length > 0) {
      recommendations.push(`Update ${strongRelationships.length} strongly connected entities to maintain consistency`);
    }

    const personas = relationships.filter(r => r.targetType === 'persona');
    if (personas.length > 0) {
      recommendations.push(`Validate changes with ${personas.length} affected persona(s)`);
    }

    const researchPlans = relationships.filter(r => r.targetType === 'research-plan');
    if (researchPlans.length > 0) {
      recommendations.push('Consider re-running affected research to validate changes');
    }

    if (recommendations.length === 0) {
      recommendations.push('No critical dependencies detected - safe to proceed');
    }

    return recommendations;
  }

  private static estimateUpdateTime(relationshipCount: number): string {
    if (relationshipCount === 0) return '< 5 minutes';
    if (relationshipCount <= 2) return '15-30 minutes';
    if (relationshipCount <= 5) return '1-2 hours';
    if (relationshipCount <= 10) return '2-4 hours';
    return '4+ hours';
  }

  private static getEntityName(entityType: EntityType, entityId: string): string {
    switch (entityType) {
      case 'brand-asset':
        const asset = mockBrandAssets.find(a => a.id === entityId);
        return asset?.title || 'Unknown Brand Asset';
      case 'persona':
        const persona = mockPersonas.find(p => p.id === entityId);
        return persona?.name || 'Unknown Persona';
      default:
        return `${entityType}-${entityId}`;
    }
  }

  // ==================== CONSISTENCY CHECKER ====================
  
  static runConsistencyCheck(): ConsistencyReport {
    const issues: ConsistencyIssue[] = [];
    const now = new Date().toISOString();

    // Check 1: Semantic conflicts
    issues.push(...this.checkSemanticConflicts());
    
    // Check 2: Missing critical connections
    issues.push(...this.checkMissingConnections());
    
    // Check 3: Stale references
    issues.push(...this.checkStaleReferences());
    
    // Check 4: Keyword gaps
    issues.push(...this.checkKeywordGaps());
    
    // Check 5: Orphaned entities
    issues.push(...this.checkOrphanedEntities());

    // Calculate counts
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    // Calculate overall health score (0-100)
    const maxScore = 100;
    const criticalPenalty = criticalCount * 20;
    const warningPenalty = warningCount * 10;
    const infoPenalty = infoCount * 5;
    const overallScore = Math.max(0, maxScore - criticalPenalty - warningPenalty - infoPenalty);

    // Generate summary
    const stats = this.getStats();
    
    return {
      generatedAt: now,
      totalIssues: issues.length,
      criticalCount,
      warningCount,
      infoCount,
      overallScore,
      issues: issues.sort((a, b) => b.priority - a.priority),
      summary: {
        strongestAsset: stats.mostConnectedEntity,
        weakestAsset: stats.leastConnectedEntity,
        mostConflicts: this.getMostConflictedEntity(),
        recentlyUpdated: this.getRecentlyUpdatedEntities(),
        needsAttention: this.getEntitiesNeedingAttention()
      }
    };
  }

  private static checkSemanticConflicts(): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    // Find relationships marked as conflicts
    const conflicts = mockRelationships.filter(r => r.status === 'conflict');
    
    conflicts.forEach(conflict => {
      issues.push({
        id: `conflict-${conflict.id}`,
        severity: 'critical',
        type: 'semantic-conflict',
        title: `Conflict: ${conflict.sourceName} ↔ ${conflict.targetName}`,
        description: conflict.metadata?.notes || 'Semantic conflict detected between entities',
        affectedEntities: [
          {
            id: conflict.sourceId,
            type: conflict.sourceType,
            name: conflict.sourceName,
            relationshipType: conflict.relationType,
            strength: conflict.strength
          },
          {
            id: conflict.targetId,
            type: conflict.targetType,
            name: conflict.targetName,
            relationshipType: conflict.relationType,
            strength: conflict.strength
          }
        ],
        detectedAt: conflict.createdAt,
        suggestedAction: 'Review both entities and resolve conflicting information',
        autoFixable: false,
        priority: 10
      });
    });

    return issues;
  }

  private static checkMissingConnections(): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    // Example: Golden Circle should connect to all critical brand assets
    const goldenCircle = mockBrandAssets.find(a => a.type === 'Golden Circle');
    if (goldenCircle) {
      const gcRelationships = this.getForEntity('brand-asset', goldenCircle.id);
      const connectedAssetIds = gcRelationships
        .filter(r => r.targetType === 'brand-asset' || r.sourceType === 'brand-asset')
        .map(r => r.targetId === goldenCircle.id ? r.sourceId : r.targetId);
      
      const criticalAssets = mockBrandAssets.filter(a => 
        a.isCritical && a.id !== goldenCircle.id
      );
      
      const missingConnections = criticalAssets.filter(a => !connectedAssetIds.includes(a.id));
      
      if (missingConnections.length > 0) {
        issues.push({
          id: 'missing-gc-connections',
          severity: 'warning',
          type: 'missing-connection',
          title: 'Golden Circle not connected to all critical assets',
          description: `${missingConnections.length} critical brand assets are not connected to Golden Circle`,
          affectedEntities: missingConnections.map(a => ({
            id: a.id,
            type: 'brand-asset' as EntityType,
            name: a.title,
            relationshipType: 'supports' as RelationType,
            strength: 'strong'
          })),
          detectedAt: new Date().toISOString(),
          suggestedAction: 'Review and create relationships between Golden Circle and critical brand assets',
          autoFixable: true,
          priority: 7
        });
      }
    }

    return issues;
  }

  private static checkStaleReferences(): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    mockBrandAssets.forEach(asset => {
      const assetDate = new Date(asset.lastUpdated);
      if (assetDate < sixMonthsAgo) {
        const relationships = this.getForEntity('brand-asset', asset.id);
        if (relationships.length > 0) {
          issues.push({
            id: `stale-${asset.id}`,
            severity: 'info',
            type: 'stale-reference',
            title: `${asset.title} hasn't been updated in 6+ months`,
            description: `This asset has ${relationships.length} relationships but hasn't been reviewed recently`,
            affectedEntities: [{
              id: asset.id,
              type: 'brand-asset',
              name: asset.title,
              relationshipType: 'references',
              strength: 'medium',
              lastUpdated: asset.lastUpdated
            }],
            detectedAt: new Date().toISOString(),
            suggestedAction: 'Review and refresh this asset to ensure information is current',
            autoFixable: false,
            priority: 3
          });
        }
      }
    });

    return issues;
  }

  private static checkKeywordGaps(): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    // Simple keyword check (in production, use NLP)
    const goldenCircle = mockBrandAssets.find(a => a.type === 'Golden Circle');
    const vision = mockBrandAssets.find(a => a.type === 'Vision Statement');
    
    if (goldenCircle && vision) {
      // This is a simplified check - in production, use proper NLP
      const gcKeywords = this.extractKeywords(goldenCircle.content || '');
      const visionKeywords = this.extractKeywords(vision.content || '');
      
      const missingInVision = gcKeywords.filter(kw => !visionKeywords.includes(kw));
      
      if (missingInVision.length > 2) {
        issues.push({
          id: 'keyword-gap-vision',
          severity: 'warning',
          type: 'keyword-gap',
          title: 'Key concepts from Golden Circle missing in Vision',
          description: `Keywords "${missingInVision.slice(0, 3).join(', ')}" from Golden Circle are not reflected in Vision Statement`,
          affectedEntities: [
            {
              id: goldenCircle.id,
              type: 'brand-asset',
              name: goldenCircle.title,
              relationshipType: 'supports',
              strength: 'strong'
            },
            {
              id: vision.id,
              type: 'brand-asset',
              name: vision.title,
              relationshipType: 'supports',
              strength: 'strong'
            }
          ],
          detectedAt: new Date().toISOString(),
          suggestedAction: 'Review Vision Statement to ensure alignment with Golden Circle core concepts',
          autoFixable: false,
          priority: 6
        });
      }
    }

    return issues;
  }

  private static checkOrphanedEntities(): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    // Find brand assets with no relationships
    mockBrandAssets.forEach(asset => {
      const relationships = this.getForEntity('brand-asset', asset.id);
      if (relationships.length === 0) {
        issues.push({
          id: `orphan-${asset.id}`,
          severity: 'info',
          type: 'missing-connection',
          title: `${asset.title} has no relationships`,
          description: 'This asset is isolated and not connected to other brand elements',
          affectedEntities: [{
            id: asset.id,
            type: 'brand-asset',
            name: asset.title,
            relationshipType: 'references',
            strength: 'weak'
          }],
          detectedAt: new Date().toISOString(),
          suggestedAction: 'Create relationships with relevant personas, research plans, or other brand assets',
          autoFixable: false,
          priority: 4
        });
      }
    });

    return issues;
  }

  private static extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'that', 'this', 'these', 'those'
    ]);
    
    return text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 4 && !stopWords.has(word))
      .slice(0, 10);
  }

  private static getMostConflictedEntity(): EntityReference | undefined {
    const conflictCounts = new Map<string, { count: number; entity: EntityReference }>();
    
    mockRelationships.forEach(rel => {
      if (rel.status === 'conflict') {
        const sourceKey = `${rel.sourceType}-${rel.sourceId}`;
        const existing = conflictCounts.get(sourceKey);
        if (existing) {
          existing.count++;
        } else {
          conflictCounts.set(sourceKey, {
            count: 1,
            entity: {
              id: rel.sourceId,
              type: rel.sourceType,
              name: rel.sourceName,
              relationshipType: rel.relationType,
              strength: rel.strength
            }
          });
        }
      }
    });

    let maxConflicts = 0;
    let mostConflicted: EntityReference | undefined;

    conflictCounts.forEach(value => {
      if (value.count > maxConflicts) {
        maxConflicts = value.count;
        mostConflicted = value.entity;
      }
    });

    return mostConflicted;
  }

  private static getRecentlyUpdatedEntities(): EntityReference[] {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return mockBrandAssets
      .filter(asset => new Date(asset.lastUpdated) > oneDayAgo)
      .slice(0, 5)
      .map(asset => ({
        id: asset.id,
        type: 'brand-asset' as EntityType,
        name: asset.title,
        relationshipType: 'references' as RelationType,
        strength: 'medium' as const,
        lastUpdated: asset.lastUpdated
      }));
  }

  private static getEntitiesNeedingAttention(): EntityReference[] {
    const needsAttention: EntityReference[] = [];

    // Assets with status 'ready-to-validate'
    mockBrandAssets
      .filter(asset => asset.status === 'ready-to-validate')
      .forEach(asset => {
        needsAttention.push({
          id: asset.id,
          type: 'brand-asset',
          name: asset.title,
          relationshipType: 'validates',
          strength: 'medium'
        });
      });

    return needsAttention;
  }

  // ==================== STATISTICS ====================
  
  static getStats(): RelationshipStats {
    const relationships = this.getAll();
    
    // Count by type
    const byType: Record<RelationType, number> = {
      'informs': 0,
      'validates': 0,
      'influences': 0,
      'uses': 0,
      'targets': 0,
      'references': 0,
      'derives-from': 0,
      'conflicts-with': 0,
      'supports': 0
    };
    
    relationships.forEach(rel => {
      byType[rel.relationType]++;
    });

    // Count by strength
    const byStrength = {
      weak: relationships.filter(r => r.strength === 'weak').length,
      medium: relationships.filter(r => r.strength === 'medium').length,
      strong: relationships.filter(r => r.strength === 'strong').length
    };

    // Find most/least connected
    const connectionCounts = new Map<string, { count: number; entity: EntityReference }>();
    
    relationships.forEach(rel => {
      [rel.sourceId, rel.targetId].forEach((id, index) => {
        const type = index === 0 ? rel.sourceType : rel.targetType;
        const name = index === 0 ? rel.sourceName : rel.targetName;
        const key = `${type}-${id}`;
        
        const existing = connectionCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          connectionCounts.set(key, {
            count: 1,
            entity: {
              id,
              type,
              name,
              relationshipType: rel.relationType,
              strength: rel.strength
            }
          });
        }
      });
    });

    let mostConnected: EntityReference | undefined;
    let leastConnected: EntityReference | undefined;
    let maxCount = 0;
    let minCount = Infinity;

    connectionCounts.forEach(value => {
      if (value.count > maxCount) {
        maxCount = value.count;
        mostConnected = value.entity;
      }
      if (value.count < minCount) {
        minCount = value.count;
        leastConnected = value.entity;
      }
    });

    // Find orphaned entities (with no relationships)
    const connectedIds = new Set<string>();
    relationships.forEach(rel => {
      connectedIds.add(`${rel.sourceType}-${rel.sourceId}`);
      connectedIds.add(`${rel.targetType}-${rel.targetId}`);
    });

    const orphanedEntities: EntityReference[] = [];
    mockBrandAssets.forEach(asset => {
      if (!connectedIds.has(`brand-asset-${asset.id}`)) {
        orphanedEntities.push({
          id: asset.id,
          type: 'brand-asset',
          name: asset.title,
          relationshipType: 'references',
          strength: 'weak'
        });
      }
    });

    // AI vs user created
    const aiSuggested = relationships.filter(r => r.metadata?.autoGenerated).length;
    const userCreated = relationships.length - aiSuggested;

    // Recent relationships
    const recentRelationships = relationships
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      totalRelationships: relationships.length,
      byType,
      byStrength,
      averageConnectionsPerAsset: connectionCounts.size > 0 ? relationships.length / connectionCounts.size : 0,
      mostConnectedEntity: mostConnected || {
        id: 'none',
        type: 'brand-asset',
        name: 'No data',
        relationshipType: 'references',
        strength: 'weak'
      },
      leastConnectedEntity: leastConnected || {
        id: 'none',
        type: 'brand-asset',
        name: 'No data',
        relationshipType: 'references',
        strength: 'weak'
      },
      orphanedEntities,
      recentlyCreated: recentRelationships,
      aiSuggestedCount: aiSuggested,
      userCreatedCount: userCreated
    };
  }

  // ==================== AUTO-DETECTION ====================
  
  static autoDetectRelationships(entityType: EntityType, entityId: string): Relationship[] {
    // This would use AI/NLP in production
    // For now, return empty array
    return [];
  }

  static suggestRelationships(entityType: EntityType, entityId: string): Relationship[] {
    // This would use pattern matching in production
    // For now, return empty array
    return [];
  }
}
