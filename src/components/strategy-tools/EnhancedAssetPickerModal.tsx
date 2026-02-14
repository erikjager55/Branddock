import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  X,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Plus
} from 'lucide-react';

interface EnhancedAssetPickerModalProps {
  title: string;
  description?: string;
  items: Array<{ 
    id: string; 
    name: string; 
    subtitle?: string; 
    description?: string;
    isCritical?: boolean; 
    status?: string; 
  }>;
  selected: string[]; 
  onSelect: (ids: string[]) => void; 
  onClose: () => void;
  type?: 'brand-assets' | 'personas' | 'research';
  onAddNew?: () => void; // New prop for adding new items
}

export function EnhancedAssetPickerModal({ 
  title,
  description,
  items,
  selected, 
  onSelect, 
  onClose,
  type = 'brand-assets',
  onAddNew
}: EnhancedAssetPickerModalProps) {
  const [tempSelected, setTempSelected] = useState(selected);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const toggleItem = (id: string) => {
    setTempSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'validated':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'ready-to-validate':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'in-development':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'awaiting-research':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'validated':
        return 'Validated';
      case 'ready-to-validate':
        return 'Ready';
      case 'in-development':
        return 'In Progress';
      case 'awaiting-research':
        return 'Not Started';
      default:
        return status || 'Ready';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'validated':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'ready-to-validate':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'in-development':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800';
      case 'awaiting-research':
        return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
      default:
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
    }
  };

  const getItemIcon = (item: typeof items[0]) => {
    if (type === 'brand-assets') {
      return item.isCritical ? (
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shrink-0">
          <Shield className="h-5 w-5 text-white" />
        </div>
      ) : (
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
      );
    } else if (type === 'personas') {
      return (
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shrink-0">
          <span className="text-white font-semibold text-lg">
            {item.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </span>
        </div>
      );
    } else {
      return (
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
      );
    }
  };

  const getItemDescription = (item: typeof items[0]) => {
    if (item.description) return item.description;
    
    // Generate contextual descriptions
    if (type === 'brand-assets') {
      if (item.subtitle === 'Foundation') return 'Core brand identity and positioning';
      if (item.subtitle === 'Personality') return 'Brand voice and character attributes';
      if (item.subtitle === 'Story') return 'Brand narrative and heritage';
      return 'Strategic brand component';
    } else if (type === 'personas') {
      return item.subtitle || 'Target audience profile';
    } else {
      return item.subtitle || 'Research insights and data';
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter = filterStatus === 'all' || 
                          (filterStatus === 'selected' && tempSelected.includes(item.id)) ||
                          item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Separate critical and non-critical items
  const criticalItems = filteredItems.filter(item => item.isCritical);
  const nonCriticalItems = filteredItems.filter(item => !item.isCritical);

  // Check if item is selectable
  const isSelectable = (item: typeof items[0]) => {
    return item.status !== 'awaiting-research';
  };

  // Get unique statuses for filter
  const availableStatuses = Array.from(new Set(items.map(i => i.status).filter(Boolean)));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-purple-500/5 pb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{title}</CardTitle>
                <Badge variant="outline" className="bg-primary/10">
                  {items.length} Available
                </Badge>
              </div>
              <CardDescription className="text-base">
                {description || 'Select items to inform your campaign strategy'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'selected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('selected')}
              >
                Selected ({tempSelected.length})
              </Button>
              {availableStatuses.map(status => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(status!)}
                  className="hidden sm:inline-flex"
                >
                  {getStatusLabel(status)}
                </Button>
              ))}
            </div>
          </div>

          {/* Selection Summary */}
          {tempSelected.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {tempSelected.length} {tempSelected.length === 1 ? 'item' : 'items'} selected
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTempSelected([])}
                  className="text-xs h-7"
                >
                  Clear All
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 overflow-auto p-6">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No items found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Try adjusting your search or filter to find what you're looking for
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Critical Items Section */}
              {criticalItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="font-semibold text-lg">Essential Items</h3>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
                      Must Complete
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    These are fundamental building blocks required for a comprehensive strategy.
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {criticalItems.map(item => {
                      const selectable = isSelectable(item);
                      const isSelected = tempSelected.includes(item.id);
                      
                      return (
                        <div
                          key={item.id}
                          className={`group relative rounded-xl border-2 transition-all duration-200 ${
                            !selectable
                              ? 'opacity-60 border-red-200 dark:border-red-900/30 bg-gray-50 dark:bg-gray-900/20'
                              : isSelected
                                ? 'border-primary bg-primary/5 shadow-md cursor-pointer'
                                : 'border-red-200 dark:border-red-900/30 hover:border-red-400 dark:hover:border-red-700 hover:shadow-lg cursor-pointer hover:-translate-y-0.5'
                          }`}
                          onClick={() => selectable && toggleItem(item.id)}
                        >
                          <div className="p-5">
                            <div className="flex items-start gap-4">
                              {getItemIcon(item)}
                              
                              <div className="flex-1 min-w-0 pr-8">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1">
                                    <h4 className={`font-semibold mb-1 ${!selectable ? 'text-muted-foreground' : ''}`}>
                                      {item.name}
                                    </h4>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {getItemDescription(item)}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 mt-3">
                                  {item.subtitle && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.subtitle}
                                    </Badge>
                                  )}
                                  {item.status && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${getStatusColor(item.status)}`}
                                    >
                                      {getStatusLabel(item.status)}
                                    </Badge>
                                  )}
                                  {item.isCritical && (
                                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20">
                                      Required
                                    </Badge>
                                  )}
                                </div>

                                {!selectable && (
                                  <div className="mt-4 pt-4 border-t">
                                    <p className="text-xs text-muted-foreground mb-3">
                                      This item needs research before you can use it in your strategy.
                                    </p>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.hash = `#/brand/${item.id}`;
                                        onClose();
                                      }}
                                    >
                                      <ArrowUpRight className="h-4 w-4 mr-2" />
                                      Start Research
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {isSelected && selectable && (
                            <div className="absolute top-3 right-3">
                              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Non-Critical Items Section */}
              {nonCriticalItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="font-semibold text-lg">Additional Items</h3>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                      Optional
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    These items provide additional depth and nuance to your strategy.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {nonCriticalItems.map(item => {
                      const selectable = isSelectable(item);
                      const isSelected = tempSelected.includes(item.id);
                      
                      return (
                        <div
                          key={item.id}
                          className={`group relative rounded-xl border transition-all duration-200 ${
                            !selectable
                              ? 'opacity-60 border-border bg-gray-50 dark:bg-gray-900/20'
                              : isSelected
                                ? 'border-primary bg-primary/5 shadow-md cursor-pointer'
                                : 'border-border hover:border-primary/50 hover:shadow-lg cursor-pointer hover:-translate-y-0.5'
                          }`}
                          onClick={() => selectable && toggleItem(item.id)}
                        >
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              {getItemIcon(item)}
                              
                              <div className="flex-1 min-w-0 pr-6">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1">
                                    <h4 className={`font-semibold text-sm mb-1 ${!selectable ? 'text-muted-foreground' : ''}`}>
                                      {item.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {getItemDescription(item)}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  {item.subtitle && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.subtitle}
                                    </Badge>
                                  )}
                                  {item.status && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${getStatusColor(item.status)}`}
                                    >
                                      {getStatusLabel(item.status)}
                                    </Badge>
                                  )}
                                </div>

                                {!selectable && (
                                  <p className="text-xs text-muted-foreground mt-2 italic">
                                    Complete research to use this item
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {isSelected && selectable && (
                            <div className="absolute top-2 right-2">
                              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                <CheckCircle className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="p-5 border-t bg-muted/30 flex justify-between items-center">
          <div>
            <p className="font-medium">
              {tempSelected.length} {tempSelected.length === 1 ? 'item' : 'items'} selected
            </p>
            <p className="text-sm text-muted-foreground">
              {criticalItems.filter(i => tempSelected.includes(i.id)).length} of {criticalItems.length} required items selected
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} size="lg">
              Cancel
            </Button>
            <Button onClick={() => { onSelect(tempSelected); onClose(); }} size="lg" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Apply Selection
            </Button>
            {onAddNew && (
              <Button
                variant="default"
                size="lg"
                className="gap-2"
                onClick={onAddNew}
              >
                <Plus className="h-4 w-4" />
                Add New
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}