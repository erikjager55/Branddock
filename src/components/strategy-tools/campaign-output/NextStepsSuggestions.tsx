/**
 * COMPONENT: Next Steps Suggestions (Laag 2)
 * 
 * Contextuele suggestie kaarten voor vervolgstappen
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  FileText,
  Presentation,
  Sparkles,
  CheckSquare,
  Home,
  Map,
  Users,
  TrendingUp,
  MessageSquare,
  ExternalLink,
  Download,
  Copy,
  ArrowRight,
  ChevronDown
} from 'lucide-react';

interface NextStepsSuggestionsProps {
  campaignConfig: {
    name: string;
    objective: string;
    timeline: string;
    budget: string;
  };
  selectedChannels: string[];
  selectedPersonas: string[];
  hasAgency?: boolean;
  onOpenChat: () => void;
}

interface SuggestionCard {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  whatItDoes: string;
  howLong: string;
  outputTypes: string[];
  priority: 'high' | 'medium' | 'low';
  relevant: boolean;
}

export function NextStepsSuggestions({
  campaignConfig,
  selectedChannels,
  selectedPersonas,
  hasAgency = false,
  onOpenChat
}: NextStepsSuggestionsProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Determine which suggestions are relevant based on context
  const suggestions: SuggestionCard[] = [
    {
      id: 'agency-brief',
      icon: FileText,
      title: 'Agency Creative Brief',
      description: 'A professional briefing for your agency or creative team',
      whatItDoes: 'Industry-standard brief with all the context an agency needs to get started',
      howLong: '⚡ Instant (10 seconds)',
      outputTypes: ['PDF', 'Word', 'Email'],
      priority: 'high',
      relevant: !hasAgency || selectedChannels.length > 0
    },
    {
      id: 'stakeholder-deck',
      icon: Presentation,
      title: 'Stakeholder Presentation',
      description: 'PowerPoint presentation for CMO, CEO or board meeting',
      whatItDoes: 'Auto-generated presentation deck with executive summary, strategy and next steps',
      howLong: '⚡ Instant (15 seconds)',
      outputTypes: ['PowerPoint', 'Google Slides', 'PDF'],
      priority: 'high',
      relevant: true
    },
    {
      id: 'ai-prompts',
      icon: Sparkles,
      title: 'AI Content Prompts',
      description: 'Midjourney & ChatGPT prompts for rapid content creation',
      whatItDoes: 'Ready-to-use prompts for visuals, copy, video scripts and more',
      howLong: '⚡ Instant (5 seconds)',
      outputTypes: ['Midjourney', 'ChatGPT', 'Claude', 'DALL-E'],
      priority: 'high',
      relevant: selectedChannels.some(c => ['social-media', 'paid-social', 'content'].includes(c))
    },
    {
      id: 'launch-checklist',
      icon: CheckSquare,
      title: 'Launch Readiness Checklist',
      description: 'Don\'t forget anything - hour-by-hour checklist for go-live',
      whatItDoes: 'Complete pre-flight check with all tasks, owners and deadlines',
      howLong: '⚡ Instant (10 seconds)',
      outputTypes: ['Interactive', 'PDF', 'Trello Export'],
      priority: 'high',
      relevant: true
    },
    {
      id: 'message-house',
      icon: Home,
      title: 'Message House Canvas',
      description: 'Visual framework for team alignment on messaging',
      whatItDoes: 'Auto-populated message house with your core message, pillars and proof points',
      howLong: '⚡ Instant (10 seconds)',
      outputTypes: ['Interactive', 'PDF', 'Figma', 'Miro'],
      priority: 'medium',
      relevant: selectedPersonas.length > 0
    },
    {
      id: 'journey-map',
      icon: Map,
      title: 'Customer Journey Map',
      description: 'Visualize touchpoints across customer journey stages',
      whatItDoes: 'Complete journey map with awareness, consideration, decision and retention',
      howLong: '⚡ Instant (15 seconds)',
      outputTypes: ['Interactive', 'PDF', 'Miro'],
      priority: 'medium',
      relevant: selectedPersonas.length > 0 && selectedChannels.length > 2
    },
    {
      id: 'persona-messaging',
      icon: Users,
      title: 'Persona Messaging Matrix',
      description: 'Specific messaging per selected persona',
      whatItDoes: 'Tailored messaging, channels and content per persona segment',
      howLong: '⚡ Instant (10 seconds)',
      outputTypes: ['Interactive', 'PDF', 'Excel'],
      priority: 'medium',
      relevant: selectedPersonas.length > 1
    },
    {
      id: 'media-brief',
      icon: TrendingUp,
      title: 'Media Agency Brief',
      description: 'Briefing for your media agency or trading desk',
      whatItDoes: 'Complete media brief with targeting, budget allocation and KPI framework',
      howLong: '⚡ Instant (10 seconds)',
      outputTypes: ['PDF', 'Word', 'Email'],
      priority: 'medium',
      relevant: selectedChannels.some(c => ['paid-search', 'paid-social', 'display'].includes(c))
    }
  ];

  // Filter to only show relevant suggestions
  const relevantSuggestions = suggestions.filter(s => s.relevant);
  const highPriority = relevantSuggestions.filter(s => s.priority === 'high');
  const mediumPriority = relevantSuggestions.filter(s => s.priority === 'medium');

  const handleGenerate = (suggestionId: string) => {
    // In werkelijke implementatie: trigger de generatie van deze output
    console.log('Generating:', suggestionId);
    // Voor nu: simuleer een download
    alert(`Generating ${suggestionId}... (Dit zou in de echte app de output genereren)`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Recommended Next Steps</CardTitle>
                <CardDescription>
                  Based on your campaign strategy, we've prepared these outputs for you. 
                  Click on a card to generate directly.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1 whitespace-nowrap">
              {relevantSuggestions.length} outputs
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* High Priority Suggestions */}
      {highPriority.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="default" className="bg-red-600">
              High Priority
            </Badge>
            <p className="text-sm text-muted-foreground">
              These outputs are most relevant for your next steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highPriority.map((suggestion) => {
              const Icon = suggestion.icon;
              const isExpanded = expandedCard === suggestion.id;

              return (
                <Card 
                  key={suggestion.id}
                  className="border-2 hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => setExpandedCard(isExpanded ? null : suggestion.id)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base mb-1">{suggestion.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {suggestion.description}
                        </CardDescription>
                      </div>
                      <ChevronDown 
                        className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 space-y-4 animate-in fade-in-50 slide-in-from-top-2 duration-300">
                      <div className="p-3 rounded-lg bg-muted/50 border">
                        <p className="text-xs text-muted-foreground mb-2">WHAT IT DOES</p>
                        <p className="text-sm">{suggestion.whatItDoes}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Generation time</span>
                        <span className="font-medium">{suggestion.howLong}</span>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-2">OUTPUT FORMATS</p>
                        <div className="flex flex-wrap gap-1">
                          {suggestion.outputTypes.map((type) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          className="flex-1 gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerate(suggestion.id);
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Generate
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert('Preview functionality coming soon');
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  )}

                  {!isExpanded && (
                    <CardContent className="pt-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCard(suggestion.id);
                        }}
                      >
                        Meer info
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Medium Priority Suggestions */}
      {mediumPriority.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline">
              Additional Outputs
            </Badge>
            <p className="text-sm text-muted-foreground">
              Extra tools for advanced planning
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mediumPriority.map((suggestion) => {
              const Icon = suggestion.icon;

              return (
                <Card 
                  key={suggestion.id}
                  className="border hover:border-primary/50 transition-all"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <CardTitle className="text-sm leading-tight">{suggestion.title}</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {suggestion.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-2"
                      onClick={() => handleGenerate(suggestion.id)}
                    >
                      <Download className="h-3 w-3" />
                      Genereer
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat Fallback */}
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Need Something Else?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use our AI assistant to create custom outputs not in the standard suggestions. 
                The assistant knows your complete campaign strategy and can help with:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4 list-disc list-inside">
                <li>Custom briefings (influencer, PR, partnerships)</li>
                <li>Budget scenarios and ROI projections</li>
                <li>Content calendars and editorial planning</li>
                <li>Competitive response strategies</li>
                <li>Team structure and resource planning</li>
              </ul>
              <Button className="gap-2" onClick={onOpenChat}>
                <MessageSquare className="h-4 w-4" />
                Open Chat Assistant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription className="text-xs">
            Useful shortcuts for frequently used outputs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 justify-start"
              onClick={() => handleGenerate('export-pdf')}
            >
              <Download className="h-3 w-3" />
              Export PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 justify-start"
              onClick={() => handleGenerate('copy-summary')}
            >
              <Copy className="h-3 w-3" />
              Copy Summary
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 justify-start"
              onClick={() => handleGenerate('email-team')}
            >
              <FileText className="h-3 w-3" />
              Email Team
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 justify-start"
              onClick={onOpenChat}
            >
              <MessageSquare className="h-3 w-3" />
              Custom Output
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
