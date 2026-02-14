import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Brain, Heart, Zap } from 'lucide-react';
import { AssetDashboardConfig } from '../../config/asset-dashboard-configs';

interface ThinkFeelActContentProps {
  assetId: string;
  isEditing: boolean;
  config: AssetDashboardConfig;
  hasToolbar?: boolean;
}

export function ThinkFeelActContent({ assetId, isEditing, config, hasToolbar = false }: ThinkFeelActContentProps) {
  const [content, setContent] = useState({
    think: config.defaultContent?.think?.text || '',
    feel: config.defaultContent?.feel?.text || '',
    act: config.defaultContent?.act?.text || '',
  });

  const dimensions = [
    {
      key: 'think' as const,
      title: 'Think',
      subtitle: 'Cognitive Goal',
      description: 'What you want your audience to think and believe',
      icon: Brain,
      gradient: 'from-blue-500 to-cyan-500',
      bgLight: 'bg-blue-50 dark:bg-blue-900/20',
      borderLight: 'border-blue-200 dark:border-blue-800',
      textLight: 'text-blue-700 dark:text-blue-300',
    },
    {
      key: 'feel' as const,
      title: 'Feel',
      subtitle: 'Emotional Goal',
      description: 'The emotions you want to evoke in your audience',
      icon: Heart,
      gradient: 'from-pink-500 to-rose-500',
      bgLight: 'bg-pink-50 dark:bg-pink-900/20',
      borderLight: 'border-pink-200 dark:border-pink-800',
      textLight: 'text-pink-700 dark:text-pink-300',
    },
    {
      key: 'act' as const,
      title: 'Act',
      subtitle: 'Behavioral Goal',
      description: 'The specific actions you want to drive',
      icon: Zap,
      gradient: 'from-amber-500 to-orange-500',
      bgLight: 'bg-amber-50 dark:bg-amber-900/20',
      borderLight: 'border-amber-200 dark:border-amber-800',
      textLight: 'text-amber-700 dark:text-amber-300',
    },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${hasToolbar ? 'border border-t-0 border-gray-200 dark:border-gray-800 rounded-b-2xl p-6 bg-white dark:bg-gray-900' : ''}`}>
      {dimensions.map((dimension) => {
        const Icon = dimension.icon;
        
        return (
          <Card
            key={dimension.key}
            className={`border-2 transition-all shadow-sm hover:shadow-md ${
              isEditing
                ? `${dimension.borderLight}`
                : 'border-gray-200 dark:border-gray-800'
            }`}
          >
            <CardContent className="p-6">
              {/* Icon Header */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`h-12 w-12 rounded-xl bg-gradient-to-br ${dimension.gradient} flex items-center justify-center shadow-md flex-shrink-0`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <Badge
                  variant="outline"
                  className={`${dimension.bgLight} ${dimension.borderLight} ${dimension.textLight} text-xs font-semibold`}
                >
                  {dimension.subtitle}
                </Badge>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-xl mb-2">{dimension.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {dimension.description}
              </p>

              {/* Content */}
              {isEditing ? (
                <Textarea
                  value={content[dimension.key]}
                  onChange={(e) =>
                    setContent({ ...content, [dimension.key]: e.target.value })
                  }
                  placeholder={`Enter ${dimension.title.toLowerCase()} goal...`}
                  className="min-h-[120px] resize-none border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-primary"
                />
              ) : (
                <div className={`p-4 rounded-lg ${dimension.bgLight} ${dimension.borderLight} border`}>
                  <p className="text-sm leading-relaxed">
                    {content[dimension.key] || `No ${dimension.title.toLowerCase()} goal defined yet.`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}