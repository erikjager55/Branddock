import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import {
  X,
  Search,
  Package,
  Users,
  TrendingUp,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles
} from 'lucide-react';

interface AssetOption {
  id: string;
  name: string;
  type: 'product' | 'audience' | 'trend' | 'file';
  trustLevel: 'high' | 'medium' | 'low';
  trustLabel: string;
}

interface AssetSelectionModalProps {
  onClose: () => void;
  onSelect?: (asset: AssetOption) => void;
  onSelectMultiple?: (assets: AssetOption[]) => void;
}

const allAssets: AssetOption[] = [
  {
    id: 'product-sneakers',
    name: 'Summer Sneakers',
    type: 'product',
    trustLevel: 'medium',
    trustLabel: 'Manual Add'
  },
  {
    id: 'audience-tech',
    name: 'Tech Professionals',
    type: 'audience',
    trustLevel: 'high',
    trustLabel: 'Human Validated'
  },
  {
    id: 'audience-budget',
    name: 'Budget Shoppers',
    type: 'audience',
    trustLevel: 'low',
    trustLabel: 'AI Draft'
  },
  {
    id: 'product-socks',
    name: 'Performance Socks',
    type: 'product',
    trustLevel: 'high',
    trustLabel: 'Human Validated'
  },
  {
    id: 'audience-millennial',
    name: 'Millennial Parents',
    type: 'audience',
    trustLevel: 'high',
    trustLabel: 'Human Validated'
  },
  {
    id: 'trend-sustainability',
    name: 'Sustainability Movement',
    type: 'trend',
    trustLevel: 'medium',
    trustLabel: 'Manual Add'
  },
  {
    id: 'trend-social-commerce',
    name: 'Social Commerce Growth',
    type: 'trend',
    trustLevel: 'low',
    trustLabel: 'AI Draft'
  },
  {
    id: 'file-market-research',
    name: 'Q4 Market Research Report',
    type: 'file',
    trustLevel: 'high',
    trustLabel: 'Human Validated'
  }
];

export function AssetSelectionModal({ onClose, onSelect, onSelectMultiple }: AssetSelectionModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'product' | 'audience' | 'trend' | 'file'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  const tabs = [
    { id: 'all' as const, label: 'All' },
    { id: 'product' as const, label: 'Products' },
    { id: 'audience' as const, label: 'Audiences' },
    { id: 'trend' as const, label: 'Trends' },
    { id: 'file' as const, label: 'Files' }
  ];

  // Filter assets based on active tab and search
  const filteredAssets = allAssets.filter(asset => {
    const matchesTab = activeTab === 'all' || asset.type === activeTab;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const trustBadgeStyles = {
    high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700',
    low: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700'
  };

  const getAssetIcon = (type: string, trustLevel: string) => {
    const iconClasses = "h-5 w-5";
    const colorClasses = trustLevel === 'high' 
      ? 'text-green-600 dark:text-green-400'
      : trustLevel === 'medium'
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-orange-600 dark:text-orange-400';

    switch (type) {
      case 'product':
        return <Package className={`${iconClasses} ${colorClasses}`} />;
      case 'audience':
        return <Users className={`${iconClasses} ${colorClasses}`} />;
      case 'trend':
        return <TrendingUp className={`${iconClasses} ${colorClasses}`} />;
      case 'file':
        return <FileText className={`${iconClasses} ${colorClasses}`} />;
      default:
        return <Package className={`${iconClasses} ${colorClasses}`} />;
    }
  };

  const getTrustIcon = (trustLevel: string) => {
    switch (trustLevel) {
      case 'high':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'low':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const toggleAsset = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedAssets.size === filteredAssets.length) {
      // Deselect all
      setSelectedAssets(new Set());
    } else {
      // Select all filtered assets
      setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const handleAddAssets = () => {
    const assetsToAdd = allAssets.filter(a => selectedAssets.has(a.id));
    if (onSelectMultiple && assetsToAdd.length > 0) {
      onSelectMultiple(assetsToAdd);
    }
    onClose();
  };

  const allSelected = filteredAssets.length > 0 && selectedAssets.size === filteredAssets.length;
  const someSelected = selectedAssets.size > 0 && selectedAssets.size < filteredAssets.length;

  return (
    <>
      {/* Backdrop - Dimmed/Blurred Background */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border-2">
          {/* Modal Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Select Context Assets</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for products, personas, or trends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Select All Row */}
            {filteredAssets.length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/30 border border-border">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  className={someSelected ? "data-[state=checked]:bg-primary" : ""}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer flex-1"
                >
                  Select All ({filteredAssets.length} assets)
                </label>
              </div>
            )}
          </div>

          {/* Modal Body - Asset List */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredAssets.length > 0 ? (
              <div className="space-y-2">
                {filteredAssets.map((asset) => {
                  const isSelected = selectedAssets.has(asset.id);
                  return (
                    <Card 
                      key={asset.id} 
                      className={`border-2 transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleAsset(asset.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Checkbox Column */}
                          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              id={asset.id}
                              checked={isSelected}
                              onCheckedChange={() => toggleAsset(asset.id)}
                            />
                          </div>

                          {/* Icon */}
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            asset.trustLevel === 'high'
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : asset.trustLevel === 'medium'
                              ? 'bg-blue-100 dark:bg-blue-900/30'
                              : 'bg-orange-100 dark:bg-orange-900/30'
                          }`}>
                            {getAssetIcon(asset.type, asset.trustLevel)}
                          </div>

                          {/* Name & Badge */}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {asset.name}
                            </p>
                            <Badge
                              variant="outline"
                              className={`mt-1.5 ${trustBadgeStyles[asset.trustLevel]} border text-xs inline-flex items-center gap-1`}
                            >
                              {getTrustIcon(asset.trustLevel)}
                              {asset.trustLabel}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              // Empty State
              <div className="text-center py-12">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No assets found matching "{searchQuery}"
                </p>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="p-6 border-t-2 border-border bg-background">
            <div className="flex items-center justify-between">
              {/* Left - Summary */}
              <div>
                <p className="text-sm font-medium">
                  {selectedAssets.size === 0 ? (
                    <span className="text-muted-foreground">No assets selected</span>
                  ) : (
                    <span>
                      {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Can't find what you need?{' '}
                  <button className="text-primary hover:underline">
                    Generate with AI
                  </button>
                </p>
              </div>

              {/* Right - Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddAssets}
                  disabled={selectedAssets.size === 0}
                >
                  Add {selectedAssets.size > 0 ? selectedAssets.size : ''} Asset{selectedAssets.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
