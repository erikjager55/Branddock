import { BrandAsset, ResearchMethod } from '../../types/brand-asset';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AssetStatusBadge } from './AssetStatusBadge';
import { ResearchCoverageBar } from './ResearchCoverageBar';
import { ResearchMethodBadgeGroup } from './ResearchMethodBadge';
import { getCompletedMethodsCount, getMethodInfo } from '../../utils/asset-status';
import { VALIDATION_METHODS } from '../../config/validation-methods';
import { ResearchMethodCard, MethodStatus, UnlockStatus } from '../research/ResearchMethodCard';
import { standardizeMethodData } from '../../utils/research-method-utils';
import { 
  Target, 
  Eye, 
  Zap, 
  Users, 
  Heart, 
  Globe, 
  Mic, 
  MessageSquare, 
  Book, 
  Circle, 
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion } from 'motion/react';
import { QualityBadge } from '../quality/QualityBadge';
import { calculateQualityScore } from '../../constants/quality-system';
import { ValidationMethodButton } from '../validation/ValidationMethodButton';
import { cn } from '../../lib/utils';
import { useState } from 'react';

interface EnhancedAssetCardProps {
  asset: BrandAsset;
  onClick?: () => void;
  onMethodClick?: (method: ResearchMethod, mode: 'work' | 'results') => void;
  lockedToolIds?: string[];
  unlockingToolId?: string | null;
  onToolUnlockClick?: (toolId: string, toolName: string) => void;
}

export function EnhancedAssetCard({ asset, onClick, onMethodClick, lockedToolIds, unlockingToolId, onToolUnlockClick }: EnhancedAssetCardProps) {
  const [isValidationExpanded, setIsValidationExpanded] = useState(false);
  const completedCount = getCompletedMethodsCount(asset);
  const artifactsCount = asset.artifactsGenerated || 0;
  
  // Calculate Quality Score based on research completion
  const totalMethods = asset.researchMethods.length;
  const completedMethods = asset.researchMethods.filter(m => m.status === 'completed').length;
  const qualityScore = calculateQualityScore(completedMethods, totalMethods);
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-blue-600 dark:text-blue-400';
    return 'text-orange-600 dark:text-orange-400';
  };
  
  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 50) return 'bg-blue-100 dark:bg-blue-900/30';
    return 'bg-orange-100 dark:bg-orange-900/30';
  };
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'Golden Circle': return Target;
      case 'Vision Statement': return Eye;
      case 'Mission Statement': return Zap;
      case 'Brand Archetype': return Users;
      case 'Core Values': return Heart;
      case 'Transformative Goals': return Target;
      case 'Social Relevancy': return Globe;
      case 'Tonology': return Mic;
      case 'Brand Tone & Voice': return Mic;
      case 'Brand Promise': return MessageSquare;
      case 'Brand Story': return Book;
      case 'Brand Essence': return Circle;
      case 'Brand Personality': return Users;
      case 'Brand Positioning': return Target;
      default: return Target;
    }
  };
  
  const Icon = getIcon(asset.type);
  
  // Render method status using ResearchMethodCard component with centralized data transformation
  const renderMethodStatus = (method: ResearchMethod, idx: number) => {
    const isToolLocked = lockedToolIds?.includes(method.type) || false;
    const isToolUnlocking = unlockingToolId === method.type;

    // Get validation method config for unlock animation
    const validationMethod = VALIDATION_METHODS.find(m => m.id === method.type);
    if (!validationMethod) return null;

    // Handle unlock animation state - render custom animation
    if (isToolUnlocking) {
      return (
        <motion.div
          key={idx}
          className="relative flex items-center justify-between gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-300 dark:border-purple-600 overflow-hidden"
          initial={{ opacity: 0.6, filter: 'grayscale(100%)' }}
          animate={{ opacity: 1, filter: 'grayscale(0%)' }}
          transition={{ duration: 0.6 }}
        >
          {/* Unlock burst effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-400/30 to-indigo-400/30"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
          
          <div className="flex items-center gap-3 flex-1 relative z-10">
            <motion.div 
              className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </motion.div>
            <div className="flex-1">
              <div className="text-sm font-medium text-purple-900 dark:text-purple-100">
                {validationMethod.name} Unlocked!
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                Tool is now available
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    // Use centralized data transformation
    const standardizedData = standardizeMethodData(method, isToolLocked);
    if (!standardizedData) return null;

    return (
      <ResearchMethodCard
        key={idx}
        methodId={standardizedData.methodId}
        title={standardizedData.title}
        description={standardizedData.description}
        duration={standardizedData.duration}
        category={standardizedData.category}
        unlockStatus={standardizedData.unlockStatus}
        progressState={standardizedData.progressState}
        progressValue={standardizedData.progressValue}
        impactValue={standardizedData.impactValue}
        qualityScore={standardizedData.qualityScore}
        confidence={standardizedData.confidence}
        icon={standardizedData.icon}
        primaryActionLabel={standardizedData.primaryActionLabel}
        onPrimaryAction={() => {
          if (standardizedData.progressState === 'locked' && onToolUnlockClick) {
            onToolUnlockClick(method.type, standardizedData.title);
          } else if (onMethodClick) {
            // For AI Exploration, always go to 'work' mode (chat interface) even if completed
            // For other methods, go to 'results' mode when completed
            const mode = method.type === 'ai-exploration' 
              ? 'work' 
              : (standardizedData.progressState === 'completed' ? 'results' : 'work');
            onMethodClick(method, mode);
          }
        }}
        showActions={true}
        animationDelay={0}
        completedAt={standardizedData.completedAt}
      />
    );
  };
  
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div className="relative h-full">
      <Card className="hover:shadow-lg transition-all group h-full relative overflow-hidden">
        <CardHeader className="pb-4" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start space-x-3 flex-1">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base mb-2 group-hover:text-primary transition-colors">
                  {asset.type}
                </CardTitle>
                {/* Quality Score Badge */}
                <QualityBadge 
                  score={qualityScore}
                  completedCount={completedMethods}
                  totalCount={totalMethods}
                  size="sm"
                  showIcon={true}
                  showScore={true}
                  showLabel={false}
                  showTooltip={true}
                />
              </div>
            </div>
          </div>
          
          {asset.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {asset.description}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Validation Methods Accordion */}
          {asset.researchMethods.length > 0 && (
            <div className="pt-2 border-t">
              <button
                className="w-full flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsValidationExpanded(!isValidationExpanded);
                }}
              >
                <div className="flex items-center gap-2">
                  <span>Validation Methods</span>
                  <Badge variant="secondary" className="text-xs">
                    {completedCount}/{totalMethods}
                  </Badge>
                </div>
                {isValidationExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {/* Accordion Content */}
              <div
                className={cn(
                  "grid transition-all duration-200 ease-in-out",
                  isValidationExpanded 
                    ? "grid-rows-[1fr] opacity-100 mt-3" 
                    : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <div className="space-y-2">
                    {asset.researchMethods.map((method, idx) => renderMethodStatus(method, idx))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Empty state if no methods */}
          {asset.researchMethods.length === 0 && (
            <div className="py-8 text-center border-2 border-dashed border-border rounded-lg">
              <div className="h-10 w-10 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">No validation methods yet</p>
              <p className="text-xs text-muted-foreground">
                Start research to improve asset quality
              </p>
            </div>
          )}
          
          {/* Metadata Footer */}
          <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
            {artifactsCount > 0 && (
              <div className="flex items-center justify-between">
                <span>📝 {artifactsCount} artifact{artifactsCount !== 1 ? 's' : ''} generated</span>
              </div>
            )}
            {asset.lastUpdated && (
              <div>
                Last updated: {new Date(asset.lastUpdated).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface EnhancedAssetCardGridProps {
  assets: BrandAsset[];
  onAssetClick?: (assetId: string) => void;
  onMethodClick?: (assetId: string, method: ResearchMethod, mode: 'work' | 'results') => void;
}

export function EnhancedAssetCardGrid({ 
  assets, 
  onAssetClick,
  onMethodClick 
}: EnhancedAssetCardGridProps) {
  if (assets.length === 0) {
    return (
      <div className="text-center py-12">
        <Circle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No assets found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or create a new asset.
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {assets.map((asset) => (
        <EnhancedAssetCard
          key={asset.id}
          asset={asset}
          onClick={() => onAssetClick?.(asset.id)}
          onMethodClick={(method, mode) => onMethodClick?.(asset.id, method, mode)}
        />
      ))}
    </div>
  );
}