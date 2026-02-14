import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { FileText } from 'lucide-react';
import { AssetDashboardConfig } from '../../config/asset-dashboard-configs';

interface SimpleTextContentProps {
  assetId: string;
  isEditing: boolean;
  config: AssetDashboardConfig;
  hasToolbar?: boolean;
}

export function SimpleTextContent({ assetId, isEditing, config, hasToolbar = false }: SimpleTextContentProps) {
  const [content, setContent] = useState(config.defaultContent?.simpleText || '');

  return (
    <Card className={`border transition-all ${
      hasToolbar ? 'border-t-0 rounded-t-none' : 'border rounded-2xl'
    } ${
      isEditing ? 'border-primary shadow-lg' : 'border-gray-200 dark:border-gray-800'
    }`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Content</h3>
            <p className="text-sm text-muted-foreground">
              Define the core content for this asset
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter content..."
            className="min-h-[200px] resize-none text-base leading-relaxed border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-primary"
          />
        ) : (
          <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {content || 'No content defined yet. Click "Edit Content" to add content.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}