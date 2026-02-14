/**
 * Entity Card Adapters
 * Transform personas and brand assets into unified EntityCardData format
 */

import { 
  Target, Eye, Zap, Users, Heart, Globe, Mic, MessageSquare, Book, Circle,
  Tag, CheckCircle2, FileText, Calendar, MapPin, Briefcase, GraduationCap, 
  DollarSign, Users as FamilyIcon
} from 'lucide-react';
import { BrandAsset, ResearchMethod } from '../types/brand-asset';
import { Persona, PersonaResearchMethod } from '../types/persona';
import { EntityCardData, EntityValidationMethod } from '../components/unified/EntityCard';
import { VALIDATION_METHODS } from '../config/validation-methods';

// ============================================================================
// ICON MAPPING FOR BRAND ASSETS
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
// QUALITY SCORE CALCULATION
// ============================================================================

function calculateQualityScore(methods: (ResearchMethod | PersonaResearchMethod)[]): number {
  const totalMethods = methods.length;
  if (totalMethods === 0) return 0;

  const completedMethods = methods.filter(m => m.status === 'completed').length;
  const runningMethods = methods.filter(m => m.status === 'running').length;  // ✅ Updated to use 'running'

  // Completed methods contribute 100%, running contribute 50%
  const score = ((completedMethods * 100) + (runningMethods * 50)) / totalMethods;
  return Math.round(score);
}

// ============================================================================
// BRAND ASSET TO ENTITY CARD ADAPTER
// ============================================================================

export function brandAssetToEntityCard(
  asset: BrandAsset,
  onClick?: () => void,
  onMethodClick?: (method: ResearchMethod, mode: 'work' | 'results') => void
): EntityCardData {
  const qualityScore = calculateQualityScore(asset.researchMethods);
  const completedCount = asset.researchMethods.filter(m => m.status === 'completed').length;

  // Transform validation methods
  const validationMethods: EntityValidationMethod[] = asset.researchMethods.map((method) => {
    const validationConfig = VALIDATION_METHODS.find(vm => vm.id === method.type);
    
    return {
      id: method.type,
      type: method.type,
      status: method.status,  // ✅ NO CASTING NEEDED - statuses are now uniform!
      progress: method.progress,
      label: validationConfig?.name || method.type,  // ✅ Simplified - just use config name or fallback to type
      icon: validationConfig?.icon,  // ✅ Add icon from validation config!
      description: method.status === 'completed' 
        ? 'Research complete • High confidence'
        : method.status === 'running'
        ? 'Active research • Data collecting'
        : method.status === 'locked'
        ? 'Locked • Upgrade required'
        : 'Available • Upgrade asset quality',
      onWorkClick: onMethodClick ? () => onMethodClick(method, 'work') : undefined,
      onResultsClick: onMethodClick && method.status === 'completed' 
        ? () => onMethodClick(method, 'results') 
        : undefined,
    };
  });

  // Build attributes
  const attributes = [
    { icon: Tag, label: 'Category', value: asset.category },
    { icon: CheckCircle2, label: 'Validated', value: `${completedCount}/${asset.researchMethods.length}` },
  ];

  if (asset.artifactsGenerated && asset.artifactsGenerated > 0) {
    attributes.push({ 
      icon: FileText,
      label: 'Artifacts', 
      value: asset.artifactsGenerated 
    });
  }

  // Build footer info
  const footerInfo: string[] = [];
  if (asset.artifactsGenerated && asset.artifactsGenerated > 0) {
    footerInfo.push(
      `📝 ${asset.artifactsGenerated} artifact${asset.artifactsGenerated !== 1 ? 's' : ''} generated`
    );
  }

  return {
    entityType: 'brand-asset',
    id: asset.id,
    title: asset.type,
    icon: getAssetIcon(asset.type),
    qualityScore,
    subtitle: asset.description,
    attributes,
    validationMethods,
    lastUpdated: asset.lastUpdated,
    footerInfo,
    onClick,
  };
}

// ============================================================================
// PERSONA TO ENTITY CARD ADAPTER
// ============================================================================

export function personaToEntityCard(
  persona: Persona,
  onClick?: () => void,
  onMethodClick?: (personaId: string, method: PersonaResearchMethod, mode: 'work' | 'results') => void,
  onChatClick?: () => void
): EntityCardData {
  const qualityScore = calculateQualityScore(persona.researchMethods);
  const completedCount = persona.researchMethods.filter(m => m.status === 'completed').length;

  // Transform validation methods
  const validationMethods: EntityValidationMethod[] = persona.researchMethods.map((method) => {
    const validationConfig = VALIDATION_METHODS.find(vm => vm.id === method.type);
    
    return {
      id: method.type,
      type: method.type,
      status: method.status,  // ✅ NO CASTING NEEDED - statuses are now uniform!
      progress: method.progress,
      label: validationConfig?.name || method.type,  // ✅ Simplified - just use config name or fallback to type
      icon: validationConfig?.icon,  // ✅ Add icon from validation config!
      description: method.status === 'completed' 
        ? 'Research complete • High confidence'
        : method.status === 'running'
        ? 'Active research • Data collecting'
        : method.status === 'locked'
        ? 'Locked • Upgrade required'
        : 'Available • Upgrade persona quality',
      onWorkClick: onMethodClick ? () => onMethodClick(persona.id, method, 'work') : undefined,
      onResultsClick: onMethodClick && method.status === 'completed' 
        ? () => onMethodClick(persona.id, method, 'results') 
        : undefined,
    };
  });

  // Build attributes for personas
  const attributes = [
    { icon: Calendar, label: 'Leeftijd', value: persona.demographics.age },
    { icon: MapPin, label: 'Locatie', value: persona.demographics.location },
    { icon: Briefcase, label: 'Beroep', value: persona.demographics.occupation },
    { icon: GraduationCap, label: 'Opleiding', value: persona.demographics.education },
    { icon: DollarSign, label: 'Inkomen', value: persona.demographics.income },
    { icon: FamilyIcon, label: 'Gezinssituatie', value: persona.demographics.familyStatus },
  ].filter(item => item.value); // Only show items with values

  return {
    entityType: 'persona',
    id: persona.id,
    title: persona.name,
    avatar: persona.avatar,
    qualityScore,
    subtitle: persona.tagline,
    attributes,
    validationMethods,
    lastUpdated: persona.lastUpdated,
    footerInfo: [],
    onClick: onClick ? () => onClick() : undefined,
    onChatClick: onChatClick ? () => onChatClick() : undefined,
  };
}