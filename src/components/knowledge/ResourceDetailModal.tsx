import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { 
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
  BookmarkPlus,
  Share2,
  Eye,
  Calendar,
  User,
  Tag,
  BarChart3,
  Sparkles,
  TrendingUp,
  Users,
  Package
} from 'lucide-react';
import { KnowledgeResource } from '../../data/knowledge-resources';
import { mockTrends } from '../../data/mock-trends';

interface ResourceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: KnowledgeResource;
  onToggleFavorite: (id: string) => void;
  onUpdateProgress?: (id: string, progress: number) => void;
}

export function ResourceDetailModal({ 
  isOpen, 
  onClose, 
  resource,
  onToggleFavorite,
  onUpdateProgress
}: ResourceDetailModalProps) {
  const [personalNotes, setPersonalNotes] = useState(resource.personalNotes || '');
  const [activeTab, setActiveTab] = useState('overview');

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

  const TypeIcon = typeIcons[resource.type];

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    advanced: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`text-lg ${i < full ? 'text-yellow-500' : 'text-gray-300'}`}>
            {i < full ? '★' : hasHalf && i === full ? '⯨' : '☆'}
          </span>
        ))}
      </div>
    );
  };

  const handleOpenResource = () => {
    window.open(resource.url, '_blank');
  };

  const handleSaveNotes = () => {
    // In real app, this would save to backend
    alert('Notes saved successfully!');
  };

  // Get related trends
  const relatedTrends = resource.relatedTrends 
    ? mockTrends.filter(t => resource.relatedTrends?.includes(t.id))
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TypeIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-2xl mb-1">{resource.title}</DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{resource.author}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant={resource.isFavorite ? "default" : "outline"}
                size="sm"
                onClick={() => onToggleFavorite(resource.id)}
                className="gap-2"
              >
                <Heart className={`h-4 w-4 ${resource.isFavorite ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="outline" size="sm">
                <BookmarkPlus className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {renderStars(resource.rating)}
            </div>
            <p className="text-xs text-muted-foreground">
              {resource.rating.toFixed(1)} ({resource.reviewCount} reviews)
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{resource.views?.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground">Views</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{resource.favorites}</span>
            </div>
            <p className="text-xs text-muted-foreground">Favorites</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{resource.completions}</span>
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="notes">My Notes</TabsTrigger>
            <TabsTrigger value="related">Related</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Description */}
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-muted-foreground">{resource.description}</p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium">{resource.category}</span>
                  </div>
                  {resource.difficulty && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Difficulty:</span>
                      <Badge className={difficultyColors[resource.difficulty]} variant="secondary">
                        {resource.difficulty}
                      </Badge>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language:</span>
                    <span className="font-medium uppercase">{resource.language}</span>
                  </div>
                  {resource.estimatedDuration && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{resource.estimatedDuration}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Publication</h4>
                <div className="space-y-2 text-sm">
                  {resource.publicationDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Published:</span>
                      <span className="font-medium">{resource.publicationDate}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Added:</span>
                    <span className="font-medium">{resource.dateAdded}</span>
                  </div>
                  {resource.format && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Format:</span>
                      <span className="font-medium">{resource.format}</span>
                    </div>
                  )}
                  {resource.fileSize && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">File Size:</span>
                      <span className="font-medium">{resource.fileSize}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            {resource.tags && resource.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {resource.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Progress */}
            {resource.readingProgress !== undefined && (
              <div>
                <h4 className="text-sm font-medium mb-2">Your Progress</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-medium">{resource.readingProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${resource.readingProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* CONTENT TAB */}
          <TabsContent value="content" className="space-y-4 mt-4">
            {/* AI Summary */}
            {resource.aiSummary && (
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      AI Summary
                      <Badge variant="secondary" className="text-xs">Generated</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">{resource.aiSummary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Key Takeaways */}
            {resource.aiKeyTakeaways && resource.aiKeyTakeaways.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Key Takeaways</h3>
                <div className="space-y-2">
                  {resource.aiKeyTakeaways.map((takeaway, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-medium text-primary">
                        {index + 1}
                      </div>
                      <p className="text-sm flex-1">{takeaway}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Book specific info */}
            {resource.type === 'book' && (
              <div className="grid grid-cols-2 gap-4">
                {resource.isbn && (
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground mb-1">ISBN</p>
                    <p className="font-mono text-sm">{resource.isbn}</p>
                  </div>
                )}
                {resource.pageCount && (
                  <div className="p-4 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground mb-1">Pages</p>
                    <p className="font-medium">{resource.pageCount}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* NOTES TAB */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            <div>
              <h3 className="font-medium mb-2">Personal Notes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Keep track of your thoughts, highlights, and key insights from this resource.
              </p>
              <Textarea
                placeholder="Add your notes here..."
                rows={10}
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                className="font-mono text-sm"
              />
              <div className="flex justify-end mt-2">
                <Button onClick={handleSaveNotes} size="sm">
                  Save Notes
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* RELATED TAB */}
          <TabsContent value="related" className="space-y-4 mt-4">
            {/* Related Trends */}
            {relatedTrends.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Related Trends
                </h3>
                <div className="space-y-2">
                  {relatedTrends.map((trend) => (
                    <div key={trend.id} className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{trend.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">{trend.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {trend.category}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Personas */}
            {resource.relatedPersonas && resource.relatedPersonas.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Recommended for Personas
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {resource.relatedPersonas.map((personaId) => (
                    <div key={personaId} className="p-3 rounded-lg border border-border">
                      <p className="text-sm font-medium">{personaId}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Resources */}
            {resource.relatedResources && resource.relatedResources.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Similar Resources
                </h3>
                <p className="text-sm text-muted-foreground">
                  {resource.relatedResources.length} related resources found
                </p>
              </div>
            )}

            {!relatedTrends.length && !resource.relatedPersonas?.length && !resource.relatedResources?.length && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No related items found yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Badge variant="outline" className="gap-1">
            <TypeIcon className="h-3 w-3" />
            <span className="capitalize">{resource.type}</span>
          </Badge>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {resource.type === 'website' ? (
              <Button onClick={handleOpenResource} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Resource
              </Button>
            ) : (
              <Button onClick={handleOpenResource} className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
