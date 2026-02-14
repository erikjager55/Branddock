import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  X,
  Plus,
  Database,
  TrendingUp,
  Sparkles,
  ExternalLink,
  CheckCircle,
  ArrowRight,
  Building2,
  Clock,
  Tag,
  AlertCircle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface AddTrendModalProps {
  onClose: () => void;
  onAddTrend: (trend: any) => void;
}

// Research-backed trend databases
const trendDatabases = [
  {
    id: 'wgsn',
    name: 'WGSN',
    description: 'Global trend forecasting and consumer insights',
    logo: '🎨',
    categories: ['Fashion', 'Beauty', 'Lifestyle', 'Design', 'Consumer'],
    pricing: 'Enterprise',
    features: ['18-month forecasts', 'Color trends', 'Consumer behavior', 'Market intelligence'],
    url: 'https://www.wgsn.com'
  },
  {
    id: 'mintel',
    name: 'Mintel',
    description: 'Consumer market research and competitive intelligence',
    logo: '📊',
    categories: ['CPG', 'Retail', 'Food & Drink', 'Beauty', 'Finance'],
    pricing: 'Custom',
    features: ['Market size data', 'Product launches', 'Consumer surveys', 'Trend analysis'],
    url: 'https://www.mintel.com'
  },
  {
    id: 'euromonitor',
    name: 'Euromonitor',
    description: 'Global market research and business intelligence',
    logo: '🌍',
    categories: ['Consumer', 'Industrial', 'Technology', 'Services'],
    pricing: 'Custom',
    features: ['Market forecasts', 'Company profiles', 'Country analysis', 'Industry trends'],
    url: 'https://www.euromonitor.com'
  },
  {
    id: 'stylus',
    name: 'Stylus',
    description: 'Global trend intelligence and innovation platform',
    logo: '✨',
    categories: ['Innovation', 'Culture', 'Design', 'Technology', 'Retail'],
    pricing: 'Subscription',
    features: ['Cultural insights', 'Innovation tracking', 'Trend reports', 'Expert analysis'],
    url: 'https://www.stylus.com'
  },
  {
    id: 'trendhunter',
    name: 'TrendHunter',
    description: 'World\'s largest trend community and innovation platform',
    logo: '🚀',
    categories: ['Technology', 'Business', 'Culture', 'Marketing', 'Design'],
    pricing: 'Freemium',
    features: ['Trend reports', 'Innovation database', 'Custom research', 'AI trend tracking'],
    url: 'https://www.trendhunter.com'
  },
  {
    id: 'gartner',
    name: 'Gartner',
    description: 'Technology research and advisory company',
    logo: '💼',
    categories: ['Technology', 'IT', 'Digital', 'Data', 'Security'],
    pricing: 'Enterprise',
    features: ['Tech forecasts', 'Hype cycles', 'Magic quadrants', 'Research reports'],
    url: 'https://www.gartner.com'
  },
  {
    id: 'trendwatching',
    name: 'TrendWatching',
    description: 'Consumer trend insights and innovation intelligence',
    logo: '👁️',
    categories: ['Consumer', 'Innovation', 'Retail', 'Technology', 'Society'],
    pricing: 'Subscription',
    features: ['Trend briefings', 'Consumer expectations', 'Innovation examples', 'Quarterly reports'],
    url: 'https://trendwatching.com'
  },
  {
    id: 'forrester',
    name: 'Forrester',
    description: 'Technology and market research company',
    logo: '📈',
    categories: ['Technology', 'Marketing', 'Customer Experience', 'B2B'],
    pricing: 'Enterprise',
    features: ['Research reports', 'Wave evaluations', 'Customer insights', 'Tech forecasts'],
    url: 'https://www.forrester.com'
  }
];

export function AddTrendModal({ onClose, onAddTrend }: AddTrendModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'database'>('manual');
  
  // Manual trend form with all required fields
  const [manualTrend, setManualTrend] = useState({
    title: '',
    category: '',
    description: '',
    impact: 'medium',
    timeframe: '',
    relevantIndustries: '',
    keyInsights: '',
    // NEW FIELDS
    direction: 'rising',
    relevance: 75,
    level: 'meso', // Default to meso (organizational level)
    tags: [] as string[],
    sources: [] as string[]
  });

  // Tag input state
  const [tagInput, setTagInput] = useState('');
  const [sourceInput, setSourceInput] = useState('');

  const handleAddManualTrend = () => {
    const trend = {
      id: `trend-${Date.now()}`,
      title: manualTrend.title,
      category: manualTrend.category as any,
      description: manualTrend.description,
      impact: manualTrend.impact as any,
      timeframe: manualTrend.timeframe as any,
      relevantIndustries: manualTrend.relevantIndustries
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0),
      keyInsights: manualTrend.keyInsights || undefined,
      // NEW FIELDS
      direction: manualTrend.direction as any,
      relevance: manualTrend.relevance,
      level: manualTrend.level,
      sources: manualTrend.sources,
      dateAdded: new Date().toISOString().split('T')[0], // Auto-set current date
      tags: manualTrend.tags
    };
    onAddTrend(trend);
    onClose();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !manualTrend.tags.includes(tagInput.trim())) {
      setManualTrend({ 
        ...manualTrend, 
        tags: [...manualTrend.tags, tagInput.trim()] 
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setManualTrend({
      ...manualTrend,
      tags: manualTrend.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleAddSource = () => {
    if (sourceInput.trim() && !manualTrend.sources.includes(sourceInput.trim())) {
      setManualTrend({ 
        ...manualTrend, 
        sources: [...manualTrend.sources, sourceInput.trim()] 
      });
      setSourceInput('');
    }
  };

  const handleRemoveSource = (sourceToRemove: string) => {
    setManualTrend({
      ...manualTrend,
      sources: manualTrend.sources.filter(source => source !== sourceToRemove)
    });
  };

  const isManualFormValid = 
    manualTrend.title.trim().length > 0 &&
    manualTrend.category &&
    manualTrend.description.trim().length >= 10 &&
    manualTrend.impact &&
    manualTrend.timeframe &&
    manualTrend.direction &&
    manualTrend.relevance >= 0 && manualTrend.relevance <= 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <CardHeader className="border-b bg-gradient-to-r from-orange-500/5 to-pink-500/5 pb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-2xl">Add Trend</CardTitle>
              </div>
              <CardDescription className="text-base">
                Manually add a trend or import from leading trend intelligence databases
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'database')}>
            <div className="border-b px-6 pt-4">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="manual" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="database" className="gap-2">
                  <Database className="h-4 w-4" />
                  Import from Database
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="p-6 space-y-6 mt-0">
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Basic Information */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      Trend Details
                    </CardTitle>
                    <CardDescription>Define the core characteristics of this trend</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Trend Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g., AI-Powered Personalization"
                        value={manualTrend.title}
                        onChange={(e) => setManualTrend({ ...manualTrend, title: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select value={manualTrend.category} onValueChange={(v) => setManualTrend({ ...manualTrend, category: v })}>
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technology">Technology</SelectItem>
                            <SelectItem value="consumer">Consumer</SelectItem>
                            <SelectItem value="social">Social</SelectItem>
                            <SelectItem value="business">Business</SelectItem>
                            <SelectItem value="environmental">Environmental</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="impact">Impact Level</Label>
                        <Select value={manualTrend.impact} onValueChange={(v) => setManualTrend({ ...manualTrend, impact: v })}>
                          <SelectTrigger id="impact">
                            <SelectValue placeholder="Select impact" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timeframe">Timeframe</Label>
                        <Select value={manualTrend.timeframe} onValueChange={(v) => setManualTrend({ ...manualTrend, timeframe: v })}>
                          <SelectTrigger id="timeframe">
                            <SelectValue placeholder="Select timeframe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short-term">Short-term (0-1 year)</SelectItem>
                            <SelectItem value="medium-term">Medium-term (1-3 years)</SelectItem>
                            <SelectItem value="long-term">Long-term (3+ years)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the trend and its implications..."
                        rows={3}
                        value={manualTrend.description}
                        onChange={(e) => setManualTrend({ ...manualTrend, description: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industries">Relevant Industries</Label>
                      <Input
                        id="industries"
                        placeholder="E-commerce, Marketing, Technology (comma-separated)"
                        value={manualTrend.relevantIndustries}
                        onChange={(e) => setManualTrend({ ...manualTrend, relevantIndustries: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="insights">Key Insights</Label>
                      <Textarea
                        id="insights"
                        placeholder="Supporting data, statistics, or insights about this trend..."
                        rows={2}
                        value={manualTrend.keyInsights}
                        onChange={(e) => setManualTrend({ ...manualTrend, keyInsights: e.target.value })}
                      />
                    </div>

                    {/* NEW FIELDS */}
                    <div className="space-y-2">
                      <Label htmlFor="direction">Trend Direction *</Label>
                      <Select value={manualTrend.direction} onValueChange={(v) => setManualTrend({ ...manualTrend, direction: v })}>
                        <SelectTrigger id="direction">
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rising">📈 Rising</SelectItem>
                          <SelectItem value="declining">📉 Declining</SelectItem>
                          <SelectItem value="stable">➡️ Stable</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Indicates whether this trend is growing, declining, or remaining stable</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="relevance">Relevance Score * ({manualTrend.relevance}%)</Label>
                      <input
                        id="relevance"
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={manualTrend.relevance}
                        onChange={(e) => setManualTrend({ ...manualTrend, relevance: parseInt(e.target.value) })}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${manualTrend.relevance}%, hsl(var(--muted)) ${manualTrend.relevance}%, hsl(var(--muted)) 100%)`
                        }}
                      />
                      <p className="text-xs text-muted-foreground">How relevant is this trend to your industry or business context?</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="level">Strategic Level *</Label>
                      <Select value={manualTrend.level} onValueChange={(v) => setManualTrend({ ...manualTrend, level: v })}>
                        <SelectTrigger id="level">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="micro">
                            <div className="flex items-center gap-2">
                              <span>🔬 Micro</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="meso">
                            <div className="flex items-center gap-2">
                              <span>🏢 Meso</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="macro">
                            <div className="flex items-center gap-2">
                              <span>🌍 Macro</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Micro:</span> Individual/consumer behavior • 
                        <span className="font-medium ml-1">Meso:</span> Organizational/industry level • 
                        <span className="font-medium ml-1">Macro:</span> Societal/economic shifts
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Metadata Section */}
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5 text-purple-600" />
                      Metadata & Classification
                    </CardTitle>
                    <CardDescription>Add tags and sources to organize and reference this trend</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="tags"
                          placeholder="Add a tag (press Enter)"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleAddTag}
                          disabled={!tagInput.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {manualTrend.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 p-3 bg-muted/50 rounded-lg">
                          {manualTrend.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs gap-1.5">
                              {tag}
                              <button
                                type="button"
                                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                                onClick={() => handleRemoveTag(tag)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">Add keywords for easy filtering and categorization</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sources">Sources</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="sources"
                          placeholder="e.g., McKinsey Report, Gartner Study (press Enter)"
                          value={sourceInput}
                          onChange={(e) => setSourceInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSource();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleAddSource}
                          disabled={!sourceInput.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {manualTrend.sources.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {manualTrend.sources.map((source, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg group">
                              <span className="text-sm flex-1">{source}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveSource(source)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">Add references to research reports, articles, or studies</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Database Import Tab */}
            <TabsContent value="database" className="p-6 space-y-6 mt-0">
              {/* Info Banner */}
              <div className="max-w-6xl mx-auto">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Professional Trend Intelligence Databases
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        These services provide expert-curated trend insights, forecasts, and market intelligence. Most require paid subscriptions or enterprise licenses.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Database Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trendDatabases.map((db) => (
                    <Card key={db.id} className="hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/20 dark:to-pink-900/20 flex items-center justify-center text-2xl">
                              {db.logo}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{db.name}</CardTitle>
                              <Badge variant="outline" className="mt-1">
                                {db.pricing}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <CardDescription className="text-sm">
                          {db.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Categories */}
                        <div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Tag className="h-3 w-3" />
                            <span>Categories</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {db.categories.map((cat, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Features */}
                        <div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <CheckCircle className="h-3 w-3" />
                            <span>Key Features</span>
                          </div>
                          <ul className="space-y-1">
                            {db.features.map((feature, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => window.open(db.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                            Visit Website
                          </Button>
                          <Button
                            className="flex-1 gap-2"
                            onClick={() => {
                              // In real implementation, this would open integration flow
                              alert(`Integration with ${db.name} would be configured here. This typically requires:\n\n1. Account credentials\n2. API access setup\n3. Data mapping configuration\n\nContact ${db.name} sales for API access.`);
                            }}
                          >
                            <ArrowRight className="h-4 w-4" />
                            Connect
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Additional Resources */}
                <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Free & Alternative Sources
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    For budget-conscious research, consider these free or freemium alternatives:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Google Trends (Free)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Think with Google (Free)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Statista (Limited Free)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>TrendHunter (Freemium)</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer - Only show for manual entry */}
        {activeTab === 'manual' && (
          <div className="border-t p-6 bg-muted/30">
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              <div className="text-sm text-muted-foreground">
                * Required fields
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddManualTrend}
                  disabled={!isManualFormValid}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Trend
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}