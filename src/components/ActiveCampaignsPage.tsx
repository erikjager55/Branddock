import React, { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { PageCard } from './ui/page-card';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Edit,
  Trash2,
  Megaphone,
  Target,
  Plus,
  Users,
  Shield,
  Tag,
  FileText,
  Image,
  Video,
  Mail,
  Globe,
  Calendar,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  BarChart3,
  Play,
  Eye,
  Search,
  Filter,
  Clock,
  X,
  LayoutGrid,
  List,
  RotateCcw,
  Trash,
  Sparkles
} from 'lucide-react';
import { CampaignSettingsModal } from './CampaignSettingsModal';
import { DeliverableCard } from './campaign-strategy/DeliverableCard';
import { getAllCampaigns, campaignToStrategy } from '../data/mock-campaigns';

interface Deliverable {
  id: string;
  name: string;
  description?: string;
  type: 'document' | 'image' | 'video' | 'email' | 'website' | 'social';
  status: 'completed' | 'in-progress' | 'not-started';
  progress?: number;
  dueDate?: string;
  assignee?: string;
}

interface Strategy {
  id: string;
  name: string;
  type: 'campaign-strategy' | 'brand-refresh' | 'content-strategy';
  status: 'ready' | 'draft' | 'generating';
  assets: {
    brand?: number;
    persona?: number;
    product?: number;
  };
  contextInputs: {
    brand?: { name: string; count: number };
    persona?: { name: string; count: number };
    product?: { name: string; count: number };
  };
  deliverables: Deliverable[];
  modifiedTime: string;
  modifiedBy: string;
  deletedAt?: string;
}

interface ActiveCampaignsPageProps {
  onNavigateToCampaign?: (campaignId: string, tab?: 'configure' | 'result') => void;
}

const typeConfig = {
  'campaign-strategy': {
    icon: Megaphone,
    label: 'Campaign Strategy',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30'
  },
  'brand-refresh': {
    icon: Target,
    label: 'Brand Refresh',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30'
  },
  'content-strategy': {
    icon: Target,
    label: 'Content Strategy',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30'
  }
};

const statusConfig = {
  ready: {
    label: 'Active',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
  },
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
  },
  generating: {
    label: 'Generating...',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
  }
};

const deliverableIcons = {
  document: FileText,
  image: Image,
  video: Video,
  email: Mail,
  website: Globe,
  social: Target
};

export function ActiveCampaignsPage({ onNavigateToCampaign }: ActiveCampaignsPageProps) {
  // Laad strategies vanuit gedeelde data source
  const [strategies, setStrategies] = useState(() => 
    getAllCampaigns().map(campaignToStrategy)
  );
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDeliverableStatus, setSelectedDeliverableStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');

  // Separate active and deleted strategies
  const activeStrategies = useMemo(() => 
    strategies.filter(s => !s.deletedAt),
    [strategies]
  );

  const deletedStrategies = useMemo(() => 
    strategies.filter(s => s.deletedAt),
    [strategies]
  );

  // Current strategies based on view mode
  const currentStrategies = viewMode === 'active' ? activeStrategies : deletedStrategies;

  // Filter strategies
  const filteredStrategies = useMemo(() => {
    return currentStrategies.filter(strategy => {
      const matchesSearch = strategy.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || strategy.type === selectedType;
      const matchesStatus = selectedStatus === 'all' || strategy.status === selectedStatus;
      const matchesDeliverableStatus = 
        selectedDeliverableStatus === 'all' || 
        strategy.deliverables.some(d => d.status === selectedDeliverableStatus);

      return matchesSearch && matchesType && matchesStatus && matchesDeliverableStatus;
    });
  }, [currentStrategies, searchTerm, selectedType, selectedStatus, selectedDeliverableStatus]);

  // Calculate stats for all deliverables across campaigns
  const deliverableStats = useMemo(() => {
    const allDeliverables = filteredStrategies.flatMap(s => s.deliverables);
    const total = allDeliverables.length;
    const completed = allDeliverables.filter(d => d.status === 'completed').length;
    const inProgress = allDeliverables.filter(d => d.status === 'in-progress').length;
    const notStarted = allDeliverables.filter(d => d.status === 'not-started').length;

    return { total, completed, inProgress, notStarted };
  }, [filteredStrategies]);

  const handleReset = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedDeliverableStatus('all');
  };

  const hasActiveFilters = searchTerm || selectedType !== 'all' || selectedStatus !== 'all' || selectedDeliverableStatus !== 'all';

  const handleDelete = (id: string) => {
    setStrategies(strategies.map(s => 
      s.id === id 
        ? { ...s, deletedAt: new Date().toISOString() }
        : s
    ));
  };

  const handleRestore = (id: string) => {
    setStrategies(strategies.map(s => 
      s.id === id 
        ? { ...s, deletedAt: undefined }
        : s
    ));
  };

  const handleSave = (data: { name: string; notes: string; assignee: string }) => {
    if (editingStrategy) {
      setStrategies(strategies.map(s => 
        s.id === editingStrategy.id 
          ? { ...s, name: data.name }
          : s
      ));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-semibold mb-1">Active Campaigns</h1>
                <p className="text-muted-foreground">
                  {filteredStrategies.length} {filteredStrategies.length === 1 ? 'campaign' : 'campaigns'} • {deliverableStats.total} deliverables
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={viewMode === 'trash' ? 'ghost' : 'outline'}
                onClick={() => setViewMode('trash')}
                className="relative"
              >
                <Trash className="h-4 w-4 mr-2" />
                Trash
                {deletedStrategies.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {deletedStrategies.length}
                  </Badge>
                )}
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Strategy
              </Button>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'active' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('active')}
              className="rounded-full"
            >
              Active ({activeStrategies.length})
            </Button>
            <Button
              variant={viewMode === 'trash' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('trash')}
              className="rounded-full"
            >
              Trash ({deletedStrategies.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Deliverable Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Deliverables</p>
                  <p className="text-2xl font-semibold">{deliverableStats.total}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Completed</p>
                  <p className="text-2xl font-semibold">{deliverableStats.completed}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">In Progress</p>
                  <p className="text-2xl font-semibold">{deliverableStats.inProgress}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Not Started</p>
                  <p className="text-2xl font-semibold">{deliverableStats.notStarted}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Circle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-stretch gap-3">
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value)}
            >
              <SelectTrigger className="w-48 h-10">
                <SelectValue placeholder="Type">
                  {selectedType === 'all' ? 'All Types' : typeConfig[selectedType].label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="campaign-strategy">Campaign Strategy</SelectItem>
                <SelectItem value="brand-refresh">Brand Refresh</SelectItem>
                <SelectItem value="content-strategy">Content Strategy</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value)}
            >
              <SelectTrigger className="w-48 h-10">
                <SelectValue placeholder="Status">
                  {selectedStatus === 'all' ? 'All Statuses' : statusConfig[selectedStatus].label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ready">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="generating">Generating...</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={selectedDeliverableStatus}
              onValueChange={(value) => setSelectedDeliverableStatus(value)}
            >
              <SelectTrigger className="w-48 h-10">
                <SelectValue placeholder="Deliverable Status">
                  {selectedDeliverableStatus === 'all' ? 'All Deliverables' : selectedDeliverableStatus}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deliverables</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Campaign Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredStrategies.map((strategy) => {
            const typeInfo = typeConfig[strategy.type];
            const statusInfo = statusConfig[strategy.status];
            const TypeIcon = typeInfo.icon;
            
            // Calculate deliverables progress
            const completedDeliverables = strategy.deliverables.filter(d => d.status === 'completed').length;
            const totalDeliverables = strategy.deliverables.length;
            const progressPercent = totalDeliverables > 0 
              ? Math.round((completedDeliverables / totalDeliverables) * 100) 
              : 0;

            return (
              <Card
                key={strategy.id}
                onClick={() => viewMode === 'active' && onNavigateToCampaign?.(strategy.id, 'result')}
                className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-md p-4"
              >
                {/* Header: Icon + Status Badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-10 w-10 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                    <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
                  </div>
                  <Badge
                    variant="outline"
                    className={`${statusInfo.className} border rounded-full px-3 ${
                      strategy.status === 'generating' ? 'animate-pulse' : ''
                    }`}
                  >
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* Campaign Name with Edit Button */}
                <div className="flex items-start gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors leading-snug">
                      {strategy.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {typeInfo.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {viewMode === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStrategy(strategy);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {viewMode === 'active' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(strategy.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(strategy.id);
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Context Inputs */}
                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-border">
                  {strategy.contextInputs.brand && (
                    <div 
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50" 
                      title={`Brand: ${strategy.contextInputs.brand.name}`}
                    >
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {strategy.contextInputs.brand.count} {strategy.contextInputs.brand.count === 1 ? 'brand' : 'brands'}
                      </span>
                    </div>
                  )}
                  {strategy.contextInputs.persona && (
                    <div 
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50" 
                      title={`Persona: ${strategy.contextInputs.persona.name}`}
                    >
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {strategy.contextInputs.persona.count} {strategy.contextInputs.persona.count === 1 ? 'persona' : 'personas'}
                      </span>
                    </div>
                  )}
                  {strategy.contextInputs.product && (
                    <div 
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50" 
                      title={`Product: ${strategy.contextInputs.product.name}`}
                    >
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {strategy.contextInputs.product.count} {strategy.contextInputs.product.count === 1 ? 'product' : 'products'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Deliverables Section */}
                {strategy.deliverables.length > 0 && (
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Deliverables
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {completedDeliverables}/{totalDeliverables} completed
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {strategy.deliverables.map((deliverable) => (
                        <DeliverableCard
                          key={deliverable.id}
                          deliverable={deliverable}
                          onWorkClick={() => {
                            console.log('Work on deliverable:', deliverable.name);
                          }}
                          onViewClick={() => {
                            console.log('View deliverable:', deliverable.name);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Empty state if no deliverables */}
                {strategy.deliverables.length === 0 && (
                  <div className="py-6 text-center border-2 border-dashed border-border rounded-lg mb-3">
                    <div className="h-8 w-8 rounded-full bg-muted mx-auto mb-2 flex items-center justify-center">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mb-0.5">No deliverables yet</p>
                    <p className="text-xs text-muted-foreground">
                      Add deliverables to this campaign
                    </p>
                  </div>
                )}

                {/* Modified Info */}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Modified {strategy.modifiedTime}
                    </span>
                    <span className="text-foreground font-medium">
                      by {strategy.modifiedBy}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredStrategies.length === 0 && (
          <div className="p-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first strategy to get started
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Strategy
            </Button>
          </div>
        )}
      </div>

      {/* Campaign Settings Modal */}
      {editingStrategy && (
        <CampaignSettingsModal
          isOpen={!!editingStrategy}
          onClose={() => setEditingStrategy(null)}
          campaign={{
            id: editingStrategy.id,
            name: editingStrategy.name,
            notes: '',
            assignee: '1'
          }}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}