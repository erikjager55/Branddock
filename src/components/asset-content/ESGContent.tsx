import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Leaf, Users2, Shield, CheckCircle2 } from 'lucide-react';
import { AssetDashboardConfig } from '../../config/asset-dashboard-configs';

interface ESGContentProps {
  assetId: string;
  isEditing: boolean;
  config: AssetDashboardConfig;
  hasToolbar?: boolean;
}

export function ESGContent({ assetId, isEditing, config, hasToolbar = false }: ESGContentProps) {
  const [content, setContent] = useState({
    environmental: {
      text: config.defaultContent?.environmental?.text || '',
      initiatives: config.defaultContent?.environmental?.initiatives || '',
      impact: config.defaultContent?.environmental?.impact || 'medium' as 'high' | 'medium' | 'low',
    },
    social: {
      text: config.defaultContent?.social?.text || '',
      initiatives: config.defaultContent?.social?.initiatives || '',
      impact: config.defaultContent?.social?.impact || 'medium' as 'high' | 'medium' | 'low',
    },
    governance: {
      text: config.defaultContent?.governance?.text || '',
      initiatives: config.defaultContent?.governance?.initiatives || '',
      impact: config.defaultContent?.governance?.impact || 'medium' as 'high' | 'medium' | 'low',
    },
  });

  const dimensions = [
    {
      key: 'environmental' as const,
      title: 'Environmental',
      description: 'Environmental sustainability and ecological impact',
      icon: Leaf,
      gradient: 'from-green-500 to-emerald-500',
      bgLight: 'bg-green-50 dark:bg-green-900/20',
      borderLight: 'border-green-200 dark:border-green-800',
      textLight: 'text-green-700 dark:text-green-300',
    },
    {
      key: 'social' as const,
      title: 'Social',
      description: 'Social responsibility and community impact',
      icon: Users2,
      gradient: 'from-blue-500 to-indigo-500',
      bgLight: 'bg-blue-50 dark:bg-blue-900/20',
      borderLight: 'border-blue-200 dark:border-blue-800',
      textLight: 'text-blue-700 dark:text-blue-300',
    },
    {
      key: 'governance' as const,
      title: 'Governance',
      description: 'Corporate governance and ethical practices',
      icon: Shield,
      gradient: 'from-purple-500 to-violet-500',
      bgLight: 'bg-purple-50 dark:bg-purple-900/20',
      borderLight: 'border-purple-200 dark:border-purple-800',
      textLight: 'text-purple-700 dark:text-purple-300',
    },
  ];

  const getImpactBadgeClass = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'medium':
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'low':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${hasToolbar ? 'border border-t-0 border-gray-200 dark:border-gray-800 rounded-b-2xl p-6 bg-white dark:bg-gray-900' : ''}`}>
      {dimensions.map((dimension) => {
        const Icon = dimension.icon;
        const dimensionContent = content[dimension.key];
        
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
                  className={`${getImpactBadgeClass(dimensionContent.impact)} text-xs font-semibold`}
                >
                  {dimensionContent.impact} impact
                </Badge>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-xl mb-2">{dimension.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {dimension.description}
              </p>

              {/* Content */}
              {isEditing ? (
                <div className="space-y-3">
                  <Textarea
                    value={dimensionContent.text}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        [dimension.key]: { ...dimensionContent, text: e.target.value },
                      })
                    }
                    placeholder={`Enter ${dimension.title.toLowerCase()} commitment...`}
                    className="min-h-[100px] resize-none border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-primary"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`p-4 rounded-lg ${dimension.bgLight} ${dimension.borderLight} border`}>
                    <p className="text-sm leading-relaxed">
                      {dimensionContent.text || `No ${dimension.title.toLowerCase()} commitment defined yet.`}
                    </p>
                  </div>
                  
                  {dimensionContent.initiatives && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{dimensionContent.initiatives}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}