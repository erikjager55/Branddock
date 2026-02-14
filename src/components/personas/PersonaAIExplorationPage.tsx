import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  ArrowLeft,
  Bot,
  User,
  Sparkles,
  CheckCircle,
  Play,
  ChevronDown,
  Check,
  Target,
  Heart,
  Zap,
  Users,
  TrendingUp,
} from 'lucide-react';
import { Persona } from '../../types/persona';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner';

interface PersonaAIExplorationPageProps {
  persona: Persona;
  onBack: () => void;
  onComplete: () => void;
}

type ViewStatus = 'in-progress' | 'result';

export function PersonaAIExplorationPage({
  persona,
  onBack,
  onComplete,
}: PersonaAIExplorationPageProps) {
  const [viewStatus, setViewStatus] = useState<ViewStatus>('in-progress');
  const [currentStep, setCurrentStep] = useState(1);
  const [isTyping, setIsTyping] = useState(false);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);
  
  const totalSteps = 4;

  const [answers, setAnswers] = useState({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
  });

  const [aiReactions, setAiReactions] = useState({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
  });

  const questions = [
    {
      id: 'q1',
      question: 'Wat zijn de belangrijkste kenmerken en demografische gegevens van deze persona?',
    },
    {
      id: 'q2',
      question: 'Wat zijn de primaire doelen en motivaties van deze persona?',
    },
    {
      id: 'q3',
      question: 'Welke uitdagingen en frustraties ervaart deze persona?',
    },
    {
      id: 'q4',
      question: 'Hoe kan jouw organisatie waarde leveren aan deze persona?',
    },
  ];

  const handleAnswerSubmit = () => {
    const currentAnswer = answers[`q${currentStep}` as keyof typeof answers];
    
    if (!currentAnswer.trim()) {
      toast.error('Vul alsjeblieft een antwoord in');
      return;
    }

    // Show typing indicator
    setIsTyping(true);

    // Simulate AI reaction
    setTimeout(() => {
      const reactions = {
        q1: 'Geweldig! Deze demografische details helpen ons een helderbeeld te krijgen van wie deze persona is.',
        q2: 'Perfect! Het begrijpen van motivaties is cruciaal voor effectieve engagement strategieën.',
        q3: 'Uitstekend inzicht! Deze pijnpunten zijn essentieel om waarde toe te voegen.',
        q4: 'Fantastisch! Dit geeft ons de basis voor strategische aanbevelingen.',
      };

      setAiReactions({
        ...aiReactions,
        [`q${currentStep}`]: reactions[`q${currentStep}` as keyof typeof reactions],
      });

      setIsTyping(false);

      // Move to next step
      if (currentStep < totalSteps) {
        setTimeout(() => {
          setCurrentStep(currentStep + 1);
        }, 500);
      } else {
        // Generate report
        setTimeout(() => {
          setHasGeneratedReport(true);
          setViewStatus('result');
          onComplete();
          toast.success('AI Persona Analysis voltooid!', {
            description: 'Je persona inzichten zijn gegenereerd',
            duration: 5000,
          });
        }, 1000);
      }
    }, 1500);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Back Button */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Persona
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Result View */}
        {viewStatus === 'result' && hasGeneratedReport && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold mb-1">AI Persona Analysis</h1>
                  <p className="text-muted-foreground">Strategische inzichten voor {persona.name}</p>
                </div>
              </div>

              {/* Status Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="lg" className="min-w-[180px] justify-between bg-background">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      <span className="font-medium">Result</span>
                    </div>
                    <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuItem onClick={() => setViewStatus('in-progress')} className="cursor-pointer py-3">
                    <Play className="h-4 w-4 mr-2 text-blue-600" />
                    <span>In Progress</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewStatus('result')} className="cursor-pointer py-3">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    <span>Result</span>
                    <Check className="h-4 w-4 ml-auto" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Success Card */}
            <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <div className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
                      AI Persona Analysis Complete
                    </h3>
                    <p className="text-green-700 dark:text-green-300 mb-4 leading-relaxed">
                      Je persona analyse is succesvol gegenereerd op basis van 4 strategische dimensies.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="bg-white/60 dark:bg-slate-900/30 rounded-lg p-4 border border-green-200/50 dark:border-green-800/50">
                        <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">4</div>
                        <div className="text-sm text-green-600 dark:text-green-500">Dimensies geanalyseerd</div>
                      </div>
                      <div className="bg-white/60 dark:bg-slate-900/30 rounded-lg p-4 border border-green-200/50 dark:border-green-800/50">
                        <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">+35%</div>
                        <div className="text-sm text-green-600 dark:text-green-500">Research vertrouwen</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Generated Insights */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#1FD1B2]" />
                  Gegenereerde Inzichten
                </h3>

                <div className="space-y-6">
                  {/* Demographics */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-indigo-600" />
                      <h4 className="font-semibold text-sm">Demografische Kenmerken</h4>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {answers.q1 || 'Demografische analyse op basis van je input...'}
                    </p>
                  </div>

                  {/* Goals & Motivations */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <h4 className="font-semibold text-sm">Doelen & Motivaties</h4>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {answers.q2 || 'Motivatie analyse op basis van je input...'}
                    </p>
                  </div>

                  {/* Pain Points */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-pink-600" />
                      <h4 className="font-semibold text-sm">Uitdagingen & Frustraties</h4>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {answers.q3 || 'Pijnpunten analyse op basis van je input...'}
                    </p>
                  </div>

                  {/* Value Proposition */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-orange-600" />
                      <h4 className="font-semibold text-sm">Waarde Propositie</h4>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {answers.q4 || 'Waarde analyse op basis van je input...'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Persona
              </Button>
              <Button onClick={() => setViewStatus('in-progress')}>
                Edit Answers
              </Button>
            </div>
          </div>
        )}

        {/* In Progress View */}
        {viewStatus === 'in-progress' && (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Bot className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold mb-1">AI Persona Analysis</h1>
                    <p className="text-muted-foreground">Beantwoord de vragen om je persona te analyseren</p>
                  </div>
                </div>

                {/* Status Dropdown */}
                {hasGeneratedReport && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="lg" className="min-w-[180px] justify-between bg-background">
                        <div className="flex items-center">
                          <Play className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="font-medium">In Progress</span>
                        </div>
                        <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuItem onClick={() => setViewStatus('in-progress')} className="cursor-pointer py-3">
                        <Play className="h-4 w-4 mr-2 text-blue-600" />
                        <span>In Progress</span>
                        <Check className="h-4 w-4 ml-auto" />
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setViewStatus('result')} className="cursor-pointer py-3">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        <span>Result</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Chat Interface */}
            <Card className="border-0 shadow-xl overflow-hidden">
              {/* Chat Messages */}
              <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-6 space-y-4 min-h-[250px] max-h-[350px] overflow-y-auto">
                {/* Welcome Message */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 shadow-sm border border-border/50">
                      <p className="text-sm text-foreground">
                        Hallo! Ik help je graag om {persona.name} beter te begrijpen. Laten we beginnen met een paar vragen over deze persona.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Q&A Pairs */}
                {questions.map((q, index) => {
                  const stepNumber = index + 1;
                  const answer = answers[q.id as keyof typeof answers] || '';
                  const reaction = aiReactions[q.id as keyof typeof aiReactions] || '';

                  if (stepNumber < currentStep) {
                    // Show completed Q&A
                    return (
                      <div key={q.id} className="space-y-3">
                        {/* AI Question */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 shadow-sm border border-border/50">
                              <p className="text-sm text-foreground font-medium">{q.question}</p>
                            </div>
                          </div>
                        </div>

                        {/* User Answer */}
                        {answer && (
                          <div className="flex items-start gap-3 justify-end">
                            <div className="flex-1 max-w-[80%]">
                              <div className="bg-gradient-to-br from-indigo-500 to-indigo-500/90 rounded-2xl rounded-tr-sm p-4 shadow-sm">
                                <p className="text-sm text-white">{answer}</p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        )}

                        {/* AI Reaction */}
                        {reaction && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1FD1B2] to-emerald-500 flex items-center justify-center flex-shrink-0">
                              <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="bg-gradient-to-br from-[#1FD1B2]/10 to-emerald-50/50 dark:from-[#1FD1B2]/20 dark:to-emerald-950/30 rounded-2xl rounded-tl-sm p-4 border border-[#1FD1B2]/30">
                                <p className="text-sm text-foreground">{reaction}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } else if (stepNumber === currentStep) {
                    // Show current question
                    return (
                      <div key={q.id} className="space-y-3">
                        {/* AI Question */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 ring-2 ring-indigo-500/30">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 shadow-md border-2 border-indigo-500/30">
                              <p className="text-sm text-foreground font-medium">{q.question}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1FD1B2] to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-gradient-to-br from-[#1FD1B2]/10 to-emerald-50/50 dark:from-[#1FD1B2]/20 dark:to-emerald-950/30 rounded-2xl rounded-tl-sm p-4 border border-[#1FD1B2]/30">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-[#1FD1B2] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-[#1FD1B2] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-[#1FD1B2] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar & Input Section */}
              <div className="border-t border-border bg-background">
                {/* Progress Bar */}
                <div className="px-6 pt-4 pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span className="font-medium">Progress</span>
                    <span className="font-semibold text-indigo-600">{Math.round((currentStep / totalSteps) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                      style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-4">
                  {currentStep <= totalSteps ? (
                    <div className="space-y-3">
                      <textarea
                        value={answers[`q${currentStep}` as keyof typeof answers] || ''}
                        onChange={(e) => {
                          setAnswers({
                            ...answers,
                            [`q${currentStep}`]: e.target.value,
                          });
                        }}
                        placeholder="Type je antwoord hier..."
                        className="w-full min-h-[100px] px-4 py-3 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm bg-background"
                        disabled={isTyping}
                      />
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          onClick={handlePrevious}
                          disabled={currentStep === 1 || isTyping}
                        >
                          Previous
                        </Button>
                        <Button
                          onClick={handleAnswerSubmit}
                          disabled={isTyping || !answers[`q${currentStep}` as keyof typeof answers]?.trim()}
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-500/90 hover:to-purple-600/90 text-white"
                        >
                          {currentStep === totalSteps ? 'Complete' : 'Next'}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}