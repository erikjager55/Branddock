import React from 'react';
import { Card, CardContent, CardHeader } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { LucideIcon } from 'lucide-react';

interface PageCardAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  icon?: LucideIcon;
}

interface PageCardBadge {
  label: string;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  className?: string;
}

interface PageCardProps {
  /**
   * Icon to display in the top-left corner
   */
  icon?: LucideIcon;
  
  /**
   * Custom color for the icon background
   */
  iconBgColor?: string;
  
  /**
   * Custom color for the icon itself
   */
  iconColor?: string;
  
  /**
   * Main title of the card
   */
  title: string;
  
  /**
   * Optional description text below the title
   */
  description?: string;
  
  /**
   * Badges to display next to or below the title
   */
  badges?: PageCardBadge[];
  
  /**
   * Actions/buttons to display on the right side
   */
  actions?: PageCardAction[];
  
  /**
   * Main content area - can be any React nodes
   */
  children?: React.ReactNode;
  
  /**
   * Footer content - typically used for metadata or secondary actions
   */
  footer?: React.ReactNode;
  
  /**
   * Whether the card should be clickable
   */
  onClick?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Border variant - affects hover and active states
   */
  variant?: 'default' | 'interactive' | 'elevated';
}

/**
 * Standardized page card component for consistent UI across the application
 * 
 * Usage Examples:
 * 
 * Basic card:
 * <PageCard
 *   icon={Rocket}
 *   title="Campaign Strategy"
 *   description="Generate comprehensive campaign plans"
 * />
 * 
 * Interactive card with badges:
 * <PageCard
 *   icon={Target}
 *   iconBgColor="bg-blue-100 dark:bg-blue-900/30"
 *   iconColor="text-blue-600 dark:text-blue-400"
 *   title="Brand Positioning"
 *   description="Define your market position"
 *   badges={[
 *     { label: "Popular", variant: "default" },
 *     { label: "AI Assisted", variant: "secondary" }
 *   ]}
 *   onClick={() => navigate('/positioning')}
 *   variant="interactive"
 * />
 * 
 * Card with actions:
 * <PageCard
 *   icon={Users}
 *   title="Summer Launch 2025"
 *   description="Campaign strategy ready to deploy"
 *   actions={[
 *     { label: "Edit", onClick: handleEdit, icon: Edit, variant: "outline" },
 *     { label: "Delete", onClick: handleDelete, icon: Trash2, variant: "ghost" }
 *   ]}
 * >
 *   <div>Custom content here</div>
 * </PageCard>
 */
export function PageCard({
  icon: Icon,
  iconBgColor = 'bg-primary/10',
  iconColor = 'text-primary',
  title,
  description,
  badges,
  actions,
  children,
  footer,
  onClick,
  className = '',
  variant = 'default'
}: PageCardProps) {
  const isInteractive = variant === 'interactive' || !!onClick;
  const isElevated = variant === 'elevated';
  
  const cardClasses = [
    className,
    isInteractive && 'cursor-pointer hover:border-primary/50 transition-all hover:shadow-md',
    isElevated && 'shadow-sm hover:shadow-md transition-shadow'
  ].filter(Boolean).join(' ');
  
  return (
    <Card 
      className={`${cardClasses} relative`}
      onClick={onClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left side: Icon, Title, Description, Badges */}
          <div className="flex gap-4 flex-1 min-w-0">
            {/* Icon */}
            {Icon && (
              <div className={`h-12 w-12 rounded-xl ${iconBgColor} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-6 w-6 ${iconColor}`} />
              </div>
            )}
            
            {/* Title, Description & Badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold truncate">{title}</h3>
                {badges && badges.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {badges.map((badge, index) => (
                      <Badge 
                        key={index} 
                        variant={badge.variant || 'default'}
                        className={badge.className}
                      >
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              {description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          {/* Right side: Actions */}
          {actions && actions.length > 0 && (
            <div className="flex items-start gap-2 flex-shrink-0">
              {actions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={index}
                    variant={action.variant || 'ghost'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                  >
                    {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </CardHeader>
      
      {/* Main Content Area */}
      {children && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
      
      {/* Footer Area */}
      {footer && (
        <CardContent className="pt-0 pb-4 border-t border-border mt-4">
          <div className="pt-4">
            {footer}
          </div>
        </CardContent>
      )}
    </Card>
  );
}