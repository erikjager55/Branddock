import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { BookOpen, Video, Globe, Image, FileText, Headphones, FileType, GraduationCap, X, Plus, Sparkles, Link2, Upload, File, CheckCircle2 } from 'lucide-react';
import { KnowledgeResource } from '../../data/knowledge-resources';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (resource: Omit<KnowledgeResource, 'id' | 'dateAdded' | 'views' | 'favorites' | 'completions'>) => void;
  initialType?: KnowledgeResource['type'];
}

export function AddResourceModal({ isOpen, onClose, onAdd, initialType }: AddResourceModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'import' | 'upload'>('manual');
  const [currentTag, setCurrentTag] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manual entry form
  const [manualResource, setManualResource] = useState({
    type: initialType || 'book' as KnowledgeResource['type'],
    title: '',
    description: '',
    author: '',
    category: '',
    url: '',
    tags: [] as string[],
    difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    language: 'en',
    estimatedDuration: '',
    format: '',
    fileSize: '',
    isbn: '',
    pageCount: undefined as number | undefined,
    publicationDate: '',
    rating: 4.0,
    status: 'available' as const
  });

  // URL import
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // File upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const categories = [
    'Brand Strategy',
    'Marketing',
    'Design',
    'Technology',
    'User Experience',
    'Psychology',
    'Business',
    'Trends',
    'Research Methods',
    'Analytics'
  ];

  const handleAddTag = () => {
    if (currentTag.trim() && !manualResource.tags.includes(currentTag.trim())) {
      setManualResource({
        ...manualResource,
        tags: [...manualResource.tags, currentTag.trim()]
      });
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setManualResource({
      ...manualResource,
      tags: manualResource.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmitManual = () => {
    // Validation
    if (!manualResource.title || !manualResource.author || !manualResource.category || !manualResource.url) {
      alert('Please fill in all required fields');
      return;
    }

    // Create resource object
    const newResource: Omit<KnowledgeResource, 'id' | 'dateAdded' | 'views' | 'favorites' | 'completions'> = {
      type: manualResource.type,
      title: manualResource.title,
      description: manualResource.description,
      author: manualResource.author,
      category: manualResource.category,
      url: manualResource.url,
      tags: manualResource.tags,
      difficulty: manualResource.difficulty,
      language: manualResource.language,
      estimatedDuration: manualResource.estimatedDuration || undefined,
      format: manualResource.format || undefined,
      fileSize: manualResource.fileSize || undefined,
      isbn: manualResource.isbn || undefined,
      pageCount: manualResource.pageCount,
      publicationDate: manualResource.publicationDate || undefined,
      rating: manualResource.rating,
      reviewCount: 0,
      status: manualResource.status
    };

    onAdd(newResource);
    handleClose();
  };

  const handleImportFromUrl = async () => {
    if (!importUrl) {
      alert('Please enter a URL');
      return;
    }

    setIsImporting(true);
    
    // Simulate metadata fetching
    setTimeout(() => {
      // Detect type from URL
      let detectedType: KnowledgeResource['type'] = 'website';
      if (importUrl.includes('youtube.com') || importUrl.includes('vimeo.com')) {
        detectedType = 'video';
      } else if (importUrl.includes('medium.com') || importUrl.includes('substack.com')) {
        detectedType = 'article';
      } else if (importUrl.includes('amazon.com') && importUrl.includes('books')) {
        detectedType = 'book';
      } else if (importUrl.includes('coursera.org') || importUrl.includes('udemy.com')) {
        detectedType = 'course';
      }

      // Mock fetched metadata
      setManualResource({
        ...manualResource,
        type: detectedType,
        title: 'Imported: ' + importUrl.split('/').pop()?.substring(0, 50) || 'Untitled',
        description: 'Resource imported from URL. Please review and update details.',
        url: importUrl
      });

      setIsImporting(false);
      setActiveTab('manual');
      alert('Metadata imported! Please review and complete the details.');
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    // Get file extension and type
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    // Detect resource type
    let detectedType: KnowledgeResource['type'] = 'document';
    let detectedFormat = fileExtension.toUpperCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(fileExtension)) {
      detectedType = 'image';
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(fileExtension)) {
      detectedType = 'video';
    } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(fileExtension)) {
      detectedType = 'podcast';
    }

    setUploadedFile(file);
    
    // Pre-fill some metadata
    setManualResource({
      ...manualResource,
      type: detectedType,
      title: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
      format: detectedFormat,
      fileSize: fileSize,
      url: `/uploads/${fileName}` // Mock upload path
    });
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
    setIsDragging(false);
  };

  const handleProcessUpload = async () => {
    if (!uploadedFile) {
      alert('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    
    // Simulate file upload
    setTimeout(() => {
      // Mock fetched metadata
      setManualResource({
        ...manualResource,
        type: 'document',
        title: 'Uploaded: ' + uploadedFile.name.substring(0, 50) || 'Untitled',
        description: 'Resource uploaded from file. Please review and update details.',
        url: 'https://example.com/uploaded/' + uploadedFile.name
      });

      setIsUploading(false);
      setActiveTab('manual');
      alert('File uploaded! Please review and complete the details.');
    }, 1500);
  };

  const handleClose = () => {
    // Reset form
    setManualResource({
      type: 'book',
      title: '',
      description: '',
      author: '',
      category: '',
      url: '',
      tags: [],
      difficulty: 'intermediate',
      language: 'en',
      estimatedDuration: '',
      format: '',
      fileSize: '',
      isbn: '',
      pageCount: undefined,
      publicationDate: '',
      rating: 4.0,
      status: 'available'
    });
    setImportUrl('');
    setCurrentTag('');
    setActiveTab('manual');
    onClose();
  };

  const TypeIcon = typeIcons[manualResource.type];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            Add Knowledge Resource
          </DialogTitle>
          <DialogDescription>
            Add a new resource to your knowledge library manually or import from URL
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'import' | 'upload')} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="gap-2">
              <FileText className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Link2 className="h-4 w-4" />
              Import from URL
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload File
            </TabsTrigger>
          </TabsList>

          {/* IMPORT TAB */}
          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Smart Import</h3>
                  <p className="text-sm text-muted-foreground">
                    Paste a URL and we'll automatically fetch metadata like title, author, and description.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-url">Resource URL *</Label>
              <div className="flex gap-2">
                <Input
                  id="import-url"
                  placeholder="https://example.com/resource"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
                <Button 
                  onClick={handleImportFromUrl} 
                  disabled={isImporting || !importUrl}
                  className="gap-2"
                >
                  {isImporting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Import
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supported: YouTube, Vimeo, Medium, Substack, Amazon Books, Coursera, Udemy, and more
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Paste the URL of your resource</li>
                <li>We'll detect the type and fetch metadata</li>
                <li>Review and complete any missing details</li>
                <li>Save to your library</li>
              </ol>
            </div>
          </TabsContent>

          {/* UPLOAD TAB */}
          <TabsContent value="upload" className="space-y-4 mt-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">File Upload</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload documents, images, videos, or audio files. We'll automatically detect the type and extract metadata.
                  </p>
                </div>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div className="space-y-2">
              <Label htmlFor="upload-file">Drop your file here</Label>
              <div
                className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer
                  ${isDragging 
                    ? 'border-primary bg-primary/5 scale-[1.02]' 
                    : uploadedFile
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50'
                  }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-8 text-center">
                  {uploadedFile ? (
                    // File selected state
                    <div className="space-y-3">
                      <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-lg mb-1">{uploadedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • {uploadedFile.type || 'Unknown type'}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <File className="h-3 w-3" />
                          {uploadedFile.name.split('.').pop()?.toUpperCase()}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFile(null);
                          }}
                          className="gap-2"
                        >
                          <X className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Empty state
                    <div className="space-y-3">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-lg mb-1">
                          {isDragging ? 'Drop file here' : 'Drag & drop your file'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          or click to browse from your computer
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <Badge variant="secondary" className="text-xs">PDF</Badge>
                        <Badge variant="secondary" className="text-xs">DOCX</Badge>
                        <Badge variant="secondary" className="text-xs">PPTX</Badge>
                        <Badge variant="secondary" className="text-xs">MP4</Badge>
                        <Badge variant="secondary" className="text-xs">JPG</Badge>
                        <Badge variant="secondary" className="text-xs">PNG</Badge>
                        <Badge variant="secondary" className="text-xs">MP3</Badge>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id="upload-file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.mp4,.avi,.mov,.mp3,.wav,.jpg,.jpeg,.png,.gif,.svg"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 50MB • Supported formats: Documents, Images, Videos, Audio
              </p>
            </div>

            {/* File Info Preview */}
            {uploadedFile && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <h4 className="font-medium text-sm">Detected Metadata</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">File Name</p>
                    <p className="font-medium truncate">{uploadedFile.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">File Size</p>
                    <p className="font-medium">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">File Type</p>
                    <p className="font-medium">{uploadedFile.type || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Extension</p>
                    <p className="font-medium uppercase">{uploadedFile.name.split('.').pop()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Button */}
            {uploadedFile && (
              <Button
                onClick={handleProcessUpload}
                disabled={isUploading}
                className="w-full gap-2"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing file...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Process & Continue
                  </>
                )}
              </Button>
            )}

            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Drag & drop or select your file</li>
                <li>We'll automatically detect the file type and extract metadata</li>
                <li>Review and complete any missing details in the form</li>
                <li>Save to your knowledge library</li>
              </ol>
            </div>
          </TabsContent>

          {/* MANUAL TAB */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            {/* Resource Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Resource Type *</Label>
              <Select value={manualResource.type} onValueChange={(v) => setManualResource({ ...manualResource, type: v as KnowledgeResource['type'] })}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeIcons).map(([type, Icon]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="capitalize">{type}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title & Author */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Resource title"
                  value={manualResource.title}
                  onChange={(e) => setManualResource({ ...manualResource, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author/Source *</Label>
                <Input
                  id="author"
                  placeholder="Author or creator"
                  value={manualResource.author}
                  onChange={(e) => setManualResource({ ...manualResource, author: e.target.value })}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the resource"
                rows={3}
                value={manualResource.description}
                onChange={(e) => setManualResource({ ...manualResource, description: e.target.value })}
              />
            </div>

            {/* Category & Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={manualResource.category} onValueChange={(v) => setManualResource({ ...manualResource, category: v })}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={manualResource.difficulty} onValueChange={(v) => setManualResource({ ...manualResource, difficulty: v as any })}>
                  <SelectTrigger id="difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">🟢 Beginner</SelectItem>
                    <SelectItem value="intermediate">🟡 Intermediate</SelectItem>
                    <SelectItem value="advanced">🔴 Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url">URL or File Path *</Label>
              <Input
                id="url"
                placeholder="https://... or /path/to/file"
                value={manualResource.url}
                onChange={(e) => setManualResource({ ...manualResource, url: e.target.value })}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add a tag and press Enter"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {manualResource.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {manualResource.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Metadata (conditional based on type) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Estimated Duration</Label>
                <Input
                  id="duration"
                  placeholder="e.g., 45 minutes, 6 hours"
                  value={manualResource.estimatedDuration}
                  onChange={(e) => setManualResource({ ...manualResource, estimatedDuration: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pubDate">Publication Date</Label>
                <Input
                  id="pubDate"
                  type="date"
                  value={manualResource.publicationDate}
                  onChange={(e) => setManualResource({ ...manualResource, publicationDate: e.target.value })}
                />
              </div>
            </div>

            {/* Book specific */}
            {manualResource.type === 'book' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input
                    id="isbn"
                    placeholder="978-1234567890"
                    value={manualResource.isbn}
                    onChange={(e) => setManualResource({ ...manualResource, isbn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pages">Page Count</Label>
                  <Input
                    id="pages"
                    type="number"
                    placeholder="320"
                    value={manualResource.pageCount || ''}
                    onChange={(e) => setManualResource({ ...manualResource, pageCount: parseInt(e.target.value) || undefined })}
                  />
                </div>
              </div>
            )}

            {/* Document/Video specific */}
            {(manualResource.type === 'document' || manualResource.type === 'video') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                  <Input
                    id="format"
                    placeholder="e.g., PDF, MP4"
                    value={manualResource.format}
                    onChange={(e) => setManualResource({ ...manualResource, format: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fileSize">File Size</Label>
                  <Input
                    id="fileSize"
                    placeholder="e.g., 4.2 MB"
                    value={manualResource.fileSize}
                    onChange={(e) => setManualResource({ ...manualResource, fileSize: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Rating */}
            <div className="space-y-2">
              <Label htmlFor="rating">Initial Rating ({manualResource.rating.toFixed(1)})</Label>
              <input
                id="rating"
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={manualResource.rating}
                onChange={(e) => setManualResource({ ...manualResource, rating: parseFloat(e.target.value) })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Your initial quality assessment of this resource
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TypeIcon className="h-4 w-4" />
            <span className="capitalize">{manualResource.type}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmitManual} disabled={activeTab === 'import' || activeTab === 'upload'}>
              Add Resource
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}