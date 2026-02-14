import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Lock, 
  Sparkles, 
  TrendingUp,
  Users,
  Target,
  Zap,
  BarChart3,
  Download,
  Share2,
  Plus,
  Layers,
  Search,
  ArrowRight,
  Package,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { useBrandAssets } from '../contexts';
import { StatusCard } from './unified/StatusCard';
import { PurchaseModal } from './PurchaseModal';
import { UnlockService } from '../services/UnlockService';
import { calculateDecisionStatus } from '../utils/decision-status-calculator';
import { DecisionStatus } from '../types/decision-status';
import { ResearchMethodType } from '../utils/research-method-helpers';
import { UnlockableTool } from '../data/research-tools';
import { EnhancedAssetCardUnified } from './brand-assets/EnhancedAssetCardUnified';
import { BrandAssetOption } from '../types/brand-asset';
import {
  SPACING,
  TYPOGRAPHY,
  ICON_SIZES,
  ICON_CONTAINERS,
  LAYOUT_PATTERNS,
  COLORS,
  cn
} from '../constants/design-system';

interface BrandAssetsViewSimpleProps {
  onAssetClick?: (assetId: string) => void;
  onNavigateToResearchMethod?: (assetId: string, methodType: ResearchMethodType, mode: 'work' | 'results') => void;
  onNavigate?: (route: string) => void;
}

// Mock data for unlockable tools (for method/tool unlock only)
const toolsMap: Record<string, UnlockableTool[]> = {
  'questionnaire': [
    {
      id: 'questionnaire',
      name: 'Questionnaire Research',
      description: 'Structured questionnaire to gather insights from stakeholders',
      price: 99,
      icon: Plus,
      supportsMultiAsset: true,
      relatedAssets: ['Core Values', 'Brand Story', 'Brand Positioning'],
    },
  ],
  'interviews': [
    {
      id: 'interviews',
      name: 'Stakeholder Interviews',
      description: 'In-depth interviews to understand brand from multiple perspectives',
      price: 149,
      icon: Lock,
      supportsMultiAsset: true,
      relatedAssets: ['Core Values', 'Brand Voice', 'Brand Messaging'],
    },
  ],
  'workshop': [
    {
      id: 'workshop',
      name: 'Workshop Facilitation',
      description: 'Complete workshop kit with facilitation guides',
      price: 199,
      icon: ArrowLeft,
      supportsMultiAsset: true,
      relatedAssets: ['Brand Archetype', 'Mission Statement', 'Vision Statement'],
    },
  ],
};

export function BrandAssetsViewSimple({ onAssetClick, onNavigateToResearchMethod, onNavigate }: BrandAssetsViewSimpleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedItemForUnlock, setSelectedItemForUnlock] = useState<{
    type: 'tool';
    id: string;
    assetId: string;
    name: string;
  } | null>(null);
  const [unlockingToolId, setUnlockingToolId] = useState<string | null>(null);
  
  // Use context to get brand assets (synchronized with detail page)
  const { brandAssets } = useBrandAssets();
  
  // Track unlock state from service (for tools only)
  const [unlockedTools, setUnlockedTools] = useState<Record<string, string[]>>(() => 
    UnlockService.getState().unlockedTools
  );

  // Subscribe to unlock service changes
  useEffect(() => {
    const unsubscribe = UnlockService.subscribe(() => {
      const state = UnlockService.getState();
      setUnlockedTools(state.unlockedTools);
    });
    return unsubscribe;
  }, []);
  
  // Map locked tools per asset (tool type -> locked)
  const lockedToolsPerAsset: Record<string, string[]> = {
    '4': ['questionnaire', 'interviews'], // Brand Archetype locked tools
    '5': ['workshop', 'questionnaire', 'interviews'], // Core Values locked tools
    '6': ['workshop', 'interviews'], // Brand Story locked tools
  };

  // Filter assets based on search
  const filteredAssets = useMemo(() => {
    let filtered = brandAssets;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(asset =>
        asset.type.toLowerCase().includes(query) ||
        asset.title.toLowerCase().includes(query) ||
        asset.description.toLowerCase().includes(query) ||
        asset.category.toLowerCase().includes(query)
      );
    }

    // Sort by strategic risk (decision status)
    return filtered.sort((a, b) => {
      const statusA = calculateDecisionStatus(a).status;
      const statusB = calculateDecisionStatus(b).status;
      
      const priorityOrder: Record<DecisionStatus, number> = {
        'blocked': 1,
        'decision-at-risk': 2,
        'safe-to-decide': 3,
      };
      
      return priorityOrder[statusA] - priorityOrder[statusB];
    });
  }, [brandAssets, searchQuery]);

  // Calculate stats
  const readyCount = filteredAssets.filter(a => calculateDecisionStatus(a).status === 'safe-to-decide').length;
  const needsWorkCount = filteredAssets.filter(a => calculateDecisionStatus(a).status !== 'safe-to-decide').length;

  const handleToolUnlockClick = (assetId: string, toolId: string, toolName: string) => {
    setSelectedItemForUnlock({
      type: 'tool',
      id: toolId,
      assetId: assetId,
      name: toolName,
    });
    setPurchaseModalOpen(true);
  };

  const handlePurchaseConfirm = (selectedToolIds: string[]) => {
    if (!selectedItemForUnlock) return;

    const targetAssetId = selectedItemForUnlock.assetId;

    // Start unlock animation for tool
    setUnlockingToolId(selectedItemForUnlock.id);

    // Update unlock service - only unlock tools
    UnlockService.unlockTools(targetAssetId, selectedToolIds);

    // Close modal
    setPurchaseModalOpen(false);

    // Reset unlock animation after it completes
    setTimeout(() => {
      setUnlockingToolId(null);
      setSelectedItemForUnlock(null);
    }, 1000);
  };

  // Get available tools for selected item (tool unlock)
  const availableTools: UnlockableTool[] = useMemo(() => {
    if (!selectedItemForUnlock) return [];
    
    const toolId = selectedItemForUnlock.id;
    const tools = toolsMap[toolId] || [];
    return tools;
  }, [selectedItemForUnlock]);
  
  // Helper function to map asset type to icon
  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'Golden Circle': return Search;
      case 'Vision Statement': return TrendingUp;
      case 'Mission Statement': return ArrowRight;
      case 'Brand Archetype': return Plus;
      case 'Core Values': return ArrowRight;
      case 'Social Relevancy': return Package;
      case 'Brand Tone & Voice': return AlertCircle;
      case 'Brand Promise': return ArrowRight;
      case 'Brand Story': return Search;
      default: return Plus;
    }
  };
  
  // Prepare available assets for the modal
  const availableAssetsForModal: BrandAssetOption[] = useMemo(() => {
    return brandAssets.map(asset => ({
      id: asset.id,
      name: asset.title,
      type: asset.type,
      icon: getAssetIcon(asset.type),
    }));
  }, [brandAssets]);

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold mb-1">Brand Foundation</h1>
                <p className="text-muted-foreground">
                  Build your strategic foundation with premium brand tools
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        
        {/* BLOCK 1: Overview Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-emerald-600 mb-1">{readyCount}</div>
              <div className="text-sm text-muted-foreground">Ready to use</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-amber-600 mb-1">{needsWorkCount}</div>
              <div className="text-sm text-muted-foreground">Need more research</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl font-bold mb-1">{filteredAssets.length}</div>
              <div className="text-sm text-muted-foreground">Total assets</div>
            </CardContent>
          </Card>
        </div>

        {/* BLOCK 2: Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brand assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* BLOCK 3: Assets List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAssets.map((asset) => {
            // Get locked tools for this asset
            const assetLockedTools = lockedToolsPerAsset[asset.id] || [];
            const assetUnlockedTools = unlockedTools[asset.id] || [];
            
            // Filter out unlocked tools from locked list
            const actuallyLockedTools = assetLockedTools.filter(
              toolId => !assetUnlockedTools.includes(toolId)
            );

            return (
              <EnhancedAssetCardUnified
                key={asset.id}
                asset={asset}
                onClick={() => onAssetClick?.(asset.id)}
                onMethodClick={(method, mode) => onNavigateToResearchMethod?.(asset.id, method.type, mode)}
                lockedToolIds={actuallyLockedTools}
                unlockingToolId={unlockingToolId}
                onToolUnlockClick={(toolId, toolName) => handleToolUnlockClick(asset.id, toolId, toolName)}
              />
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAssets.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">No assets found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search
              </p>
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Purchase Modal */}
      {selectedItemForUnlock && (
        <PurchaseModal
          isOpen={purchaseModalOpen}
          onClose={() => {
            setPurchaseModalOpen(false);
            setTimeout(() => setSelectedItemForUnlock(null), 300);
          }}
          onConfirm={handlePurchaseConfirm}
          itemType={selectedItemForUnlock.type}
          itemId={selectedItemForUnlock.id}
          itemName={selectedItemForUnlock.name}
          availableTools={availableTools}
          currentAssetId={selectedItemForUnlock.assetId}
          availableAssets={availableAssetsForModal}
        />
      )}
    </div>
  );
}