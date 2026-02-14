import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Plus, 
  Edit, 
  Eye, 
  BookOpen, 
  Video, 
  Globe, 
  Image, 
  FileText, 
  Headphones,
  FileType,
  GraduationCap,
  ExternalLink, 
  Download, 
  Heart,
  Trash2,
  Search,
  SlidersHorizontal,
  Grid3x3,
  List,
  LayoutList,
  TrendingUp,
  Star,
  Clock,
  Filter
} from 'lucide-react';
import { AddResourceModal } from './knowledge/AddResourceModal';
import { ResourceDetailModal } from './knowledge/ResourceDetailModal';
import { mockKnowledgeResources, mockCollections, KnowledgeResource, Collection } from '../data/knowledge-resources';

type ViewMode = 'grid' | 'list' | 'compact';
type SortOption = 'date-added-desc' | 'date-added-asc' | 'rating-desc' | 'rating-asc' | 'title-asc' | 'title-desc' | 'views-desc';

export function KnowledgeLibrary() {
  // State
  const [resources, setResources] = useState<KnowledgeResource[]>(mockKnowledgeResources);
  const [collections] = useState<Collection[]>(mockCollections);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<KnowledgeResource | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Filters & View
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date-added-desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const typeIcons = {
    book: BookOpen,
    video: Video,
    website: Globe,
    image: Image,
    document: FileText,
    podcast: Headphones,
    article: FileType,
    course: GraduationCap
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'book': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'video': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'website': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'image': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'document': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'podcast': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400';
      case 'article': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400';
      case 'course': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '⯨' : '');
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(resources.map(r => r.category));
    return ['all', ...Array.from(cats)];
  }, [resources]);

  // Filtering logic
  const filteredResources = useMemo(() => {
    let filtered = resources;

    // Type filter (tabs)
    if (activeTab !== 'all' && activeTab !== 'favorites' && activeTab !== 'collections') {
      filtered = filtered.filter(r => r.type.toLowerCase() === activeTab.toLowerCase());
    }

    // Favorites filter
    if (activeTab === 'favorites' || showFavoritesOnly) {
      filtered = filtered.filter(r => r.isFavorite);
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(term) ||
        r.author.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(r => r.difficulty === selectedDifficulty);
    }

    // Sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-added-desc':
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        case 'date-added-asc':
          return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
        case 'rating-desc':
          return b.rating - a.rating;
        case 'rating-asc':
          return a.rating - b.rating;
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'views-desc':
          return (b.views || 0) - (a.views || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [resources, activeTab, searchTerm, selectedCategory, selectedDifficulty, sortBy, showFavoritesOnly]);

  // Handlers
  const handleAddResource = (newResource: Omit<KnowledgeResource, 'id' | 'dateAdded' | 'views' | 'favorites' | 'completions'>) => {
    const resource: KnowledgeResource = {
      ...newResource,
      id: `kr-${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0],
      views: 0,
      favorites: 0,
      completions: 0
    };
    setResources([resource, ...resources]);
  };

  const handleToggleFavorite = (id: string) => {
    setResources(resources.map(r => 
      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
    ));
    if (selectedResource?.id === id) {
      setSelectedResource({ ...selectedResource, isFavorite: !selectedResource.isFavorite });
    }
  };

  const handleDeleteResource = (id: string) => {
    if (confirm('Are you sure you want to delete this resource?')) {
      setResources(resources.filter(r => r.id !== id));
    }
  };

  const handleViewResource = (resource: KnowledgeResource) => {
    // Update view count
    setResources(resources.map(r => 
      r.id === resource.id ? { ...r, views: (r.views || 0) + 1 } : r
    ));
    setSelectedResource(resource);
    setShowDetailModal(true);
  };

  const handleOpenResource = (resource: KnowledgeResource) => {
    window.open(resource.url, '_blank');
  };

  // Stats
  const stats = useMemo(() => ({
    total: resources.length,
    favorites: resources.filter(r => r.isFavorite).length,
    byType: Object.keys(typeIcons).reduce((acc, type) => {
      acc[type] = resources.filter(r => r.type === type).length;
      return acc;
    }, {} as Record<string, number>)
  }), [resources]);

  return (
    <div className="h-full overflow-auto">
      {/* Sticky Header - CLEAN */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold mb-1">Knowledge Library</h1>
                <p className="text-muted-foreground">
                  {stats.total} resources • {stats.favorites} favorites
                </p>
              </div>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Resource
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Search & Filters Bar - Moved to Content */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources by title, author, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-added-desc">📅 Newest First</SelectItem>
              <SelectItem value="date-added-asc">📅 Oldest First</SelectItem>
              <SelectItem value="rating-desc">⭐ Highest Rated</SelectItem>
              <SelectItem value="rating-asc">⭐ Lowest Rated</SelectItem>
              <SelectItem value="title-asc">🔤 A to Z</SelectItem>
              <SelectItem value="title-desc">🔤 Z to A</SelectItem>
              <SelectItem value="views-desc">👁️ Most Viewed</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showAdvancedFilters ? "default" : "outline"}
            size="icon"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>

          <div className="flex gap-1 border border-border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('compact')}
              className="h-8 w-8 p-0"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-4 p-4 rounded-lg border border-border bg-muted/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Advanced Filters:</span>
              </div>
              
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">🟢 Beginner</SelectItem>
                  <SelectItem value="intermediate">🟡 Intermediate</SelectItem>
                  <SelectItem value="advanced">🔴 Advanced</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="gap-2"
              >
                <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                Favorites Only
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                  setShowFavoritesOnly(false);
                  setSearchTerm('');
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="book">
              📚 Books ({stats.byType.book || 0})
            </TabsTrigger>
            <TabsTrigger value="video">
              🎥 Videos ({stats.byType.video || 0})
            </TabsTrigger>
            <TabsTrigger value="article">
              📄 Articles ({stats.byType.article || 0})
            </TabsTrigger>
            <TabsTrigger value="course">
              🎓 Courses ({stats.byType.course || 0})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Heart className="h-3 w-3" />
              Favorites ({stats.favorites})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredResources.length === 0 ? (
              // Empty State
              <div className="text-center py-16">
                <div className="h-20 w-20 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No resources found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all'
                    ? 'Try adjusting your filters or search term'
                    : 'Get started by adding your first resource'}
                </p>
                {!searchTerm && selectedCategory === 'all' && (
                  <Button onClick={() => setShowAddModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Resource
                  </Button>
                )}
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                  : viewMode === 'list'
                  ? 'space-y-4'
                  : 'space-y-2'
              }>
                {filteredResources.map((resource) => {
                  const Icon = typeIcons[resource.type];
                  
                  // Grid View
                  if (viewMode === 'grid') {
                    return (
                      <Card key={resource.id} className="rounded-xl border-border/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
                                <CardDescription className="mt-1">
                                  {resource.author}
                                </CardDescription>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleFavorite(resource.id)}
                              className="h-8 w-8 p-0 flex-shrink-0"
                            >
                              <Heart className={`h-4 w-4 ${resource.isFavorite ? 'fill-current text-red-500' : ''}`} />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {resource.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={`${getTypeColor(resource.type)} border rounded-md px-2 py-0.5`} variant="secondary">
                                {resource.type}
                              </Badge>
                              {resource.difficulty && (
                                <Badge className={`${getDifficultyColor(resource.difficulty)} border rounded-md px-2 py-0.5`} variant="secondary">
                                  {resource.difficulty}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-yellow-500">
                                {renderStars(resource.rating)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {resource.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          {resource.tags && resource.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {resource.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs rounded-md">
                                  {tag}
                                </Badge>
                              ))}
                              {resource.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs rounded-md">
                                  +{resource.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t border-border/50">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {resource.estimatedDuration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {resource.estimatedDuration}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {resource.views || 0}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleViewResource(resource)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {resource.type === 'website' ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleOpenResource(resource)}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleOpenResource(resource)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 hover:text-destructive"
                                onClick={() => handleDeleteResource(resource.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  // List View
                  if (viewMode === 'list') {
                    return (
                      <Card key={resource.id} className="rounded-xl border-border/50 hover:shadow-sm transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="h-8 w-8 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1">
                                  <h3 className="font-medium text-lg mb-1">{resource.title}</h3>
                                  <p className="text-sm text-muted-foreground">{resource.author}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-yellow-500">
                                      {renderStars(resource.rating)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {resource.rating.toFixed(1)}
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleFavorite(resource.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Heart className={`h-4 w-4 ${resource.isFavorite ? 'fill-current text-red-500' : ''}`} />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {resource.description}
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className={`${getTypeColor(resource.type)} border rounded-md px-2 py-0.5`} variant="secondary">
                                    {resource.type}
                                  </Badge>
                                  {resource.difficulty && (
                                    <Badge className={`${getDifficultyColor(resource.difficulty)} border rounded-md px-2 py-0.5`} variant="secondary">
                                      {resource.difficulty}
                                    </Badge>
                                  )}
                                  <span className="text-sm text-muted-foreground">{resource.category}</span>
                                  {resource.estimatedDuration && (
                                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {resource.estimatedDuration}
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleViewResource(resource)}
                                    className="gap-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleOpenResource(resource)}
                                    className="gap-2"
                                  >
                                    {resource.type === 'website' ? (
                                      <>
                                        <ExternalLink className="h-4 w-4" />
                                        Open
                                      </>
                                    ) : (
                                      <>
                                        <Download className="h-4 w-4" />
                                        Download
                                      </>
                                    )}
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeleteResource(resource.id)}
                                    className="h-9 w-9 p-0 hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  // Compact View
                  return (
                    <div key={resource.id} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{resource.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">{resource.author}</p>
                      </div>
                      <Badge className={`${getTypeColor(resource.type)} flex-shrink-0`} variant="secondary">
                        {resource.type}
                      </Badge>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-sm text-yellow-500">{renderStars(resource.rating)}</span>
                        <span className="text-xs text-muted-foreground">{resource.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFavorite(resource.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Heart className={`h-4 w-4 ${resource.isFavorite ? 'fill-current text-red-500' : ''}`} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewResource(resource)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenResource(resource)}
                          className="h-8 w-8 p-0"
                        >
                          {resource.type === 'website' ? (
                            <ExternalLink className="h-4 w-4" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Collections Preview (if on favorites tab) */}
        {activeTab === 'favorites' && collections.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-6">Your Collections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {collections.map((collection) => (
                <Card key={collection.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: collection.color + '20', color: collection.color }}
                      >
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{collection.name}</CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {collection.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {collection.resourceIds.length} resources
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {collection.type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddResourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddResource}
      />
      
      {selectedResource && (
        <ResourceDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedResource(null);
          }}
          resource={selectedResource}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </div>
  );
}