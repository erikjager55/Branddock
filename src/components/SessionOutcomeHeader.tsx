import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  CheckCircle, 
  Calendar, 
  Users, 
  Download, 
  Share2, 
  Lock, 
  Info,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface SessionOutcomeHeaderProps {
  title: string;
  completedDate: string;
  participantCount?: number;
  facilitatorName?: string;
  sessionDuration?: string;
  confidenceScore?: number;
  onDownload?: () => void;
  onShare?: () => void;
}

export function SessionOutcomeHeader({
  title,
  completedDate,
  participantCount = 1,
  facilitatorName = "AI Facilitator",
  sessionDuration,
  confidenceScore,
  onDownload,
  onShare
}: SessionOutcomeHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border-b border-border mb-6">
      <div className="max-w-6xl mx-auto px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 border-green-200 dark:border-green-800 flex items-center gap-1 cursor-help px-2.5 py-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Approved Outcome
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>This strategy was agreed upon during the canvas workshop and is now the source of truth for downstream assets.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <p className="text-muted-foreground mb-4 max-w-2xl">
              This is the finalized output from your collaborative session. It serves as the authoritative record for your brand strategy.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Finalised on <span className="font-medium text-foreground">{new Date(completedDate).toLocaleDateString()}</span></span>
              </div>
              
              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span><span className="font-medium text-foreground">{participantCount}</span> participants</span>
              </div>

              {sessionDuration && (
                <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{sessionDuration} session</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button size="sm" onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/10 px-3 py-1.5 rounded-full border border-yellow-100 dark:border-yellow-900/20">
              <Lock className="w-3 h-3" />
              <span>Session Locked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}