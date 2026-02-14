/**
 * CampaignDeliverableButton Component
 * 
 * Wide button variant for displaying campaign deliverables on detail pages.
 * Similar design to ValidationMethodButton but tailored for campaign deliverables.
 */

import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  FileText,
  Image,
  Video,
  Mail,
  Globe,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Pencil,
  ChevronRight,
} from 'lucide-react';

export interface CampaignDeliverable {
  id: string;
  name: string;
  description?: string;
  type: 'document' | 'image' | 'video' | 'email' | 'website' | 'social';
  status: 'completed' | 'in-progress' | 'not-started';
  progress?: number;
  dueDate?: string;
  assignee?: string;
}

interface CampaignDeliverableButtonProps {
  deliverable: CampaignDeliverable;
  onClick?: () => void;
  onViewClick?: () => void;
  onEditClick?: () => void;
}

const deliverableConfig = {
  document: {
    icon: FileText,
    label: 'Document',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  image: {
    icon: Image,
    label: 'Image',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  video: {
    icon: Video,
    label: 'Video',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    iconColor: 'text-pink-600 dark:text-pink-400',
  },
  email: {
    icon: Mail,
    label: 'Email',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  website: {
    icon: Globe,
    label: 'Website',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  social: {
    icon: Sparkles,
    label: 'Social Media',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
};

const statusConfig = {
  completed: {
    badge: {
      label: 'Completed',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700',
      icon: CheckCircle2,
    },
    button: {
      label: 'View',
      variant: 'outline' as const,
      icon: Eye,
    },
  },
  'in-progress': {
    badge: {
      label: 'In Progress',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700',
      icon: Clock,
    },
    button: {
      label: 'Continue',
      variant: 'default' as const,
      icon: Pencil,
    },
  },
  'not-started': {
    badge: {
      label: 'Not Started',
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700',
      icon: Circle,
    },
    button: {
      label: 'Start',
      variant: 'default' as const,
      icon: Pencil,
    },
  },
};

export function CampaignDeliverableButton({
  deliverable,
  onClick,
  onViewClick,
  onEditClick,
}: CampaignDeliverableButtonProps) {
  const config = deliverableConfig[deliverable.type];
  const statusInfo = statusConfig[deliverable.status];
  const Icon = config.icon;
  const BadgeIcon = statusInfo.badge.icon;
  const ButtonIcon = statusInfo.button.icon;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (deliverable.status === 'completed' && onViewClick) {
      onViewClick();
    } else if (onEditClick) {
      onEditClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full group relative flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/40 hover:shadow-md transition-all text-left"
    >
      {/* Left: Icon */}
      <div className={`h-12 w-12 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
        <Icon className={`h-6 w-6 ${config.iconColor}`} />
      </div>

      {/* Middle: Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
            {deliverable.name}
          </h4>
          <Badge
            variant="outline"
            className={`${statusInfo.badge.className} border text-xs flex-shrink-0`}
          >
            <BadgeIcon className="h-3 w-3 mr-1" />
            {statusInfo.badge.label}
          </Badge>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{config.label}</span>
          {deliverable.dueDate && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span>Due {deliverable.dueDate}</span>
            </>
          )}
          {deliverable.assignee && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span>{deliverable.assignee}</span>
            </>
          )}
        </div>

        {/* Progress bar for in-progress items */}
        {deliverable.status === 'in-progress' && deliverable.progress !== undefined && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${deliverable.progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {deliverable.progress}%
            </span>
          </div>
        )}

        {deliverable.description && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">
            {deliverable.description}
          </p>
        )}
      </div>

      {/* Right: Action Icon */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}
