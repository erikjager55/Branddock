/**
 * Persona Card Component
 * Displays persona with demographics, chat button, and accordion validation methods
 */

import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  MessageCircle, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  Briefcase,
  GraduationCap,
  DollarSign,
  Users as FamilyIcon,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Persona, PersonaResearchMethod } from '../../types/persona';
import { ValidationMethodButton } from '../validation/ValidationMethodButton';
import { VALIDATION_METHODS } from '../../config/validation-methods';
import { QualityBadge } from '../quality/QualityBadge';
import { calculateQualityScore } from '../../constants/quality-system';
import { cn } from '../../lib/utils';

interface PersonaCardProps {
  persona: Persona;
  onClick?: (persona: Persona) => void;
  onMethodClick?: (personaId: string, method: PersonaResearchMethod, mode: 'work' | 'results') => void;
  onChatClick?: (persona: Persona) => void;
}

export function PersonaCard({
  persona,
  onClick,
  onMethodClick,
  onChatClick,
}: PersonaCardProps) {
  const [isValidationExpanded, setIsValidationExpanded] = useState(false);

  // Calculate quality score
  const completedCount = persona.researchMethods.filter(m => m.status === 'completed').length;
  const totalMethods = persona.researchMethods.length;
  const qualityScore = calculateQualityScore(completedCount, totalMethods);

  // Demographics data
  const demographics = [
    { 
      icon: Calendar, 
      label: 'Leeftijd', 
      value: persona.demographics.age 
    },
    { 
      icon: MapPin, 
      label: 'Locatie', 
      value: persona.demographics.location 
    },
    { 
      icon: Briefcase, 
      label: 'Beroep', 
      value: persona.demographics.occupation 
    },
    { 
      icon: GraduationCap, 
      label: 'Opleiding', 
      value: persona.demographics.education 
    },
    { 
      icon: DollarSign, 
      label: 'Inkomen', 
      value: persona.demographics.income 
    },
    { 
      icon: FamilyIcon, 
      label: 'Gezinssituatie', 
      value: persona.demographics.familyStatus 
    },
  ].filter(item => item.value); // Only show items with values

  return (
    <Card 
      className={cn(
        "group overflow-hidden transition-all duration-200 hover:shadow-lg border-2",
        onClick && "cursor-pointer"
      )}
      onClick={() => onClick?.(persona)}
    >
      <CardContent className="p-6 space-y-4">
        {/* Header Zone */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 flex-shrink-0 ring-2 ring-offset-2 ring-primary/20">
            <AvatarImage src={persona.avatar} alt={persona.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg font-semibold">
              {persona.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-lg leading-tight">
                {persona.name}
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
            <p className="text-sm text-muted-foreground leading-snug">
              {persona.tagline}
            </p>
          </div>
        </div>

        {/* Demographics Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {demographics.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index}
                className="flex items-start gap-2 text-sm"
              >
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground leading-tight">
                    {item.label}
                  </div>
                  <div className="font-medium leading-tight truncate" title={item.value}>
                    {item.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat Button */}
        {onChatClick && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40"
            onClick={(e) => {
              e.stopPropagation();
              onChatClick(persona);
            }}
          >
            <MessageCircle className="h-4 w-4" />
            Chat met {persona.name}
          </Button>
        )}

        {/* Validation Methods Accordion */}
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
                {persona.researchMethods.map((method) => {
                  const validationConfig = VALIDATION_METHODS.find(vm => vm.id === method.type);
                  
                  // Map ResearchMethodStatus to ValidationMethodStatus
                  const mappedStatus = 
                    method.status === 'completed' ? 'completed' :
                    method.status === 'in-progress' ? 'running' :
                    method.status === 'cancelled' ? 'locked' :
                    'available';
                  
                  return (
                    <ValidationMethodButton
                      key={method.type}
                      type={method.type}
                      status={mappedStatus}
                      progress={method.progress}
                      label={validationConfig?.name || method.type}
                      description={
                        method.status === 'completed' 
                          ? 'Research complete • High confidence'
                          : method.status === 'in-progress'
                          ? 'Active research • Data collecting'
                          : 'Available • Upgrade persona quality'
                      }
                      icon={validationConfig?.icon}
                      onWorkClick={
                        onMethodClick 
                          ? () => onMethodClick(persona.id, method, 'work') 
                          : undefined
                      }
                      onResultsClick={
                        onMethodClick && method.status === 'completed' 
                          ? () => onMethodClick(persona.id, method, 'results') 
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Collapsed Preview - Show method icons when collapsed */}
          {!isValidationExpanded && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {persona.researchMethods.slice(0, 6).map((method) => {
                const validationConfig = VALIDATION_METHODS.find(vm => vm.id === method.type);
                const Icon = validationConfig?.icon;
                
                return (
                  <div
                    key={method.type}
                    className={cn(
                      "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                      method.status === 'completed' 
                        ? 'bg-green-100 text-green-700' 
                        : method.status === 'in-progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-muted text-muted-foreground'
                    )}
                    title={validationConfig?.name || method.type}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                  </div>
                );
              })}
              {persona.researchMethods.length > 6 && (
                <div className="h-8 px-2 rounded-md bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">
                  +{persona.researchMethods.length - 6}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t text-xs text-muted-foreground">
          <div>
            Last updated: {new Date(persona.lastUpdated).toLocaleDateString('nl-NL', { 
              day: 'numeric',
              month: 'short', 
              year: 'numeric'
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid component for multiple personas
 */
interface PersonaCardGridProps {
  personas: Persona[];
  onPersonaClick?: (persona: Persona) => void;
  onMethodClick?: (personaId: string, method: PersonaResearchMethod, mode: 'work' | 'results') => void;
  onChatClick?: (persona: Persona) => void;
}

export function PersonaCardGrid({
  personas,
  onPersonaClick,
  onMethodClick,
  onChatClick,
}: PersonaCardGridProps) {
  if (personas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No personas available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {personas.map((persona) => (
        <PersonaCard
          key={persona.id}
          persona={persona}
          onClick={onPersonaClick}
          onMethodClick={onMethodClick}
          onChatClick={onChatClick}
        />
      ))}
    </div>
  );
}