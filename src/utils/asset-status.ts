import { BrandAsset, AssetStatus, ResearchMethodType } from '../types/brand-asset';
import { VALIDATION_METHODS, getValidationMethod } from '../config/validation-methods';

/**
 * Calculate the status of an asset based on its research and content state
 */
export function calculateAssetStatus(asset: BrandAsset): AssetStatus {
  const anyMethodInProgress = asset.researchMethods.some(m => m.status === 'in-progress');
  const anyMethodCompleted = asset.researchMethods.some(m => m.status === 'completed');
  const hasContent = asset.content && asset.content.length > 0;
  
  // Check content sections if available
  if (asset.contentSections && asset.contentSections.length > 0) {
    const allSectionsValidated = asset.contentSections.every(s => s.status === 'validated');
    const anySectionReadyToValidate = asset.contentSections.some(s => s.status === 'ready-to-validate');
    
    if (allSectionsValidated && !anyMethodInProgress) {
      return 'validated';
    }
    
    if (anySectionReadyToValidate) {
      return 'ready-to-validate';
    }
  } else {
    // Fallback to simple content check
    if (hasContent && anyMethodCompleted && !anyMethodInProgress) {
      // If marked as validated
      if (asset.validatedAt) {
        return 'validated';
      }
      return 'ready-to-validate';
    }
  }
  
  if (anyMethodInProgress || anyMethodCompleted) {
    return 'in-development';
  }
  
  return 'awaiting-research';
}

/**
 * Calculate research coverage percentage (0-100)
 */
export function calculateResearchCoverage(asset: BrandAsset): number {
  const totalMethods = 4; // Workshop, Interviews, Questionnaire, AI
  const completedMethods = asset.researchMethods.filter(m => m.status === 'completed').length;
  return Math.round((completedMethods / totalMethods) * 100);
}

/**
 * Get the count of completed research methods
 */
export function getCompletedMethodsCount(asset: BrandAsset): number {
  return asset.researchMethods.filter(m => m.status === 'completed').length;
}

/**
 * Get the count of in-progress research methods
 */
export function getInProgressMethodsCount(asset: BrandAsset): number {
  return asset.researchMethods.filter(m => m.status === 'in-progress').length;
}

/**
 * Check if a specific research method has been completed
 */
export function hasCompletedMethod(asset: BrandAsset, methodType: ResearchMethodType): boolean {
  return asset.researchMethods.some(m => m.type === methodType && m.status === 'completed');
}

/**
 * Get status display information
 */
export function getStatusInfo(status: AssetStatus) {
  switch (status) {
    case 'awaiting-research':
      return {
        label: 'Awaiting Research',
        description: 'No research or development yet',
        color: 'gray',
        bgClass: 'bg-gray-100 dark:bg-gray-900/20',
        textClass: 'text-gray-700 dark:text-gray-300',
        borderClass: 'border-gray-300 dark:border-gray-700',
        icon: 'Circle'
      };
    case 'in-development':
      return {
        label: 'In Development',
        description: 'Research active, content being developed',
        color: 'blue',
        bgClass: 'bg-blue-100 dark:bg-blue-900/20',
        textClass: 'text-blue-700 dark:text-blue-300',
        borderClass: 'border-blue-300 dark:border-blue-700',
        icon: 'Clock'
      };
    case 'ready-to-validate':
      return {
        label: 'Ready to Validate',
        description: 'Generated content awaiting your validation',
        color: 'orange',
        bgClass: 'bg-orange-100 dark:bg-orange-900/20',
        textClass: 'text-orange-700 dark:text-orange-300',
        borderClass: 'border-orange-300 dark:border-orange-700',
        icon: 'AlertTriangle',
        badge: 'Review'
      };
    case 'validated':
      return {
        label: 'Validated',
        description: 'Validated and ready to use',
        color: 'green',
        bgClass: 'bg-green-100 dark:bg-green-900/20',
        textClass: 'text-green-700 dark:text-green-300',
        borderClass: 'border-green-300 dark:border-green-700',
        icon: 'CheckCircle'
      };
  }
}

/**
 * Get research method display information
 * Now uses the centralized VALIDATION_METHODS configuration
 */
export function getMethodInfo(methodType: ResearchMethodType) {
  // Direct mapping - types are now synchronized
  const validationMethod = getValidationMethod(methodType as any);
  
  if (validationMethod) {
    return {
      label: validationMethod.name,
      shortLabel: validationMethod.name.substring(0, 5) + '.',
      icon: '🎨', // Keep emoji for backward compatibility
      description: validationMethod.description
    };
  }
  
  // Fallback
  return {
    label: methodType,
    shortLabel: methodType.substring(0, 5) + '.',
    icon: '🎨',
    description: 'Validation method'
  };
}

/**
 * Get all available research method types
 */
export function getAllMethodTypes(): ResearchMethodType[] {
  return ['canvas-workshop', 'interviews', 'questionnaire', 'ai-exploration', 'competitive-analysis', 'customer-research', 'market-trends', 'brand-audit'];
}

/**
 * Filter assets by criteria
 */
export function filterAssets(
  assets: BrandAsset[],
  filters: {
    status?: AssetStatus[];
    hasMethod?: ResearchMethodType[];
    coverageMin?: number;
    coverageMax?: number;
  }
): BrandAsset[] {
  return assets.filter(asset => {
    // Filter by status
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(asset.status)) {
        return false;
      }
    }
    
    // Filter by method
    if (filters.hasMethod && filters.hasMethod.length > 0) {
      const hasAnyMethod = filters.hasMethod.some(methodType =>
        asset.researchMethods.some(m => m.type === methodType && m.status === 'completed')
      );
      if (!hasAnyMethod) {
        return false;
      }
    }
    
    // Filter by coverage
    if (filters.coverageMin !== undefined) {
      if (asset.researchCoverage < filters.coverageMin) {
        return false;
      }
    }
    
    if (filters.coverageMax !== undefined) {
      if (asset.researchCoverage > filters.coverageMax) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Group assets by status
 */
export function groupAssetsByStatus(assets: BrandAsset[]) {
  return {
    'ready-to-validate': assets.filter(a => a.status === 'ready-to-validate'),
    'in-development': assets.filter(a => a.status === 'in-development'),
    'awaiting-research': assets.filter(a => a.status === 'awaiting-research'),
    'validated': assets.filter(a => a.status === 'validated')
  };
}