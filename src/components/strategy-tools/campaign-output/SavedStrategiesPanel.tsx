/**
 * COMPONENT: Saved Strategies Panel
 * 
 * Beheer meerdere opgeslagen campagne strategieën
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { ScrollArea } from '../../ui/scroll-area';
import {
  FileText,
  Plus,
  MoreVertical,
  Copy,
  Trash2,
  Download,
  Calendar,
  Target,
  Search,
  ChevronDown,
  CheckCircle,
  Clock,
  Edit2,
  X,
  Check
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';

export interface SavedStrategy {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'generated' | 'approved';
  objective: string;
  timeline: string;
  budget: string;
  config: any; // Full campaign config
  
  // Generation metadata - captured at moment of generation
  generationMetadata?: {
    generatedAt: string;
    usedBrandAssets: Array<{ id: string; title: string; version?: string }>;
    usedPersonas: Array<{ id: string; name: string }>;
    researchCoverageSnapshot: number;
    decisionStatus: 'safe-to-decide' | 'decision-at-risk' | 'do-not-decide';
    decisionRisks: string[];
    totalAssets: number;
    totalPersonas: number;
  };
}

interface SavedStrategiesPanelProps {
  strategies: SavedStrategy[];
  currentStrategyId: string | null;
  onSelectStrategy: (strategyId: string) => void;
  onNewStrategy: () => void;
  onDuplicateStrategy: (strategyId: string) => void;
  onRenameStrategy: (strategyId: string, newName: string) => void;
  onDeleteStrategy: (strategyId: string) => void;
  onExportStrategy: (strategyId: string) => void;
}

export function SavedStrategiesPanel({
  strategies,
  currentStrategyId,
  onSelectStrategy,
  onNewStrategy,
  onDuplicateStrategy,
  onRenameStrategy,
  onDeleteStrategy,
  onExportStrategy
}: SavedStrategiesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const filteredStrategies = strategies.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getObjectiveLabel = (objective: string) => {
    const labels: Record<string, string> = {
      'brand-awareness': 'Brand Awareness',
      'lead-generation': 'Lead Generation',
      'product-launch': 'Product Launch',
      'customer-retention': 'Customer Retention'
    };
    return labels[objective] || objective;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      'generated': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      'draft': Clock,
      'generated': FileText,
      'approved': CheckCircle
    };
    return icons[status as keyof typeof icons] || Clock;
  };

  const handleStartEdit = (strategy: SavedStrategy) => {
    setEditingId(strategy.id);
    setEditingName(strategy.name);
  };

  const handleSaveEdit = (strategyId: string) => {
    if (editingName.trim()) {
      onRenameStrategy(strategyId, editingName.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Mijn Strategieën
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {strategies.length} opgeslagen {strategies.length === 1 ? 'strategie' : 'strategieën'}
            </CardDescription>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search strategies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* New Strategy Button */}
        <Button
          onClick={onNewStrategy}
          className="w-full gap-2"
          variant="default"
        >
          <Plus className="h-4 w-4" />
          New Strategy
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {filteredStrategies.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Geen strategieën gevonden' : 'Nog geen strategieën'}
                </p>
                {!searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={onNewStrategy}
                  >
                    Maak je eerste strategie
                  </Button>
                )}
              </div>
            ) : (
              filteredStrategies.map((strategy) => {
                const StatusIcon = getStatusIcon(strategy.status);
                const isActive = strategy.id === currentStrategyId;
                const isEditing = editingId === strategy.id;

                return (
                  <div
                    key={strategy.id}
                    className={`
                      group relative rounded-lg border p-3 transition-all cursor-pointer
                      ${isActive 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'hover:border-primary/50 hover:bg-muted/50'
                      }
                    `}
                    onClick={() => !isEditing && onSelectStrategy(strategy.id)}
                  >
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r" />
                    )}

                    <div className="flex items-start gap-3">
                      {/* Status Icon */}
                      <div className={`
                        h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0
                        ${getStatusColor(strategy.status)}
                      `}>
                        <StatusIcon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Name */}
                        {isEditing ? (
                          <div className="flex items-center gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(strategy.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              className="h-7 text-sm"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleSaveEdit(strategy.id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <h4 className="font-semibold text-sm mb-1 truncate">
                            {strategy.name}
                          </h4>
                        )}

                        {/* Meta Info */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(strategy.updatedAt).toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {getObjectiveLabel(strategy.objective)}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {strategy.timeline}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {strategy.budget}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onSelectStrategy(strategy.id)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStartEdit(strategy)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDuplicateStrategy(strategy.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onExportStrategy(strategy.id)}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDeleteStrategy(strategy.id)}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Compact version for dropdown/header
export function SavedStrategiesDropdown({
  strategies,
  currentStrategyId,
  onSelectStrategy,
  onNewStrategy,
  onManageStrategies
}: {
  strategies: SavedStrategy[];
  currentStrategyId: string | null;
  onSelectStrategy: (strategyId: string) => void;
  onNewStrategy: () => void;
  onManageStrategies: () => void;
}) {
  const currentStrategy = strategies.find(s => s.id === currentStrategyId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 min-w-[240px] justify-between border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5 shadow-sm"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <FileText className="h-3 w-3 text-white" />
            </div>
            <span className="truncate font-medium">
              {currentStrategy?.name || 'Select Strategy'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px]">
        <div className="p-2">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
            {strategies.length} {strategies.length === 1 ? 'Strategy' : 'Strategies'}
          </p>
          <ScrollArea className="max-h-[300px]">
            {strategies.map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => onSelectStrategy(strategy.id)}
                className={`
                  w-full text-left p-2 rounded hover:bg-muted transition-colors
                  ${strategy.id === currentStrategyId ? 'bg-muted' : ''}
                `}
              >
                <p className="font-medium text-sm truncate">{strategy.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(strategy.updatedAt).toLocaleDateString('nl-NL')}
                </p>
              </button>
            ))}
          </ScrollArea>
        </div>
        <DropdownMenuSeparator />
        <div className="p-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onNewStrategy}
          >
            <Plus className="h-4 w-4" />
            New Strategy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onManageStrategies}
          >
            <FileText className="h-4 w-4" />
            Manage Strategies
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}