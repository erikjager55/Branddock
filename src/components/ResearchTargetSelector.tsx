import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Palette,
  Users,
  Package,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Search,
  CheckCircle,
  Target,
  Sparkles
} from 'lucide-react';
import { ResearchTargetCategory, ResearchTargetOption, ResearchTarget } from '../types/research-target';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { mockPersonas } from '../data/mock-personas';

interface ResearchTargetSelectorProps {
  onTargetSelected: (target: ResearchTarget) => void;
  onBack?: () => void;
}

const targetCategories: ResearchTargetOption[] = [
  {
    category: 'brand',
    label: 'Your Brand',
    description: 'Research and validate your brand foundation, positioning, and messaging',
    icon: Palette,
    color: 'purple',
    examples: ['Brand Purpose', 'Value Proposition', 'Brand Voice', 'Visual Identity']
  },
  {
    category: 'persona',
    label: 'Target Personas',
    description: 'Deep dive into your customer segments to understand their needs and behaviors',
    icon: Users,
    color: 'pink',
    examples: ['Customer Goals', 'Pain Points', 'Buying Behavior', 'Motivations']
  },
  {
    category: 'products-services',
    label: 'Products & Services',
    description: 'Validate your offerings and discover improvement opportunities',
    icon: Package,
    color: 'blue',
    examples: ['Product-Market Fit', 'Feature Validation', 'Pricing Strategy', 'Service Design']
  },
  {
    category: 'trends',
    label: 'Market Trends',
    description: 'Explore emerging trends and their impact on your business',
    icon: TrendingUp,
    color: 'green',
    examples: ['Industry Shifts', 'Customer Expectations', 'Technology Trends', 'Competitor Moves']
  },
  {
    category: 'knowledge',
    label: 'Knowledge Gaps',
    description: 'Identify and fill strategic knowledge gaps in your organization',
    icon: BookOpen,
    color: 'amber',
    examples: ['Market Understanding', 'Customer Insights', 'Competitive Intelligence', 'Best Practices']
  }
];

export function ResearchTargetSelector({ onTargetSelected, onBack }: ResearchTargetSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<ResearchTargetCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCategorySelect = (category: ResearchTargetCategory) => {
    setSelectedCategory(category);
    setSelectedItem(null);
    
    // For categories without specific items, go directly to method selection
    if (category !== 'brand' && category !== 'persona') {
      onTargetSelected({
        category,
        targetName: targetCategories.find(c => c.category === category)?.label
      });
    }
  };

  const handleItemSelect = (itemId: string, itemName: string) => {
    if (!selectedCategory) return;
    
    setSelectedItem(itemId);
    onTargetSelected({
      category: selectedCategory,
      targetId: itemId,
      targetName: itemName
    });
  };

  const renderCategorySelection = () => {
    // Get counts
    const brandAssetsCount = mockBrandAssets.length;
    const personasCount = mockPersonas.length;

    return (
      <div className="p-6 h-full overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
              <Target className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">What do you want to research?</h1>
            <p className="text-muted-foreground text-lg">
              Choose a research area to start gathering insights
            </p>
            
            {onBack && (
              <Button variant="ghost" onClick={onBack} className="mt-4">
                Cancel
              </Button>
            )}
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {targetCategories.map((option) => {
              const Icon = option.icon;
              const itemCount = 
                option.category === 'brand' ? brandAssetsCount :
                option.category === 'persona' ? personasCount :
                undefined;

              return (
                <Card
                  key={option.category}
                  className="hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                  onClick={() => handleCategorySelect(option.category)}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-${option.color}-500 to-${option.color}-600`} />
                  
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`h-12 w-12 rounded-lg bg-${option.color}-100 dark:bg-${option.color}-900/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-6 w-6 text-${option.color}-600`} />
                      </div>
                      {itemCount !== undefined && (
                        <Badge variant="secondary">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="group-hover:text-${option.color}-600 transition-colors">
                      {option.label}
                    </CardTitle>
                    <CardDescription>{option.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Research areas:</p>
                      <div className="flex flex-wrap gap-1">
                        {option.examples.slice(0, 3).map((example, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center text-sm font-medium text-${option.color}-600 group-hover:gap-2 transition-all">
                      Start Research
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{brandAssetsCount}</div>
                <p className="text-sm text-muted-foreground">Brand Assets Ready</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border-pink-200 dark:border-pink-800">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-pink-600">{personasCount}</div>
                <p className="text-sm text-muted-foreground">Personas to Research</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">5</div>
                <p className="text-sm text-muted-foreground">Research Categories</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderItemSelection = () => {
    if (!selectedCategory) return null;

    const categoryConfig = targetCategories.find(c => c.category === selectedCategory);
    if (!categoryConfig) return null;

    let items: Array<{ id: string; name: string; description?: string; status?: string; avatar?: string }> = [];

    if (selectedCategory === 'brand') {
      items = mockBrandAssets.map(asset => ({
        id: asset.id,
        name: asset.type,
        description: asset.content?.substring(0, 100) + '...',
        status: asset.status
      }));
    } else if (selectedCategory === 'persona') {
      items = mockPersonas.map(persona => ({
        id: persona.id,
        name: persona.name,
        description: persona.tagline,
        status: persona.status,
        avatar: persona.avatar
      }));
    }

    const filteredItems = items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const Icon = categoryConfig.icon;

    return (
      <div className="p-6 h-full overflow-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" onClick={() => setSelectedCategory(null)} className="mb-4">
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Back to Categories
            </Button>

            <div className="flex items-center gap-3 mb-4">
              <div className={`h-12 w-12 rounded-lg bg-${categoryConfig.color}-100 dark:bg-${categoryConfig.color}-900/20 flex items-center justify-center`}>
                <Icon className={`h-6 w-6 text-${categoryConfig.color}-600`} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{categoryConfig.label}</h1>
                <p className="text-muted-foreground">{categoryConfig.description}</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${categoryConfig.label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleItemSelect(item.id, item.name)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {item.avatar && (
                        <img
                          src={item.avatar}
                          alt={item.name}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-purple-100"
                        />
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">
                          {item.name}
                        </CardTitle>
                        {item.description && (
                          <CardDescription className="text-sm line-clamp-2 mt-1">
                            {item.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredItems.length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No items found matching your search</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  return selectedCategory && (selectedCategory === 'brand' || selectedCategory === 'persona')
    ? renderItemSelection()
    : renderCategorySelection();
}
