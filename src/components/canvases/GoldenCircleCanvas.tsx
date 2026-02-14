import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Edit, RefreshCw, Save, X, Download, Share2, ChevronDown, ChevronUp, Target, Zap, Package, Info, Sparkles, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Separator } from '../ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';

interface GoldenCircleCanvasProps {
  onRerender: () => void;
  onEdit: (data: any) => void;
  assetData?: any;
  sessionData?: any;
  isLocked?: boolean;
}

export function GoldenCircleCanvas({ onRerender, onEdit, assetData, sessionData, isLocked = false }: GoldenCircleCanvasProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<'why' | 'how' | 'what' | null>(null);
  const [expandedSections, setExpandedSections] = useState({ why: true, how: true, what: true });
  const [exampleOpen, setExampleOpen] = useState(false);
  
  // Use session data if available, otherwise fall back to default data
  const defaultData = {
    why: "To empower businesses through innovative technology solutions that create meaningful human connections and drive sustainable growth.",
    how: "By combining cutting-edge AI and automation with human-centered design principles, creating intuitive solutions that seamlessly integrate into existing workflows.",
    what: "We develop intelligent business automation platforms, AI-powered analytics tools, and digital transformation consulting services for mid-market companies."
  };

  // Initialize with session data if available
  const sessionContent = sessionData?.aggregatedData || {};
  const initialData = {
    why: sessionContent.why || defaultData.why,
    how: sessionContent.how || defaultData.how,
    what: sessionContent.what || defaultData.what
  };

  const [editData, setEditData] = useState(initialData);

  const handleSave = () => {
    onEdit(editData);
    setIsEditing(false);
    setEditingSection(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingSection(null);
    setEditData(initialData);
  };

  const toggleSection = (section: 'why' | 'how' | 'what') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const sections = [
    {
      id: 'why' as const,
      title: 'WHY',
      subtitle: 'Purpose',
      description: 'Your core belief and reason for existence',
      icon: Target,
      color: 'blue',
      gradient: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-700 dark:text-blue-300',
      iconBg: 'bg-blue-500',
      order: 1
    },
    {
      id: 'how' as const,
      title: 'HOW',
      subtitle: 'Process',
      description: 'Your unique approach and methodology',
      icon: Zap,
      color: 'green',
      gradient: 'from-green-500 to-emerald-600',
      bgLight: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-700 dark:text-green-300',
      iconBg: 'bg-green-500',
      order: 2
    },
    {
      id: 'what' as const,
      title: 'WHAT',
      subtitle: 'Product',
      description: 'Your tangible offerings and solutions',
      icon: Package,
      color: 'orange',
      gradient: 'from-orange-500 to-amber-600',
      bgLight: 'bg-orange-50 dark:bg-orange-950',
      borderColor: 'border-orange-200 dark:border-orange-800',
      textColor: 'text-orange-700 dark:text-orange-300',
      iconBg: 'bg-orange-500',
      order: 3
    }
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Golden Circle Framework</h3>
                  <p className="text-sm text-muted-foreground">Start with why, then how, then what</p>
                </div>
              </div>
              {sessionData?.sources && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                  <Info className="h-3 w-3 mr-1" />
                  Generated from AI session
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
            </div>
          </div>

          <Separator className="my-4" />

          {/* Example Section - Collapsible */}
          <Collapsible open={exampleOpen} onOpenChange={setExampleOpen} className="mb-6">
            <Card className="border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950">
              <CollapsibleTrigger asChild>
                <div className="p-4 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <Info className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-purple-900 dark:text-purple-100">Canvas Example & Explanation</h4>
                        <p className="text-xs text-purple-700 dark:text-purple-300">See how the Golden Circle framework works</p>
                      </div>
                    </div>
                    {exampleOpen ? <ChevronUp className="h-5 w-5 text-purple-700 dark:text-purple-300" /> : <ChevronDown className="h-5 w-5 text-purple-700 dark:text-purple-300" />}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4">
                  <Separator className="bg-purple-200 dark:bg-purple-800" />
                  
                  <div className="space-y-3">
                    <p className="text-sm text-purple-900 dark:text-purple-100">
                      The Golden Circle framework, developed by Simon Sinek, helps organizations communicate from the inside out. Most companies tell you WHAT they do, some explain HOW they do it, but very few can clearly articulate WHY they do it.
                    </p>
                    
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 space-y-3 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Target className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-blue-700 dark:text-blue-300">WHY</span>
                            <span className="text-xs text-muted-foreground">• Purpose</span>
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            Example: "To challenge the status quo and think differently."
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            This is your core belief - the reason you get out of bed in the morning.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                          <Zap className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-green-700 dark:text-green-300">HOW</span>
                            <span className="text-xs text-muted-foreground">• Process</span>
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            Example: "By making beautifully designed products that are simple to use."
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            These are your unique differentiators - what makes you special.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center flex-shrink-0">
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-orange-700 dark:text-orange-300">WHAT</span>
                            <span className="text-xs text-muted-foreground">• Product</span>
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            Example: "We make computers, smartphones, and tablets."
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            These are your tangible products or services.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <p className="text-xs text-purple-900 dark:text-purple-100">
                        <strong>Key Insight:</strong> People don't buy WHAT you do, they buy WHY you do it. Starting with WHY creates an emotional connection that drives loyalty and inspires action.
                      </p>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Detailed View - Always Visible */}
          <div className="space-y-4">
            {sections.map((section, index) => {
              const Icon = section.icon;
              const isExpanded = expandedSections[section.id];
              const isEditing = editingSection === section.id;

              return (
                <Card key={section.id} className={`border-2 ${section.borderColor} overflow-hidden transition-all duration-200 hover:shadow-md`}>
                  <CardContent className="p-0">
                    {/* Section Header */}
                    <div className={`${section.bgLight} p-4 border-b ${section.borderColor}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center shadow-md`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`font-semibold ${section.textColor}`}>{section.title}</h4>
                              <span className="text-sm text-muted-foreground">• {section.subtitle}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (!isLocked) {
                                      setEditingSection(section.id);
                                      setIsEditing(true);
                                    }
                                  }}
                                  className="h-8 w-8 p-0"
                                  disabled={isLocked}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isLocked ? 'Locked - Cannot Edit' : `Edit ${section.title}`}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection(section.id)}
                            className="h-8 w-8 p-0"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Section Content */}
                    {isExpanded && (
                      <div className="p-6">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="text-foreground leading-relaxed m-0">
                            {editData[section.id]}
                          </p>
                        </div>

                        {/* Quick Tips */}
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-muted-foreground">
                              {section.id === 'why' && "Focus on your core belief and the impact you want to create. This should inspire and motivate."}
                              {section.id === 'how' && "Describe your unique approach and what differentiates you from others in the market."}
                              {section.id === 'what' && "Clearly state what you offer - products, services, or solutions you provide to customers."}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Flow Visualization */}
            <div className="flex items-center justify-center gap-3 py-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm">Start with WHY</span>
              </div>
              <ArrowRight className="h-4 w-4" />
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">Define HOW</span>
              </div>
              <ArrowRight className="h-4 w-4" />
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-sm">Deliver WHAT</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={(open) => {
        setIsEditing(open);
        if (!open) setEditingSection(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Golden Circle
            </DialogTitle>
            <DialogDescription>
              Refine your brand's purpose, process, and product to create a compelling narrative
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {sections.filter(s => !editingSection || s.id === editingSection).map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.id} className={`p-4 rounded-lg border-2 ${section.borderColor} ${section.bgLight}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${section.gradient} flex items-center justify-center shadow-md`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <label className={`font-semibold ${section.textColor} block`}>
                        {section.title} - {section.subtitle}
                      </label>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  <Textarea
                    value={editData[section.id]}
                    onChange={(e) => setEditData({...editData, [section.id]: e.target.value})}
                    placeholder={`Describe your ${section.subtitle.toLowerCase()}...`}
                    className="min-h-24 resize-none"
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    {editData[section.id].length} characters
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}