/**
 * EntityCard - Unified Entity Component
 * Single component for personas and brand assets with identical layout
 * 
 * STRUCTURE (Based on Persona Card):
 * 1. Header: avatar/icon (left) + title + quality badge (RIGHT TOP)
 * 2. Intro: short description/tagline
 * 3. Meta Row: key attributes in 2-column grid with icons
 * 4. Chat button (personas only)
 * 5. Divider
 * 6. Validation Zone: accordion with collapsed icon preview
 * 7. Footer Meta: last updated
 */

import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { MessageCircle, ChevronDown, ChevronUp, Sparkles, LucideIcon } from 'lucide-react';
import { QualityBadge } from '../quality/QualityBadge';
import { calculateQualityScore } from '../../constants/quality-system';
import { cn } from '../../lib/utils';
import { ValidationMethodButton, ValidationMethodStatus } from '../validation/ValidationMethodButton';
import { VALIDATION_METHODS } from '../../config/validation-methods';

// ============================================================================
// ENTITY CARD DATA INTERFACE
// ============================================================================

export type EntityType = 'persona' | 'brand-asset';

export interface EntityValidationMethod {
  id: string;
  type: string;
  status: ValidationMethodStatus;
  progress?: number;
  label: string;
  description?: string;
  icon?: LucideIcon;
  onWorkClick?: () => void;
  onResultsClick?: () => void;
}

export interface EntityAttribute {
  icon?: LucideIcon;
  label: string;
  value: string | number;
}

export interface EntityCardData {
  // Entity Type
  entityType: EntityType;
  
  // Header Zone
  id: string;
  title: string;
  avatar?: string; // For personas
  icon?: LucideIcon; // For brand assets
  qualityScore: number;
  
  // Intro Zone
  subtitle?: string; // tagline for personas, description for assets
  
  // Meta Row Zone
  attributes: EntityAttribute[];
  
  // Validation Zone
  validationMethods: EntityValidationMethod[];
  
  // Footer Zone
  lastUpdated?: string;
  footerInfo?: string[];
  
  // Actions
  onClick?: () => void;
  onChatClick?: () => void; // For persona chat
}

// ============================================================================
// ENTITY CARD COMPONENT
// ============================================================================

export function EntityCard({ data }: { data: EntityCardData }) {
  const {
    entityType,
    title,
    avatar,
    icon,
    qualityScore,
    subtitle,
    attributes,
    validationMethods,
    lastUpdated,
    onClick,
    onChatClick,
  } = data;

  const [isValidationExpanded, setIsValidationExpanded] = useState(false);

  // Calculate quality score
  const completedCount = validationMethods.filter(m => m.status === 'completed').length;
  const totalMethods = validationMethods.length;

  const Icon = icon;

  return (
    <Card 
      className={cn(
        "group overflow-hidden transition-all duration-200 hover:shadow-lg border-2",
        onClick && "cursor-pointer"
      )}
      onClick={() => onClick?.()}
    >
      <CardContent className="p-6 space-y-4">
        {/* Header Zone */}
        <div className="flex items-start gap-4">
          {/* Avatar/Icon (Left) */}
          {entityType === 'persona' ? (
            <Avatar className="h-16 w-16 flex-shrink-0 ring-2 ring-offset-2 ring-primary/20">
              {avatar ? (
                <AvatarImage src={avatar} alt={title} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg font-semibold">
                {title.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          ) : Icon ? (
            <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Icon className="h-8 w-8 text-primary" />
            </div>
          ) : null}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-lg leading-tight">
                {title}
              </h3>
              <QualityBadge
                score={qualityScore}
                completedCount={completedCount}
                totalCount={totalMethods}
                size="md"
                showIcon={true}
                showScore={true}
                showLabel={false}
                showTooltip={true}
                animated={true}
              />
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground leading-snug">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Attributes Grid (Demographics-style) */}
        {attributes.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {attributes.map((item, index) => {
              const AttrIcon = item.icon;
              return (
                <div 
                  key={index}
                  className="flex items-start gap-2 text-sm"
                >
                  {AttrIcon && (
                    <AttrIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground leading-tight">
                      {item.label}
                    </div>
                    <div className="font-medium leading-tight truncate" title={String(item.value)}>
                      {item.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Chat Button (Personas Only) */}
        {onChatClick && entityType === 'persona' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40"
            onClick={(e) => {
              e.stopPropagation();
              onChatClick();
            }}
          >
            <MessageCircle className="h-4 w-4" />
            Chat met {title}
          </Button>
        )}

        {/* Validation Methods Accordion */}
        {validationMethods.length > 0 && (
          <div className="pt-2 border-t">
            <button
              className="w-full flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={(e) => {
                e.stopPropagation();
                setIsValidationExpanded(!isValidationExpanded);
              }}
            >
              <div className="flex items-center gap-2">
                <span>Validation Methods</span>
                <Badge variant="secondary" className="text-xs">
                  {completedCount}/{totalMethods}
                </Badge>
              </div>
              {isValidationExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {/* Accordion Content */}
            <div
              className={cn(
                "grid transition-all duration-200 ease-in-out",
                isValidationExpanded 
                  ? "grid-rows-[1fr] opacity-100 mt-3" 
                  : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="space-y-2">
                  {validationMethods.map((method) => {
                    const validationConfig = VALIDATION_METHODS.find(vm => vm.id === method.type);
                    
                    return (
                      <ValidationMethodButton
                        key={method.id}
                        type={method.type}
                        status={method.status}
                        progress={method.progress}
                        label={method.label || validationConfig?.name || method.type}
                        description={method.description}
                        icon={method.icon || validationConfig?.icon}
                        showIcon={true}
                        onWorkClick={method.onWorkClick}
                        onResultsClick={method.onResultsClick}
                        onPrimaryClick={method.status === 'completed' ? method.onResultsClick : method.onWorkClick}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Collapsed Preview - Show method icons when collapsed */}
            {!isValidationExpanded && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {validationMethods.slice(0, 6).map((method) => {
                  const validationConfig = VALIDATION_METHODS.find(vm => vm.id === method.type);
                  const MethodIcon = method.icon || validationConfig?.icon;
                  
                  return (
                    <div
                      key={method.id}
                      className={cn(
                        "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                        method.status === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : method.status === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-muted text-muted-foreground'
                      )}
                      title={method.label || validationConfig?.name || method.type}
                    >
                      {MethodIcon && <MethodIcon className="h-4 w-4" />}
                    </div>
                  );
                })}
                {validationMethods.length > 6 && (
                  <div className="h-8 px-2 rounded-md bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">
                    +{validationMethods.length - 6}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {lastUpdated && (
          <div className="pt-3 border-t text-xs text-muted-foreground">
            <div>
              Last updated: {new Date(lastUpdated).toLocaleDateString('nl-NL', { 
                day: 'numeric',
                month: 'short', 
                year: 'numeric'
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
