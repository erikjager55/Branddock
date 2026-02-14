import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Separator } from '../ui/separator';
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Clock,
  Users,
  Sparkles,
  ArrowLeft,
  Save,
  Loader,
  AlertCircle,
  RefreshCw,
  Calendar,
  Package,
  Video,
  Timer,
  Pause,
  Play,
  FileText,
  MessageSquare,
  Mail,
  Target,
  PlayCircle,
  Maximize2,
  Minimize2,
  Lightbulb
} from 'lucide-react';
import { logger } from '../../utils/logger';
import { CanvasWorkspaceShared } from './CanvasWorkspaceShared';

interface Workshop {
  id: string;
  date: string;
  time: string;
  description: string;
  assets?: string[];
  hasFacilitator?: boolean;
  facilitatorName?: string;
  facilitatorEmail?: string;
  meetingLink?: string;
}

interface Asset {
  id: string;
  name: string;
  icon: any;
  type: string;
}

interface CanvasWorkshopInProgressProps {
  workshops: Workshop[];
  selectedWorkshopId: string | null;
  onWorkshopSelect: (id: string) => void;
  availableAssets: Asset[];
  onApproveSession: () => void;
  onBack: () => void;
  onSwitchToApproved?: () => void;
}

// Workshop steps data
const workshopSteps = [
  {
    id: 1,
    title: 'Introduction & Warm-up',
    duration: '15 min',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
    textExplanation: 'Welcome to the Canvas Workshop! This introduction session will help participants understand the workshop objectives, get comfortable with the canvas format, and align on expected outcomes.',
    guide: [
      'Welcome participants and introduce yourself as the facilitator',
      'Explain the workshop objectives and expected outcomes',
      'Review the canvas template and its key sections',
      'Set ground rules for participation and collaboration',
      'Conduct a quick ice-breaker activity to energize the team'
    ],
    facilitatorTips: [
      'Start with a warm welcome and ensure everyone can see/hear',
      'Share your screen to show the agenda and objectives',
      'Encourage participants to turn on cameras for better engagement',
      'Set expectations for participation and decision-making',
      'Use a quick poll or chat to gauge energy and readiness'
    ],
    resultPrompt: 'Document key insights from the warm-up, participant expectations, and any immediate observations about team dynamics:'
  },
  {
    id: 2,
    title: 'Define the Core Purpose',
    duration: '30 min',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
    textExplanation: 'The core purpose is your "Why" - the fundamental reason your brand exists beyond making money. This step helps participants articulate the deeper meaning and impact of your organization.',
    guide: [
      'Start with Simon Sinek\'s Golden Circle framework introduction',
      'Ask participants: "Why does our organization exist?"',
      'Facilitate discussion on the impact you want to make in the world',
      'Identify patterns in responses and common themes',
      'Draft a preliminary purpose statement as a group',
      'Test the purpose statement: Does it inspire? Is it authentic?'
    ],
    facilitatorTips: [
      'Present the Golden Circle framework on your shared screen',
      'Use breakout rooms for small group brainstorming (5-7 min)',
      'Capture all responses in a shared document visible to everyone',
      'Look for emotional responses - purpose should inspire passion',
      'Challenge generic statements - push for authentic, unique purpose',
      'Use dot voting or polling to align on key themes'
    ],
    resultPrompt: 'Write the core purpose statement and key supporting insights:'
  },
  {
    id: 3,
    title: 'Identify Your Unique Value',
    duration: '25 min',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
    textExplanation: 'Understanding what makes your brand unique is crucial. This step explores your competitive advantages, distinctive capabilities, and what you do differently or better than others.',
    guide: [
      'List your main competitors and their offerings',
      'Identify what you do differently from competitors',
      'Discuss your unique capabilities and strengths',
      'Explore what customers say they value most about you',
      'Map out your unique unique selling propositions',
      'Prioritize the top 3-5 unique value drivers'
    ],
    facilitatorTips: [
      'Share a competitive landscape slide as a starting point',
      'Encourage honest assessment - what are we really better at?',
      'Reference customer feedback, reviews, or testimonials',
      'Push back on claims that aren\'t truly differentiated',
      'Use a 2x2 matrix to plot competitive positioning',
      'Focus on sustainable advantages, not temporary features'
    ],
    resultPrompt: 'Document your unique value propositions and competitive differentiators:'
  },
  {
    id: 4,
    title: 'Map Customer Segments & Needs',
    duration: '30 min',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
    textExplanation: 'Deep customer understanding is the foundation of a strong brand. This step helps identify your key customer segments, their pain points, and what they truly value.',
    guide: [
      'Brainstorm all possible customer segments you serve',
      'Select your top 3-5 priority customer segments',
      'For each segment, define their key characteristics',
      'Identify their main pain points and challenges',
      'Explore what success looks like from their perspective',
      'Map how your purpose and value connects to their needs'
    ],
    facilitatorTips: [
      'Display persona templates or empathy maps for structure',
      'Assign different segments to breakout groups',
      'Challenge assumptions with "How do we know this?"',
      'Look for underserved needs or emerging segments',
      'Connect back to purpose - why do these customers matter?',
      'Prioritize segments based on strategic importance'
    ],
    resultPrompt: 'List your key customer segments and their primary needs:'
  },
  {
    id: 5,
    title: 'Define Brand Values & Behaviors',
    duration: '25 min',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
    textExplanation: 'Brand values guide decisions and behaviors. This step establishes the core principles that define how you operate and interact with customers, partners, and each other.',
    guide: [
      'Brainstorm values that are truly important to your organization',
      'Discuss behaviors that exemplify each value',
      'Narrow down to 3-5 core values',
      'For each value, define what it means in practice',
      'Identify behaviors that would violate these values',
      'Create example scenarios where values guide decisions'
    ],
    facilitatorTips: [
      'Share examples of strong brand values from other companies',
      'Avoid generic values like "excellence" or "integrity"',
      'Test each value: "Would we make sacrifices for this?"',
      'Ask for real stories where these values were demonstrated',
      'Ensure values align with purpose and unique value',
      'Make values actionable with concrete behavioral examples'
    ],
    resultPrompt: 'Write your core brand values and associated behaviors:'
  },
  {
    id: 6,
    title: 'Synthesis & Action Planning',
    duration: '20 min',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
    textExplanation: 'The final step brings everything together and creates a clear action plan. Review what you\'ve created, identify gaps, and define next steps to bring your brand canvas to life.',
    guide: [
      'Review all completed sections of the canvas together',
      'Identify any gaps or inconsistencies',
      'Discuss how different elements connect and reinforce each other',
      'Prioritize which elements need further refinement',
      'Create an action plan with owners and timelines',
      'Schedule follow-up sessions if needed',
      'Celebrate the team\'s collaborative work!'
    ],
    facilitatorTips: [
      'Display the complete canvas for a holistic view',
      'Highlight connections and coherence across sections',
      'Identify any contradictions or weak areas',
      'Assign clear owners for follow-up actions',
      'Set deadlines for refinement and next steps',
      'End on a high note - celebrate progress and commitment',
      'Share session recording and outputs with all participants'
    ],
    resultPrompt: 'Summarize key insights and next steps:'
  }
];

export function CanvasWorkshopInProgress({
  workshops,
  selectedWorkshopId,
  onWorkshopSelect,
  availableAssets,
  onApproveSession,
  onBack,
  onSwitchToApproved
}: CanvasWorkshopInProgressProps) {
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [sessionPaused, setSessionPaused] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionDuration, setSessionDuration] = useState('0:00');
  const [mode, setMode] = useState<'videoask' | 'facilitator'>('videoask');
  const [stepResponses, setStepResponses] = useState<Record<number, string>>({});
  const [isPresentationExpanded, setIsPresentationExpanded] = useState(false);

  // Canvas blocks for the workspace (used in Facilitator mode)
  const [canvasBlocks, setCanvasBlocks] = useState([
    { id: 'vision', title: 'Vision Statement', content: '', icon: 'eye' },
    { id: 'mission', title: 'Mission Statement', content: '', icon: 'target' },
    { id: 'values', title: 'Core Values', content: '', icon: 'heart' },
    { id: 'purpose', title: 'Purpose', content: '', icon: 'users' }
  ]);

  const selectedWorkshop = workshops.find(w => w.id === selectedWorkshopId);
  const workshopAssets = selectedWorkshop?.assets?.map(assetId =>
    availableAssets.find(a => a.id === assetId)
  ).filter(Boolean) || [];
  
  const currentStepData = workshopSteps.find(s => s.id === currentStep) || workshopSteps[0];
  const progressPercentage = ((currentStep - 1) / (workshopSteps.length - 1)) * 100;

  // Session timer
  useEffect(() => {
    if (!sessionPaused) {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - sessionStartTime.getTime();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setSessionDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessionStartTime, sessionPaused]);

  const handleSaveProgress = () => {
    setLastSavedTime(new Date());
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const handlePauseSession = () => {
    setSessionPaused(true);
    handleSaveProgress();
  };

  const handleResumeSession = () => {
    setSessionPaused(false);
  };

  const handleSaveAndExit = () => {
    handleSaveProgress();
    onBack();
  };

  const formatLastSavedTime = () => {
    if (!lastSavedTime) return 'Not saved';
    const now = new Date();
    const diff = now.getTime() - lastSavedTime.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Saved just now';
    if (minutes === 1) return 'Saved 1 minute ago';
    return `Saved ${minutes} minutes ago`;
  };

  const handleApproveClick = () => {
    setShowApprovalDialog(true);
  };

  const handleConfirmApproval = () => {
    handleSaveProgress();
    setShowApprovalDialog(false);
    onApproveSession();
    if (onSwitchToApproved) {
      onSwitchToApproved();
    }
  };

  const handleBlockEdit = (blockId: string, content: string) => {
    setCanvasBlocks(prev =>
      prev.map(block =>
        block.id === blockId ? { ...block, content } : block
      )
    );
  };

  const handleBlockRegenerate = (blockId: string) => {
    // AI regeneration logic would go here
    logger.interaction('Regenerate block', { blockId });
  };

  const handleStepResponseChange = (value: string) => {
    setStepResponses(prev => ({
      ...prev,
      [currentStep]: value
    }));
  };

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Save Toast Notification */}
      {showSaveToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardContent className="p-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Progress saved successfully
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Section - Workshops List (Horizontal) */}
      <Card className="w-full shrink-0 shadow-sm">
        <CardHeader className="pb-3 border-b bg-gradient-to-r from-muted/50 to-background">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Workshops</CardTitle>
              <CardDescription className="text-xs">
                {workshops.length} scheduled
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto px-3 py-4">
          <div className="flex gap-3 min-w-max">
            {workshops.map((workshop) => (
              <button
                key={workshop.id}
                onClick={() => onWorkshopSelect(workshop.id)}
                className={`w-80 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md group shrink-0 ${
                  selectedWorkshopId === workshop.id
                    ? 'bg-primary/5 border-primary shadow-sm'
                    : 'bg-card border-border hover:border-primary/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <Badge 
                    variant={selectedWorkshopId === workshop.id ? 'default' : 'secondary'} 
                    className="text-xs font-medium"
                  >
                    {workshop.date}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {workshop.time}
                  </span>
                </div>
                
                <h4 className={`text-sm font-semibold mb-2 line-clamp-2 ${
                  selectedWorkshopId === workshop.id ? 'text-primary' : 'text-foreground'
                }`}>
                  {workshop.description}
                </h4>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {workshop.hasFacilitator && (
                    <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300">
                      <Users className="h-3 w-3 mr-1" />
                      Facilitator
                    </Badge>
                  )}
                  {workshop.assets && workshop.assets.length > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Package className="h-3 w-3 mr-1" />
                      {workshop.assets.length} asset{workshop.assets.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="px-3 pb-3 border-t pt-3 bg-muted/30">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </Card>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden rounded-xl border shadow-sm bg-background">
        {selectedWorkshop ? (
          <>
            {/* Header / Toolbar */}
            <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="h-16 px-6 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <h2 className="font-semibold text-lg truncate" title={selectedWorkshop.description}>
                    {selectedWorkshop.description}
                  </h2>
                  
                  <Separator orientation="vertical" className="h-6" />
                  
                  {/* Mode Switcher */}
                  <div className="flex items-center p-1 bg-muted/70 rounded-lg border shadow-sm">
                    <Button 
                      variant={mode === 'videoask' ? 'default' : 'ghost'} 
                      size="sm" 
                      className={`h-8 px-3 text-xs font-medium transition-all ${
                        mode === 'videoask' ? 'shadow-sm' : 'hover:bg-muted'
                      }`}
                      onClick={() => setMode('videoask')}
                    >
                      <Video className="h-3.5 w-3.5 mr-1.5" />
                      Video Guide
                    </Button>
                    <Button 
                      variant={mode === 'facilitator' ? 'default' : 'ghost'} 
                      size="sm"
                      className={`h-8 px-3 text-xs font-medium transition-all ${
                        mode === 'facilitator' ? 'shadow-sm' : 'hover:bg-muted'
                      }`}
                      onClick={() => setMode('facilitator')}
                    >
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      Facilitator
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!sessionPaused ? (
                    <>
                      <div className="flex items-center text-sm font-semibold bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20">
                        <Timer className="h-4 w-4 mr-2" />
                        {sessionDuration}
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={handlePauseSession} 
                        className="h-9 w-9 p-0 rounded-full hover:bg-muted" 
                        title="Pause session"
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleApproveClick}
                        className="h-9 px-4"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                    </>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={handleResumeSession} 
                      className="bg-green-600 hover:bg-green-700 h-9 px-4"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Resume Session
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto bg-muted/20">
              {mode === 'videoask' ? (
                // VideoAsk / Self-Guided Mode
                <div className="h-full flex flex-col">
                  {/* Step Navigator */}
                  <div className="bg-background border-b px-6 py-4">
                    <div className="max-w-6xl mx-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm text-muted-foreground">Workshop Steps</h3>
                        <div className="text-xs text-muted-foreground">
                          {Object.keys(stepResponses).length} of {workshopSteps.length} steps completed
                        </div>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {workshopSteps.map((step, index) => {
                          const isActive = currentStep === step.id;
                          const isCompleted = stepResponses[step.id] && stepResponses[step.id].trim() !== '';
                          const isPast = step.id < currentStep;
                          
                          return (
                            <React.Fragment key={step.id}>
                              <button
                                onClick={() => setCurrentStep(step.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all min-w-[200px] ${ 
                                  isActive 
                                    ? 'border-primary bg-primary/10 shadow-sm' 
                                    : isCompleted
                                    ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20 hover:border-green-500/50'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                }`}
                              >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                                  isCompleted
                                    ? 'bg-green-500 text-white'
                                    : isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : step.id}
                                </div>
                                <div className="flex-1 text-left">
                                  <div className={`text-xs font-medium ${isActive ? 'text-primary' : isCompleted ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                                    Step {step.id}
                                  </div>
                                  <div className={`text-sm font-semibold line-clamp-1 ${isActive ? 'text-foreground' : 'text-foreground/70'}`}>
                                    {step.title}
                                  </div>
                                </div>
                              </button>
                              {index < workshopSteps.length - 1 && (
                                <ChevronRight className={`h-4 w-4 flex-shrink-0 ${isPast ? 'text-green-500' : 'text-muted-foreground'}`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Left: Video & Instructions */}
                    <div className="w-full lg:w-1/2 bg-background border-b lg:border-b-0 lg:border-r overflow-y-auto">
                      <div className="h-full flex flex-col p-8 space-y-6">
                        {/* Step Header */}
                        <div className="flex items-center justify-between pb-2">
                          <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-semibold px-3 py-1">
                            Step {currentStep} of {workshopSteps.length}
                          </Badge>
                          <span className="text-sm text-muted-foreground font-medium">
                            {currentStepData.duration}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-3xl font-bold tracking-tight">{currentStepData.title}</h3>
                          <p className="text-base text-muted-foreground leading-relaxed">
                            {currentStepData.textExplanation}
                          </p>
                        </div>
                        
                        {/* Video Player - Takes remaining space */}
                        <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-700/50 relative group min-h-0">
                          <iframe
                            width="100%"
                            height="100%"
                            src={currentStepData.videoUrl}
                            title={currentStepData.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Input / Response */}
                    <div className="w-full lg:w-1/2 p-8 flex flex-col bg-gradient-to-br from-muted/30 to-muted/10">
                      <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col">
                        {/* Response Card */}
                        <Card className="border-2 shadow-lg flex-1 flex flex-col">
                          <CardHeader className="pb-4 border-b bg-gradient-to-b from-muted/50 to-background">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                                <MessageSquare className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-base">Your Response</CardTitle>
                                <CardDescription className="text-xs">
                                  Document your insights for this step
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="p-6 flex-1 flex flex-col">
                            <div className="space-y-3 flex-1 flex flex-col">
                              <label className="text-sm font-semibold text-foreground">
                                {currentStepData.resultPrompt}
                              </label>
                              <Textarea 
                                className="flex-1 min-h-[250px] resize-none text-base p-4 border-2 focus:ring-2 focus:ring-primary/20" 
                                placeholder="Share your thoughts, ideas, and key takeaways..."
                                value={stepResponses[currentStep] || ''}
                                onChange={(e) => handleStepResponseChange(e.target.value)}
                              />
                            </div>
                          </CardContent>

                          <CardFooter className="border-t bg-muted/30 p-4 flex items-center justify-between">
                            <Button 
                              variant="outline" 
                              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                              disabled={currentStep === 1}
                              className="h-10 px-5"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            <Button 
                              onClick={() => setCurrentStep(prev => Math.min(workshopSteps.length, prev + 1))}
                              disabled={currentStep === workshopSteps.length && !stepResponses[currentStep]}
                              className="h-10 px-5"
                            >
                              {currentStep === workshopSteps.length ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Finish
                                </>
                              ) : (
                                <>
                                  Next Step
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </>
                              )}
                            </Button>
                          </CardFooter>
                        </Card>
                        
                        {/* Progress Indicator */}
                        <div className="mt-6 space-y-2">
                          <div className="flex justify-between text-xs font-medium text-muted-foreground">
                            <span>Overall Progress</span>
                            <span className="text-primary">{Math.round(progressPercentage)}% Complete</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2 shadow-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Facilitator Mode
                <div className="h-full flex flex-col">
                  {/* Step Navigator */}
                  <div className="bg-background border-b px-6 py-4">
                    <div className="max-w-6xl mx-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm text-muted-foreground">Workshop Steps</h3>
                        <div className="text-xs text-muted-foreground">
                          {Object.keys(stepResponses).length} of {workshopSteps.length} steps completed
                        </div>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {workshopSteps.map((step, index) => {
                          const isActive = currentStep === step.id;
                          const isCompleted = stepResponses[step.id] && stepResponses[step.id].trim() !== '';
                          const isPast = step.id < currentStep;
                          
                          return (
                            <React.Fragment key={step.id}>
                              <button
                                onClick={() => setCurrentStep(step.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all min-w-[200px] ${ 
                                  isActive 
                                    ? 'border-primary bg-primary/10 shadow-sm' 
                                    : isCompleted
                                    ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20 hover:border-green-500/50'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                }`}
                              >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                                  isCompleted
                                    ? 'bg-green-500 text-white'
                                    : isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : step.id}
                                </div>
                                <div className="flex-1 text-left">
                                  <div className={`text-xs font-medium ${isActive ? 'text-primary' : isCompleted ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                                    Step {step.id}
                                  </div>
                                  <div className={`text-sm font-semibold line-clamp-1 ${isActive ? 'text-foreground' : 'text-foreground/70'}`}>
                                    {step.title}
                                  </div>
                                </div>
                              </button>
                              {index < workshopSteps.length - 1 && (
                                <ChevronRight className={`h-4 w-4 flex-shrink-0 ${isPast ? 'text-green-500' : 'text-muted-foreground'}`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Left: Presentation & Tips */}
                    <div className="w-full lg:w-1/2 bg-background border-b lg:border-b-0 lg:border-r overflow-y-auto">
                      <div className="h-full flex flex-col p-8 space-y-6">
                        {/* Step Header */}
                        <div className="flex items-center justify-between pb-2">
                          <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-semibold px-3 py-1">
                            Step {currentStep} of {workshopSteps.length}
                          </Badge>
                          <span className="text-sm text-muted-foreground font-medium">
                            {currentStepData.duration}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-3xl font-bold tracking-tight">{currentStepData.title}</h3>
                          <p className="text-base text-muted-foreground leading-relaxed">
                            {currentStepData.textExplanation}
                          </p>
                        </div>
                        
                        {/* Presentation Window - Takes remaining space */}
                        <div className="flex-1 min-h-0 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Target className="h-4 w-4 text-primary" />
                              Presentation Workspace
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsPresentationExpanded(!isPresentationExpanded)}
                              className="h-8 px-3"
                            >
                              {isPresentationExpanded ? (
                                <>
                                  <Minimize2 className="h-3.5 w-3.5 mr-1.5" />
                                  Minimize
                                </>
                              ) : (
                                <>
                                  <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                                  Expand
                                </>
                              )}
                            </Button>
                          </div>
                          
                          <div className={`bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl overflow-hidden shadow-xl ring-1 ring-slate-200 dark:ring-slate-700/50 relative transition-all ${
                            isPresentationExpanded ? 'flex-1' : 'h-64'
                          }`}>
                            {/* Placeholder Presentation Content */}
                            <div className="absolute inset-0 flex items-center justify-center p-8">
                              <div className="text-center space-y-3">
                                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                                  <FileText className="h-8 w-8 text-primary" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                  Share your screen here for live presentation
                                </p>
                                <p className="text-xs text-muted-foreground/70">
                                  Slides, canvas, or supporting materials
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Facilitator Tips */}
                          {!isPresentationExpanded && (
                            <Card className="border-2 shadow-sm bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900">
                              <CardContent className="p-5 space-y-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                                  </div>
                                  <h4 className="font-semibold text-amber-900 dark:text-amber-100">Facilitator Tips</h4>
                                </div>
                                <ul className="space-y-2.5 ml-1">
                                  {currentStepData.facilitatorTips.map((tip, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-amber-900/80 dark:text-amber-100/80">
                                      <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold mt-0.5">
                                        {i + 1}
                                      </span>
                                      <span className="flex-1 leading-relaxed">{tip}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Input / Response */}
                    <div className="w-full lg:w-1/2 p-8 flex flex-col bg-gradient-to-br from-muted/30 to-muted/10">
                      <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col">
                        {/* Response Card */}
                        <Card className="border-2 shadow-lg flex-1 flex flex-col">
                          <CardHeader className="pb-4 border-b bg-gradient-to-b from-muted/50 to-background">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                                <MessageSquare className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-base">Workshop Notes</CardTitle>
                                <CardDescription className="text-xs">
                                  Document key outcomes for this step
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="p-6 flex-1 flex flex-col">
                            <div className="space-y-3 flex-1 flex flex-col">
                              <label className="text-sm font-semibold text-foreground">
                                {currentStepData.resultPrompt}
                              </label>
                              <Textarea 
                                className="flex-1 min-h-[250px] resize-none text-base p-4 border-2 focus:ring-2 focus:ring-primary/20" 
                                placeholder="Capture insights, decisions, and action items..."
                                value={stepResponses[currentStep] || ''}
                                onChange={(e) => handleStepResponseChange(e.target.value)}
                              />
                            </div>
                          </CardContent>

                          <CardFooter className="border-t bg-muted/30 p-4 flex items-center justify-between">
                            <Button 
                              variant="outline" 
                              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                              disabled={currentStep === 1}
                              className="h-10 px-5"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            <Button 
                              onClick={() => setCurrentStep(prev => Math.min(workshopSteps.length, prev + 1))}
                              disabled={currentStep === workshopSteps.length && !stepResponses[currentStep]}
                              className="h-10 px-5"
                            >
                              {currentStep === workshopSteps.length ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Finish
                                </>
                              ) : (
                                <>
                                  Next Step
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </>
                              )}
                            </Button>
                          </CardFooter>
                        </Card>
                        
                        {/* Progress Indicator */}
                        <div className="mt-6 space-y-2">
                          <div className="flex justify-between text-xs font-medium text-muted-foreground">
                            <span>Overall Progress</span>
                            <span className="text-primary">{Math.round(progressPercentage)}% Complete</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2 shadow-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto shadow-inner">
                <PlayCircle className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Select a Workshop</h3>
                <p className="text-muted-foreground">
                  Choose a workshop from the sidebar to begin your session, watch video guides, or collaborate with your facilitator.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-center text-xl">Complete Workshop Session?</DialogTitle>
            <DialogDescription className="text-center">
              Mark this session as complete and lock the outcomes for review.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-100 space-y-2">
                    <p className="font-semibold">What happens next:</p>
                    <ul className="space-y-1.5 text-xs leading-relaxed">
                      <li className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-blue-600" />
                        Session marked as approved and completed
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-blue-600" />
                        Canvas blocks locked for editing
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-blue-600" />
                        Results available for export and review
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmApproval} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}