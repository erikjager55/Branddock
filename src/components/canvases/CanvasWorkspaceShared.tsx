import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Lock, RefreshCw, Edit3, Eye, Heart, Target, Users, Sparkles } from 'lucide-react';

interface CanvasBlock {
  id: string;
  title: string;
  content: string;
  icon?: any;
}

interface CanvasWorkspaceSharedProps {
  blocks: CanvasBlock[];
  readOnly?: boolean;
  onBlockEdit?: (blockId: string, content: string) => void;
  onBlockRegenerate?: (blockId: string) => void;
}

const iconMap: Record<string, any> = {
  'eye': Eye,
  'heart': Heart,
  'target': Target,
  'users': Users
};

export function CanvasWorkspaceShared({
  blocks,
  readOnly = false,
  onBlockEdit,
  onBlockRegenerate
}: CanvasWorkspaceSharedProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {blocks.map((block) => {
        const IconComponent = block.icon ? iconMap[block.icon] || Target : Target;
        
        return (
          <Card 
            key={block.id} 
            className={`transition-all ${
              readOnly 
                ? 'bg-muted/30 opacity-90' 
                : 'hover:shadow-md border-2'
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                    readOnly ? 'bg-muted' : 'bg-primary/10'
                  }`}>
                    <IconComponent className={`h-4 w-4 ${
                      readOnly ? 'text-muted-foreground' : 'text-primary'
                    }`} />
                  </div>
                  <h4 className="font-semibold text-base">{block.title}</h4>
                </div>
                
                {readOnly ? (
                  <Badge variant="outline" className="text-xs font-medium bg-muted/50">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1">
                    {onBlockRegenerate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                        onClick={() => onBlockRegenerate(block.id)}
                        title="Regenerate with AI"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onBlockEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                        title="Edit content"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {readOnly ? (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed min-h-[120px] p-3 bg-background/50 rounded-lg border">
                  {block.content || (
                    <span className="italic text-muted-foreground/60">No content available</span>
                  )}
                </div>
              ) : (
                <Textarea
                  value={block.content}
                  onChange={(e) => onBlockEdit?.(block.id, e.target.value)}
                  placeholder={`Define your ${block.title.toLowerCase()}...`}
                  className="min-h-[140px] text-sm resize-none border-2 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
