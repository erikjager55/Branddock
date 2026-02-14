import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, Clock, ArrowRight, Users, Timer } from 'lucide-react';

interface ResearchMethodCardProps {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
  whenToUse: string;
  effort: string;
  participants: string;
  outputType: 'qualitative' | 'quantitative' | 'mixed';
  status: 'not-started' | 'in-progress' | 'completed';
  recommended?: boolean;
  completedDate?: string;
  onStart: () => void;
  onViewResults?: () => void;
}

export function ResearchMethodCard({
  icon: Icon,
  name,
  description,
  whenToUse,
  effort,
  participants,
  outputType,
  status,
  recommended = false,
  completedDate,
  onStart,
  onViewResults
}: ResearchMethodCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900/30';
      case 'in-progress':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/30';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-900/30';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'in-progress':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  const getOutputTypeColor = () => {
    switch (outputType) {
      case 'qualitative':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400';
      case 'quantitative':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
      case 'mixed':
        return 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400';
    }
  };

  return (
    <Card
      className={`group hover:shadow-lg transition-all ${
        recommended ? 'border-primary border-2 bg-primary/5' : ''
      } ${status === 'completed' ? 'bg-green-50/50 dark:bg-green-900/5' : ''}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge className={`${getStatusColor()} border text-xs`}>
              {getStatusIcon()}
              <span className="ml-1">{getStatusLabel()}</span>
            </Badge>
            {recommended && status === 'not-started' && (
              <Badge className="bg-primary text-primary-foreground text-xs">
                Recommended Next
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-base">{name}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* When to Use */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">When to use this:</p>
          <p className="text-sm leading-relaxed">{whenToUse}</p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              <p className="text-xs font-medium">Effort</p>
            </div>
            <p className="text-sm">{effort}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <p className="text-xs font-medium">Participants</p>
            </div>
            <p className="text-sm">{participants}</p>
          </div>
        </div>

        {/* Output Type */}
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">Output:</p>
          <Badge variant="secondary" className={`${getOutputTypeColor()} text-xs`}>
            {outputType}
          </Badge>
        </div>

        {/* Completed Date */}
        {status === 'completed' && completedDate && (
          <div className="text-xs text-muted-foreground pt-1">
            Completed on {completedDate}
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 space-y-2">
          {status === 'completed' ? (
            <>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={onViewResults}
              >
                View Results
                <ArrowRight className="h-3.5 w-3.5 ml-2" />
              </Button>
              <Button
                variant="ghost"
                className="w-full text-xs"
                size="sm"
                onClick={onStart}
              >
                Run Again
              </Button>
            </>
          ) : (
            <Button
              className="w-full"
              size="sm"
              variant={recommended ? 'default' : 'outline'}
              onClick={onStart}
            >
              {status === 'in-progress' ? 'Continue' : 'Start'} {name}
              <ArrowRight className="h-3.5 w-3.5 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
