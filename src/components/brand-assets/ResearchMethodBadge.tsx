import React from 'react';
import { ResearchMethod, ResearchMethodType } from '../../types/brand-asset';
import { getMethodInfo } from '../../utils/asset-status';
import { CheckCircle, Clock, Circle, X } from 'lucide-react';
import { Badge } from '../ui/badge';

interface ResearchMethodBadgeProps {
  method: ResearchMethod;
  size?: 'small' | 'medium' | 'large';
  variant?: 'full' | 'icon-only' | 'compact';
  onClick?: () => void;
}

export function ResearchMethodBadge({ 
  method, 
  size = 'medium', 
  variant = 'full',
  onClick 
}: ResearchMethodBadgeProps) {
  const methodInfo = getMethodInfo(method.type);
  
  // Get status styling
  const getStatusColor = () => {
    switch (method.status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700';
      case 'in-progress':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-700';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-300 dark:border-red-700';
      case 'not-started':
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700';
    }
  };
  
  const getStatusIcon = () => {
    switch (method.status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'in-progress':
        return <Clock className="h-3 w-3" />;
      case 'cancelled':
        return <X className="h-3 w-3" />;
      case 'not-started':
      default:
        return <Circle className="h-3 w-3" />;
    }
  };
  
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-2 py-1 text-xs';
      case 'large':
        return 'px-4 py-3 text-sm';
      case 'medium':
      default:
        return 'px-3 py-2 text-xs';
    }
  };
  
  // Icon-only variant for compact spaces
  if (variant === 'icon-only') {
    return (
      <div
        className={`
          inline-flex items-center justify-center rounded-md border
          ${getStatusColor()}
          ${size === 'small' ? 'h-6 w-6' : size === 'large' ? 'h-10 w-10' : 'h-8 w-8'}
          ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        `}
        onClick={onClick}
        title={`${methodInfo.label}: ${method.status.replace('-', ' ')}`}
      >
        <span className={size === 'small' ? 'text-xs' : 'text-base'}>
          {methodInfo.icon}
        </span>
      </div>
    );
  }
  
  // Compact variant - icon + status, no text
  if (variant === 'compact') {
    return (
      <div
        className={`
          inline-flex items-center space-x-1 rounded-md border px-2 py-1
          ${getStatusColor()}
          ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        `}
        onClick={onClick}
        title={`${methodInfo.label}: ${method.status.replace('-', ' ')}`}
      >
        <span className="text-sm">{methodInfo.icon}</span>
        {getStatusIcon()}
      </div>
    );
  }
  
  // Full variant with all details
  return (
    <div
      className={`
        inline-flex flex-col items-center rounded-lg border
        ${getStatusColor()}
        ${getSizeClasses()}
        ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-105 transition-all ring-2 ring-transparent hover:ring-primary/30' : ''}
      `}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation(); // Prevent parent card click
          console.log('Research Method Badge Clicked:', methodInfo.label, method.type, method.status);
          onClick();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={onClick ? `Click to open ${methodInfo.label}` : undefined}
    >
      {/* Icon */}
      <div className="text-2xl mb-1">{methodInfo.icon}</div>
      
      {/* Label */}
      <div className="font-medium text-xs mb-1">
        {size === 'large' ? methodInfo.label : methodInfo.shortLabel}
      </div>
      
      {/* Status */}
      <div className="flex items-center space-x-1">
        {getStatusIcon()}
        <span className="text-xs capitalize">
          {method.status === 'not-started' ? 'Not Started' :
           method.status === 'in-progress' ? 'In Progress' :
           method.status === 'completed' ? 'Done' :
           'Cancelled'}
        </span>
      </div>
      
      {/* Date or Progress */}
      {method.status === 'completed' && method.completedAt && (
        <div className="text-xs opacity-70 mt-1">
          {new Date(method.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}
      
      {method.status === 'in-progress' && method.progress !== undefined && (
        <div className="text-xs opacity-70 mt-1">
          {method.progress}%
        </div>
      )}
      
      {/* Metadata */}
      {method.metadata && size === 'large' && (
        <div className="text-xs opacity-70 mt-1">
          {method.metadata.participants && `${method.metadata.participants} people`}
          {method.metadata.sessions && `${method.metadata.sessions} sessions`}
          {method.metadata.responses && `${method.metadata.responses} responses`}
        </div>
      )}
    </div>
  );
}

interface ResearchMethodBadgeGroupProps {
  methods: ResearchMethod[];
  size?: 'small' | 'medium' | 'large';
  variant?: 'full' | 'icon-only' | 'compact';
  onMethodClick?: (method: ResearchMethod) => void;
}

export function ResearchMethodBadgeGroup({ 
  methods, 
  size = 'medium',
  variant = 'full',
  onMethodClick 
}: ResearchMethodBadgeGroupProps) {
  return (
    <div className={`flex flex-wrap ${variant === 'full' ? 'gap-3' : 'gap-1.5'}`}>
      {methods.map((method, idx) => (
        <ResearchMethodBadge
          key={idx}
          method={method}
          size={size}
          variant={variant}
          onClick={onMethodClick ? () => onMethodClick(method) : undefined}
        />
      ))}
    </div>
  );
}