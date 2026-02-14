import React, { useState } from 'react';
import { useTemplates } from '../../contexts';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Search, Star, TrendingUp, Bookmark, BookmarkCheck, 
  Play, Clock, Users, Download, Filter, Grid, List 
} from 'lucide-react';
import { CampaignTemplate, TemplateCategory } from '../../types/templates';
import { formatDistanceToNow } from 'date-fns';

export function TemplateLibraryPage({ onSelectTemplate }: { onSelectTemplate?: (template: CampaignTemplate) => void }) {
  const { templates, savedTemplates, featuredTemplates, popularTemplates, saveTemplate, unsaveTemplate } = useTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const isSaved = (templateId: string) => savedTemplates.some(st => st.templateId === templateId);

  const categories: { value: TemplateCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Templates' },
    { value: 'product-launch', label: 'Product Launch' },
    { value: 'brand-awareness', label: 'Brand Awareness' },
    { value: 'lead-generation', label: 'Lead Generation' },
    { value: 'seasonal-campaign', label: 'Seasonal' },
    { value: 'content-marketing', label: 'Content Marketing' }
  ];

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Template Library</h1>
            <p className="text-muted-foreground">
              Pre-built campaign templates to accelerate your strategy work
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="px-4 py-2 border border-border rounded-md bg-background"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All ({templates.length})</TabsTrigger>
            <TabsTrigger value="featured" className="gap-2">
              <Star className="h-3 w-3" />
              Featured ({featuredTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="popular" className="gap-2">
              <TrendingUp className="h-3 w-3" />
              Popular ({popularTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Bookmark className="h-3 w-3" />
              Saved ({savedTemplates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <TemplateGrid 
              templates={filteredTemplates} 
              viewMode={viewMode}
              isSaved={isSaved}
              onSave={saveTemplate}
              onUnsave={unsaveTemplate}
              onSelect={onSelectTemplate}
            />
          </TabsContent>

          <TabsContent value="featured" className="space-y-4">
            <TemplateGrid 
              templates={featuredTemplates.filter(t => 
                searchQuery ? t.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
              )} 
              viewMode={viewMode}
              isSaved={isSaved}
              onSave={saveTemplate}
              onUnsave={unsaveTemplate}
              onSelect={onSelectTemplate}
            />
          </TabsContent>

          <TabsContent value="popular" className="space-y-4">
            <TemplateGrid 
              templates={popularTemplates.filter(t => 
                searchQuery ? t.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
              )} 
              viewMode={viewMode}
              isSaved={isSaved}
              onSave={saveTemplate}
              onUnsave={unsaveTemplate}
              onSelect={onSelectTemplate}
            />
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            <TemplateGrid 
              templates={templates.filter(t => isSaved(t.id))} 
              viewMode={viewMode}
              isSaved={isSaved}
              onSave={saveTemplate}
              onUnsave={unsaveTemplate}
              onSelect={onSelectTemplate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface TemplateGridProps {
  templates: CampaignTemplate[];
  viewMode: 'grid' | 'list';
  isSaved: (id: string) => boolean;
  onSave: (id: string) => void;
  onUnsave: (id: string) => void;
  onSelect?: (template: CampaignTemplate) => void;
}

function TemplateGrid({ templates, viewMode, isSaved, onSave, onUnsave, onSelect }: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Filter className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>No templates found</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {templates.map(template => (
          <TemplateListItem
            key={template.id}
            template={template}
            isSaved={isSaved(template.id)}
            onSave={() => onSave(template.id)}
            onUnsave={() => onUnsave(template.id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          isSaved={isSaved(template.id)}
          onSave={() => onSave(template.id)}
          onUnsave={() => onUnsave(template.id)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function TemplateCard({ template, isSaved, onSave, onUnsave, onSelect }: {
  template: CampaignTemplate;
  isSaved: boolean;
  onSave: () => void;
  onUnsave: () => void;
  onSelect?: (template: CampaignTemplate) => void;
}) {
  const difficultyColor = {
    beginner: 'text-green-600',
    intermediate: 'text-yellow-600',
    advanced: 'text-red-600'
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      {template.thumbnail && (
        <div className="h-40 overflow-hidden bg-muted">
          <img 
            src={template.thumbnail} 
            alt={template.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{template.name}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            onClick={isSaved ? onUnsave : onSave}
          >
            {isSaved ? (
              <BookmarkCheck className="h-4 w-4 fill-primary text-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription className="line-clamp-2">{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {template.industries.slice(0, 2).map(industry => (
            <Badge key={industry} variant="outline" className="text-xs capitalize">
              {industry}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {template.estimatedTime}
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {template.usageCount}
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {template.rating}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="secondary" className={`text-xs ${difficultyColor[template.difficulty]}`}>
            {template.difficulty}
          </Badge>
          {template.price === 0 ? (
            <Badge variant="outline" className="text-xs">Free</Badge>
          ) : (
            <Badge className="text-xs">${template.price}</Badge>
          )}
        </div>

        <Button 
          className="w-full gap-2" 
          onClick={() => onSelect?.(template)}
        >
          <Play className="h-4 w-4" />
          Use Template
        </Button>
      </CardContent>
    </Card>
  );
}

function TemplateListItem({ template, isSaved, onSave, onUnsave, onSelect }: {
  template: CampaignTemplate;
  isSaved: boolean;
  onSave: () => void;
  onUnsave: () => void;
  onSelect?: (template: CampaignTemplate) => void;
}) {
  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {template.thumbnail && (
            <img 
              src={template.thumbnail} 
              alt={template.name} 
              className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
            />
          )}
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold">{template.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-1">{template.description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={isSaved ? onUnsave : onSave}
              >
                {isSaved ? (
                  <BookmarkCheck className="h-4 w-4 fill-primary text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {template.estimatedTime}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {template.usageCount} uses
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {template.rating}
              </div>
              <Badge variant="secondary" className="capitalize">
                {template.difficulty}
              </Badge>
            </div>
          </div>

          <Button onClick={() => onSelect?.(template)} className="gap-2">
            <Play className="h-4 w-4" />
            Use Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}