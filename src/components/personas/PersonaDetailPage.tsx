import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Persona, ResearchMethodStatus } from '../../types/persona';
import { PersonaContent } from './PersonaContent';
import { ValidationMethodButton, ValidationMethodStatus } from '../validation/ValidationMethodButton';
import { toast } from 'sonner';
import {
  ArrowLeft,
  User,
  Target,
  Heart,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Users,
  Lightbulb,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  Home,
  ChartBar,
  FlaskConical,
  BookOpen,
  Edit3,
  Save,
  X,
  Lock,
  Unlock,
  RefreshCw,
  Brain,
  MessageCircle,
  FileText,
  BarChart3,
  MousePointer,
  UserCheck,
  Network,
  Search,
  Clock,
  Shield,
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  SPACING, 
  TYPOGRAPHY, 
  ICON_SIZES, 
  ICON_CONTAINERS,
  COLORS,
  CARD_VARIANTS,
  ANIMATION,
  BADGE_VARIANTS,
  BUTTON_VARIANTS,
  cn,
} from '../../constants/design-system';
import { VALIDATION_METHODS } from '../../config/validation-methods';
import { QualityDisplay, QualityBadge } from '../quality/QualityBadge';
import { calculateQualityScore } from '../../constants/quality-system';

interface PersonaDetailPageProps {
  persona: Persona;
  onBack: () => void;
  onUpdate?: (updated: Persona) => void;
  onNavigateToAIExploration?: () => void;
}

export function PersonaDetailPage({ persona, onBack, onUpdate, onNavigateToAIExploration }: PersonaDetailPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [localPersona, setLocalPersona] = useState(persona);
  
  // Calculate metrics
  const completedMethods = localPersona.researchMethods.filter(m => m.status === 'completed').length;
  const totalMethods = localPersona.researchMethods.length;
  const qualityScore = calculateQualityScore(completedMethods, totalMethods);

  // Get status colors for persona status badge
  const getPersonaStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return { color: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Draft' };
      case 'in-research':
        return { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'In Research' };
      case 'validated':
        return { color: 'bg-green-100 text-green-700 border-green-300', label: 'Validated' };
      case 'archived':
        return { color: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Archived' };
      default:
        return { color: 'bg-gray-100 text-gray-700 border-gray-300', label: status };
    }
  };

  const personaStatusInfo = getPersonaStatusInfo(persona.status);

  // Edit handlers
  const handleSaveEdits = () => {
    setIsEditing(false);
    toast.success('Persona profile saved successfully');
  };

  const handleCancelEdits = () => {
    setIsEditing(false);
    toast.info('Edit cancelled');
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    
    // Simulate AI regeneration
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsRegenerating(false);
    toast.success('Persona profile regenerated with AI');
  };

  const handleToggleLock = () => {
    if (isLocked) {
      setIsLocked(false);
      setLockedBy(null);
      toast.success('Persona unlocked');
    } else {
      setIsLocked(true);
      setLockedBy('You');
      toast.success('Persona locked for editing');
    }
  };

  const handleStartResearch = (methodId: string) => {
    if (methodId === 'ai-exploration' && onNavigateToAIExploration) {
      // Navigate to fullscreen AI exploration page
      onNavigateToAIExploration();
    } else {
      toast.success(`Starting ${methodId} research...`);
    }
  };

  const handleViewResults = (methodId: string) => {
    toast.info(`Viewing ${methodId} results...`);
  };

  const handleAIExplorationComplete = () => {
    // Update local persona state to mark AI exploration as completed
    setLocalPersona(prev => {
      const updatedMethods = prev.researchMethods.map(m =>
        m.type === 'ai-exploration' ? { ...m, status: 'completed' as const, completedDate: new Date().toISOString() } : m
      );

      // If method doesn't exist, add it
      const methodExists = prev.researchMethods.some(m => m.type === 'ai-exploration');
      if (!methodExists) {
        updatedMethods.push({
          type: 'ai-exploration' as any,
          status: 'completed',
          completedDate: new Date().toISOString(),
        });
      }

      return { ...prev, researchMethods: updatedMethods };
    });

    // Show success toast
    toast.success('AI Exploration voltooid!', {
      description: '+35% research vertrouwen toegevoegd aan ' + persona.name,
      duration: 5000,
    });
  };

  // Helper: Map persona status to ValidationMethodStatus
  const mapPersonaStatus = (status: ResearchMethodStatus): ValidationMethodStatus => {
    switch (status) {
      case 'completed': return 'completed';
      case 'in-progress': return 'running';
      case 'not-started': return 'available';
      case 'cancelled': return 'locked';
      default: return 'available';
    }
  };

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-7xl mx-auto px-8 py-6">
      {/* Header */}
      <div className={SPACING.section.marginSmall}>
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className={ICON_SIZES.sm + " mr-2"} />
          Back to Personas
        </Button>

        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start space-x-4 flex-1">
            {/* Persona Avatar/Icon */}
            <div className={ICON_CONTAINERS.xlarge + " bg-gradient-to-br from-indigo-500 to-purple-600"}>
              <User className={ICON_SIZES.xl + " text-white"} />
            </div>

            {/* Persona Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h1 className={TYPOGRAPHY.pageTitle}>{persona.name}</h1>
                <Badge className={personaStatusInfo.color} variant="secondary">
                  {personaStatusInfo.label}
                </Badge>
              </div>
              <p className={TYPOGRAPHY.pageSubtitle + " mb-3"}>{persona.tagline}</p>
              
              {/* Stats */}
              <div className="flex items-center space-x-2">
                <QualityBadge 
                  score={qualityScore}
                  completedCount={completedMethods}
                  totalCount={totalMethods}
                  size="lg"
                  showIcon={true}
                  showScore={true}
                  showLabel={true}
                  showTooltip={true}
                />
                <span className={TYPOGRAPHY.muted}>
                  {completedMethods}/{totalMethods} methods completed
                </span>
              </div>
            </div>
          </div>

          {/* Quality Display Card */}
          <QualityDisplay
            score={qualityScore}
            completedCount={completedMethods}
            totalCount={totalMethods}
            label="Persona Quality"
            className="w-80"
          />
        </div>
      </div>

      {/* Persona Framework Accordion */}
      <Accordion type="single" collapsible className="mb-6">
        <AccordionItem value="framework" className="border rounded-xl bg-background border-primary/30 shadow-sm hover:shadow-md transition-all overflow-hidden">
          <AccordionTrigger className="hover:no-underline px-6 py-5 hover:bg-primary/5 transition-colors relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-lg text-foreground">What are Personas?</span>
                  <span className="text-sm text-muted-foreground font-normal mt-0.5">Research-based representations of your target users</span>
                </div>
              </div>
              <Badge variant="secondary" className="ml-4 bg-primary/10 text-primary border-primary/20 text-xs font-medium">
                Learn More
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-4 pb-6 px-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline" className="text-sm font-semibold">
                      User-Centered
                    </Badge>
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-base font-medium mb-3 leading-relaxed">Evidence-Based Profiles</p>
                  <p className="text-sm text-muted-foreground">
                    Personas synthesize research data into fictional but realistic characters that represent key user segments
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline" className="text-sm font-semibold">
                      Strategic Tool
                    </Badge>
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-base font-medium mb-3 leading-relaxed">Alignment & Focus</p>
                  <p className="text-sm text-muted-foreground">
                    Create shared understanding across teams and guide product, marketing, and UX decisions
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline" className="text-sm font-semibold">
                      Living Documents
                    </Badge>
                    <FlaskConical className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-base font-medium mb-3 leading-relaxed">Continuous Validation</p>
                  <p className="text-sm text-muted-foreground">
                    Personas evolve through ongoing research validation using interviews, surveys, analytics, and behavioral data
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Why Personas Matter
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>Empathy:</strong> Help teams understand and empathize with real user needs, goals, and frustrations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>Decision-Making:</strong> Provide clear criteria for evaluating features, content, and campaigns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>Communication:</strong> Enable stakeholder alignment through concrete, memorable user representations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>Validation:</strong> Track research confidence and ensure strategic decisions are grounded in evidence</span>
                  </li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Edit Controls Toolbar */}
      <div className="mb-0 px-6 py-4 rounded-t-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 border-b-0 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className={cn(BUTTON_VARIANTS.sm)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Content
              </Button>
              <Button
                onClick={handleRegenerate}
                variant="outline"
                size="sm"
                disabled={isRegenerating || (isLocked && lockedBy !== 'You')}
                className={cn(BUTTON_VARIANTS.sm, BUTTON_VARIANTS.secondary)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Regenerating...' : 'Regenerate with AI'}
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={handleSaveEdits} 
                size="sm"
                className={cn(BUTTON_VARIANTS.sm, BUTTON_VARIANTS.primary)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button 
                onClick={handleCancelEdits} 
                variant="ghost"
                size="sm"
                className={BUTTON_VARIANTS.sm}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>

        <Button
          onClick={handleToggleLock}
          variant="ghost"
          size="sm"
          className={BUTTON_VARIANTS.sm}
        >
          {isLocked ? (
            <>
              <Unlock className="h-4 w-4 mr-2" />
              Unlock
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Lock for Editing
            </>
          )}
        </Button>
      </div>

      {/* Persona Content Component */}
      <PersonaContent
        persona={localPersona}
        isEditing={isEditing}
        hasToolbar={true}
        onUpdate={onUpdate}
      />

      {/* Research & Validation Section */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Research & Validation</CardTitle>
              <CardDescription>
                Strengthen this persona through evidence-based research
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {completedMethods}/{totalMethods} methods completed
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {VALIDATION_METHODS
            .filter(method => ['ai-exploration', 'interviews', 'surveys', 'user-testing'].includes(method.id))
            .map((method) => {
              const personaMethod = localPersona.researchMethods.find((m) => m.type === method.id);
              
              // Determine status with proper type checking
              let status: ResearchMethodStatus = 'not-started';
              
              if (personaMethod?.status) {
                status = personaMethod.status;
              } else if (method.unlockLevel !== 'free' && method.unlockLevel !== 'basic') {
                // Locked methods
                status = 'cancelled';
              }
              
              return (
                <ValidationMethodButton
                  key={method.id}
                  label={method.name}
                  description={method.description}
                  type={method.id}
                  status={mapPersonaStatus(status)}
                  progress={personaMethod?.progress}
                  icon={method.icon}
                  onPrimaryClick={() => {
                    if (status === 'completed') {
                      handleViewResults(method.id);
                    } else {
                      handleStartResearch(method.id);
                    }
                  }}
                />
              );
            })}
        </CardContent>
      </Card>

      {/* Lock Indicator */}
      {isLocked && lockedBy && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-center gap-2">
          <Lock className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
          <span className="text-sm text-yellow-700 dark:text-yellow-400">
            <strong>{lockedBy}</strong> locked this persona for editing
          </span>
        </div>
      )}
      </div>
    </div>
  );
}