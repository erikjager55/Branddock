import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Plus, Edit, Eye, TrendingUp, TrendingDown, BarChart3, Target, Calendar, Users } from 'lucide-react';
import { AddTrendModal } from './strategy-tools/AddTrendModal';
import { mockTrends, Trend } from '../data/mock-trends';

export function TrendLibrary() {
  const [trends, setTrends] = useState<Trend[]>(mockTrends);
  const [showAddTrendModal, setShowAddTrendModal] = useState(false);

  const getDirectionIcon = (direction: string) => {
    return direction === 'rising' ? TrendingUp : TrendingDown;
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'rising' 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400';
  };

  const getImpactColor = (impact: string) => {
    const normalized = impact.charAt(0).toUpperCase() + impact.slice(1).toLowerCase();
    switch (normalized) {
      case 'High': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    const normalized = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    switch (normalized) {
      case 'Technology': return BarChart3;
      case 'Marketing': return Target;
      case 'Sustainability': return TrendingUp;
      case 'Commerce': return BarChart3;
      case 'Consumer': return Target;
      case 'Social': return Users;
      case 'Business': return BarChart3;
      case 'Environmental': return TrendingUp;
      default: return TrendingUp;
    }
  };

  const getLevelBadge = (level?: string) => {
    if (!level) return null;
    const normalized = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
    switch (normalized) {
      case 'Micro':
        return { emoji: '🔬', label: 'Micro', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' };
      case 'Meso':
        return { emoji: '🏢', label: 'Meso', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' };
      case 'Macro':
        return { emoji: '🌍', label: 'Macro', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' };
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold mb-1">Trend Library</h1>
                <p className="text-muted-foreground">
                  Track industry trends and market insights for strategic planning
                </p>
              </div>
            </div>
            <Button size="lg" className="gap-2" onClick={() => setShowAddTrendModal(true)}>
              <Plus className="h-5 w-5" />
              Add Trend
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {trends.map((trend) => {
            const DirectionIcon = getDirectionIcon(trend.direction || 'rising');
            const CategoryIcon = getCategoryIcon(trend.category);
            const levelBadge = getLevelBadge(trend.level);
            return (
              <Card key={trend.id} className="rounded-xl border-border/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CategoryIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg">{trend.title}</CardTitle>
                        <CardDescription className="mt-1 flex items-center">
                          {trend.category} • {trend.timeframe}
                          <DirectionIcon className={`h-4 w-4 ml-2 ${getDirectionColor(trend.direction || 'rising')}`} />
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={`${getImpactColor(trend.impact)} border rounded-md px-2 py-0.5 flex-shrink-0`} variant="secondary">
                      {trend.impact} Impact
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {trend.description}
                  </p>
                  
                  {trend.relevance !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">Relevance Score</span>
                        <span className="text-xs font-medium">{trend.relevance}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all" 
                          style={{ width: `${trend.relevance}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {trend.tags && trend.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Tags:</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {trend.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs rounded-md">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {levelBadge && (
                    <div className="flex items-center gap-2">
                      <Badge className={levelBadge.color} variant="outline">
                        {levelBadge.emoji} {levelBadge.label}
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    {trend.dateAdded && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {trend.dateAdded}
                      </div>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add Trend Modal */}
      {showAddTrendModal && (
        <AddTrendModal
          onClose={() => setShowAddTrendModal(false)}
          onAddTrend={(newTrend) => {
            setTrends(prev => [...prev, newTrend]);
            setShowAddTrendModal(false);
          }}
        />
      )}
    </div>
  );
}