/**
 * Status Card Adapters
 * Transform domain-specific data models into unified StatusCardData format
 */

import { 
  Target, Eye, Zap, Users, Heart, Globe, Mic, MessageSquare, Book, Circle 
} from 'lucide-react';
import { BrandAsset, ResearchMethod } from '../types/brand-asset';
import { StatusCardData } from '../components/unified/types';
import { CardStatus } from '../components/unified/design-system';

// ============================================================================
// ICON MAPPING
// ============================================================================

function getAssetIcon(type: string) {
  const iconMap: Record<string, any> = {
    'Golden Circle': Target,
    'Vision Statement': Eye,
    'Mission Statement': Zap,
    'Brand Archetype': Users,
    'Core Values': Heart,
    'Transformative Goals': Target,
    'Social Relevancy': Globe,
    'Tonology': Mic,
    'Brand Tone & Voice': Mic,
    'Brand Promise': MessageSquare,
    'Brand Story': Book,
    'Brand Essence': Circle,
    'Brand Personality': Users,
    'Brand Positioning': Target,
  };
  return iconMap[type] || Target;
}

// ============================================================================
// STATUS MAPPING
// ============================================================================

function mapAssetStatus(status: string): CardStatus {
  const statusMap: Record<string, CardStatus> = {
    'awaiting-research': CardStatus.NOT_STARTED,
    'in-development': CardStatus.IN_PROGRESS,
    'ready-to-validate': CardStatus.ACTIVE,
    'validated': CardStatus.COMPLETED,
  };
  return statusMap[status] || CardStatus.DRAFT;
}

function mapMethodStatus(status: string): CardStatus {
  const statusMap: Record<string, CardStatus> = {
    'not-started': CardStatus.NOT_STARTED,
    'in-progress': CardStatus.IN_PROGRESS,
    'completed': CardStatus.COMPLETED,
    'cancelled': CardStatus.DRAFT,
  };
  return statusMap[status] || CardStatus.NOT_STARTED;
}

// ============================================================================
// QUALITY SCORE CALCULATION
// ============================================================================

function calculateQualityScore(asset: BrandAsset): number {
  const totalMethods = asset.researchMethods.length;
  if (totalMethods === 0) return 0;

  const completedMethods = asset.researchMethods.filter(m => m.status === 'completed').length;
  const inProgressMethods = asset.researchMethods.filter(m => m.status === 'in-progress').length;

  // Completed methods contribute 100%, in-progress contribute 50%
  const score = ((completedMethods * 100) + (inProgressMethods * 50)) / totalMethods;
  return Math.round(score);
}

// ============================================================================
// BRAND ASSET ADAPTER
// ============================================================================

export function brandAssetToCardData(
  asset: BrandAsset,
  onClick?: () => void,
  onMethodClick?: (method: ResearchMethod, mode: 'work' | 'results') => void
): StatusCardData {
  const qualityScore = calculateQualityScore(asset);
  const completedCount = asset.researchMethods.filter(m => m.status === 'completed').length;
  const cardStatus = mapAssetStatus(asset.status);

  return {
    header: {
      icon: getAssetIcon(asset.type),
      title: asset.type,
      badge: {
        label: `Quality ${qualityScore}`,
        variant: 'quality',
        qualityScore,
      },
    },
    meta: {
      category: asset.category,
      items: [
        {
          label: 'Validated',
          value: `${completedCount}/${asset.researchMethods.length}`,
        },
        ...(asset.artifactsGenerated ? [{
          label: 'Artifacts',
          value: asset.artifactsGenerated,
        }] : []),
      ],
    },
    body: {
      description: asset.description,
    },
    progress: asset.researchMethods.length > 0 ? {
      percentage: Math.round((completedCount / asset.researchMethods.length) * 100),
      label: 'Validation Progress',
      status: cardStatus,
      showBar: true,
    } : undefined,
    actions: onClick ? {
      primary: {
        label: 'View Details',
        onClick,
        variant: 'outline',
      },
    } : undefined,
    onClick,
    isClickable: !!onClick,
    variant: 'default',
  };
}

// ============================================================================
// CAMPAIGN ADAPTER
// ============================================================================

interface CampaignData {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed';
  targetAudience?: string;
  deliverables?: number;
  completedDeliverables?: number;
  description?: string;
  dueDate?: string;
}

export function campaignToCardData(
  campaign: CampaignData,
  onClick?: () => void
): StatusCardData {
  const status = campaign.status === 'draft' 
    ? CardStatus.DRAFT 
    : campaign.status === 'active' 
    ? CardStatus.ACTIVE 
    : CardStatus.COMPLETED;

  const progress = campaign.deliverables && campaign.completedDeliverables
    ? Math.round((campaign.completedDeliverables / campaign.deliverables) * 100)
    : 0;

  return {
    header: {
      icon: Target,
      title: campaign.name,
      badge: {
        label: status === CardStatus.ACTIVE ? 'Active' : status === CardStatus.COMPLETED ? 'Completed' : 'Draft',
        variant: 'status',
        status,
      },
    },
    meta: {
      type: campaign.targetAudience,
      items: campaign.deliverables ? [{
        label: 'Deliverables',
        value: `${campaign.completedDeliverables || 0}/${campaign.deliverables}`,
      }] : undefined,
    },
    body: {
      description: campaign.description,
    },
    progress: campaign.deliverables ? {
      percentage: progress,
      label: 'Campaign Progress',
      status,
      showBar: true,
    } : undefined,
    actions: onClick ? {
      primary: {
        label: 'Open Campaign',
        onClick,
      },
    } : undefined,
    onClick,
    isClickable: !!onClick,
  };
}

// ============================================================================
// DELIVERABLE ADAPTER
// ============================================================================

interface DeliverableData {
  id: string;
  title: string;
  type: string;
  status: 'not-started' | 'in-progress' | 'completed';
  description?: string;
  assignedTo?: string;
  dueDate?: string;
}

export function deliverableToCardData(
  deliverable: DeliverableData,
  onClick?: () => void
): StatusCardData {
  const statusMap: Record<string, CardStatus> = {
    'not-started': CardStatus.NOT_STARTED,
    'in-progress': CardStatus.IN_PROGRESS,
    'completed': CardStatus.COMPLETED,
  };

  const status = statusMap[deliverable.status] || CardStatus.NOT_STARTED;

  return {
    header: {
      icon: Book,
      title: deliverable.title,
      badge: {
        label: status === CardStatus.COMPLETED ? 'Completed' : status === CardStatus.IN_PROGRESS ? 'In Progress' : 'Not Started',
        variant: 'status',
        status,
      },
    },
    meta: {
      type: deliverable.type,
      items: [
        ...(deliverable.assignedTo ? [{
          label: 'Assigned',
          value: deliverable.assignedTo,
        }] : []),
        ...(deliverable.dueDate ? [{
          label: 'Due',
          value: new Date(deliverable.dueDate).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
        }] : []),
      ],
    },
    body: {
      description: deliverable.description,
    },
    actions: onClick ? {
      primary: {
        label: status === CardStatus.COMPLETED ? 'View' : 'Continue',
        onClick,
      },
    } : undefined,
    onClick,
    isClickable: !!onClick,
  };
}

// ============================================================================
// VALIDATION ITEM ADAPTER
// ============================================================================

interface ValidationItemData {
  id: string;
  method: string;
  assetType: string;
  status: 'pending' | 'in-progress' | 'completed';
  progress?: number;
  description?: string;
}

export function validationToCardData(
  validation: ValidationItemData,
  onClick?: () => void
): StatusCardData {
  const statusMap: Record<string, CardStatus> = {
    'pending': CardStatus.NOT_STARTED,
    'in-progress': CardStatus.IN_PROGRESS,
    'completed': CardStatus.COMPLETED,
  };

  const status = statusMap[validation.status] || CardStatus.NOT_STARTED;

  return {
    header: {
      icon: Target,
      title: validation.method,
      badge: {
        label: status === CardStatus.COMPLETED ? 'Validated' : status === CardStatus.IN_PROGRESS ? 'In Progress' : 'Pending',
        variant: 'status',
        status,
      },
    },
    meta: {
      type: validation.assetType,
    },
    body: {
      description: validation.description,
    },
    progress: validation.progress !== undefined ? {
      percentage: validation.progress,
      label: 'Validation Progress',
      status,
      showBar: true,
    } : undefined,
    actions: onClick ? {
      primary: {
        label: status === CardStatus.COMPLETED ? 'View Results' : 'Start Validation',
        onClick,
      },
    } : undefined,
    onClick,
    isClickable: !!onClick,
  };
}
