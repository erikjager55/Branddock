import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Check,
  Circle,
  CheckCircle,
  Lock,
  Unlock,
  Save,
  Eye,
  Heart,
  Globe,
  Target,
  TrendingUp,
  Users,
  HelpCircle,
  FileText,
  Zap,
  Package
} from 'lucide-react';
import { SessionNavigator } from '../SessionNavigator';
import { mockBrandAssets } from '../../data/mock-brand-assets';
import { Bundle } from '../../types/brand-asset';

// Asset-specific interview questions
const assetQuestions: Record<string, { id: string; question: string }[]> = {
  'vision-mission': [
    { id: 'vision-q1', question: 'What is your vision for the company in 5-10 years?' },
    { id: 'vision-q2', question: 'Why does this company exist? What is its core purpose?' },
    { id: 'vision-q3', question: 'What impact do you want the company to have on the world?' }
  ],
  'core-values': [
    { id: 'values-q1', question: 'What principles guide your decision-making?' },
    { id: 'values-q2', question: 'What values are absolutely non-negotiable for this company?' },
    { id: 'values-q3', question: 'How do these values show up in day-to-day operations?' }
  ],
  'brand-positioning': [
    { id: 'positioning-q1', question: 'How do you perceive our brand in the market?' },
    { id: 'positioning-q2', question: 'What makes us different from competitors?' },
    { id: 'positioning-q3', question: 'Who do you see as our ideal customer?' }
  ],
  'golden-circle': [
    { id: 'golden-q1', question: 'What is our "Why" - our core belief or cause?' },
    { id: 'golden-q2', question: 'How do we do things differently from others?' },
    { id: 'golden-q3', question: 'What do we do - what is our product/service offering?' }
  ],
  'brand-archetype': [
    { id: 'archetype-q1', question: 'If our brand were a person, who would they be?' },
    { id: 'archetype-q2', question: 'What personality traits best describe our brand?' },
    { id: 'archetype-q3', question: 'How should our brand make people feel?' }
  ],
  'social-relevancy': [
    { id: 'social-q1', question: 'What impact should we have on society?' },
    { id: 'social-q2', question: 'How do we contribute to the greater good?' },
    { id: 'social-q3', question: 'What role do we play in addressing social challenges?' }
  ],
  'trends': [
    { id: 'trends-q1', question: 'What trends will shape our industry in the coming years?' },
    { id: 'trends-q2', question: 'What changes do you foresee that we should prepare for?' },
    { id: 'trends-q3', question: 'What emerging opportunities or threats do you see?' }
  ]
};

interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

interface Interview {
  id: string;
  interviewee: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  date: string;
  time: string;
  duration: number;
  selectedAssets: string[];
  notes: string;
  interviewResults: string;
  questionAnswers?: Record<string, string>;
  status: string;
  lockStatus?: string;
  lockedBy?: string;
  lockedAt?: Date;
}

interface Asset {
  id: string;
  name: string;
  icon: any;
  type: string;
}

interface InterviewWorkflowStepProps {
  step: WorkflowStep;
  interview: Interview;
  availableAssets: Asset[];
  updateInterview: (id: string, field: string, value: any) => void;
  toggleAssetSelection: (id: string, assetId: string) => void;
  handleLockInterview: (id: string) => void;
  handleUnlockInterview: (id: string) => void;
  openDetailView: (id: string) => void;
  formatDate: (date?: Date) => string;
  isLastStep: boolean;
  // Bundle & Boost props
  activeBundle?: Bundle | null;
  boostedAssets?: string[];
  onBoostAsset?: (assetId: string) => void;
  // Session Navigation props
  researchPlanConfig?: {
    entryMode?: 'asset' | 'bundle' | 'questionnaire';
    unlockedAssets?: string[];
  } | null;
  onNavigateToAsset?: (assetId: string) => void;
  onReturnToHub?: () => void;
  currentAssetId?: string;
}

export function InterviewWorkflowStep({
  step,
  interview,
  availableAssets,
  updateInterview,
  toggleAssetSelection,
  handleLockInterview,
  handleUnlockInterview,
  openDetailView,
  formatDate,
  isLastStep,
  activeBundle,
  boostedAssets,
  onBoostAsset,
  researchPlanConfig,
  onNavigateToAsset,
  onReturnToHub,
  currentAssetId
}: InterviewWorkflowStepProps) {
  return (
    <div 
      className={`relative pl-8 pb-4 ${
        !isLastStep ? 'border-l-2' : ''
      } ${
        step.isCompleted 
          ? 'border-green-500' 
          : step.isCurrent
          ? 'border-blue-500'
          : 'border-gray-300'
      }`}
    >
      {/* Step indicator */}
      <div className={`absolute left-[-13px] top-0 flex items-center justify-center w-6 h-6 rounded-full border-2 ${
        step.isCompleted
          ? 'bg-green-500 border-green-500'
          : step.isCurrent
          ? 'bg-blue-500 border-blue-500'
          : 'bg-background border-gray-300'
      }`}>
        {step.isCompleted ? (
          <Check className="h-3 w-3 text-white" />
        ) : step.isCurrent ? (
          <Circle className="h-2 w-2 text-white fill-white" />
        ) : (
          <Circle className="h-2 w-2 text-gray-400" />
        )}
      </div>

      {/* Step content */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h4 className={`text-sm font-medium ${
            step.isCurrent ? 'text-blue-600' : 
            step.isCompleted ? 'text-green-600' : 
            'text-muted-foreground'
          }`}>
            Step {step.step}: {step.title}
          </h4>
          {step.isCurrent && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              Current
            </Badge>
          )}
          {step.isCompleted && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              Complete
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{step.description}</p>

        {/* Step 1: Contact Information */}
        {step.step === 1 && (
          <div className="space-y-3 mt-3 p-3 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Interviewee Name</Label>
                <Input 
                  value={interview.interviewee}
                  onChange={(e) => updateInterview(interview.id, 'interviewee', e.target.value)}
                  placeholder="John Smith"
                  className="h-8 text-sm"
                  disabled={interview.lockStatus === 'locked'}
                />
              </div>
              <div>
                <Label className="text-xs">Position</Label>
                <Input 
                  value={interview.position}
                  onChange={(e) => updateInterview(interview.id, 'position', e.target.value)}
                  placeholder="CEO"
                  className="h-8 text-sm"
                  disabled={interview.lockStatus === 'locked'}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Email</Label>
                <Input 
                  value={interview.email}
                  onChange={(e) => updateInterview(interview.id, 'email', e.target.value)}
                  placeholder="john@company.com"
                  type="email"
                  className="h-8 text-sm"
                  disabled={interview.lockStatus === 'locked'}
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input 
                  value={interview.phone}
                  onChange={(e) => updateInterview(interview.id, 'phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="h-8 text-sm"
                  disabled={interview.lockStatus === 'locked'}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Company</Label>
              <Input 
                value={interview.company}
                onChange={(e) => updateInterview(interview.id, 'company', e.target.value)}
                placeholder="Company Inc."
                className="h-8 text-sm"
                disabled={interview.lockStatus === 'locked'}
              />
            </div>
          </div>
        )}

        {/* Step 2: Schedule Interview */}
        {step.step === 2 && (
          <div className="space-y-3 mt-3 p-3 bg-muted/50 rounded-lg">
            {/* Bundle Info */}
            {activeBundle && (
              <div 
                className="flex items-center gap-2 p-2 rounded-lg border mb-3"
                style={{ 
                  backgroundColor: `${activeBundle.color}10`, 
                  borderColor: activeBundle.color 
                }}
              >
                <Package className="h-4 w-4" style={{ color: activeBundle.color }} />
                <div className="flex-1">
                  <div className="text-xs font-medium" style={{ color: activeBundle.color }}>
                    {activeBundle.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activeBundle.description}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {activeBundle.includedAssets.length} assets
                </Badge>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Date</Label>
                <Input 
                  type="date"
                  value={interview.date}
                  onChange={(e) => updateInterview(interview.id, 'date', e.target.value)}
                  className="h-8 text-sm"
                  disabled={interview.lockStatus === 'locked'}
                />
              </div>
              <div>
                <Label className="text-xs">Time</Label>
                <Input 
                  type="time"
                  value={interview.time}
                  onChange={(e) => updateInterview(interview.id, 'time', e.target.value)}
                  className="h-8 text-sm"
                  disabled={interview.lockStatus === 'locked'}
                />
              </div>
              <div>
                <Label className="text-xs">Duration (min)</Label>
                <Input 
                  type="number"
                  value={interview.duration}
                  onChange={(e) => updateInterview(interview.id, 'duration', parseInt(e.target.value) || 60)}
                  className="h-8 text-sm"
                  disabled={interview.lockStatus === 'locked'}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Brand Assets to Discuss</Label>
              <div className="grid grid-cols-2 gap-2">
                {availableAssets.slice(0, 4).map(asset => {
                  const Icon = asset.icon;
                  const isSelected = interview.selectedAssets.includes(asset.id);
                  const isBoosted = boostedAssets?.includes(asset.id);
                  return (
                    <div
                      key={asset.id}
                      className={`relative text-xs border rounded p-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-blue-50 dark:bg-blue-950/20'
                          : 'border-border hover:border-primary'
                      } ${interview.lockStatus === 'locked' ? 'opacity-50 cursor-not-allowed' : ''} ${
                        isBoosted ? 'ring-2 ring-amber-400 shadow-sm' : ''
                      }`}
                    >
                      {/* Boost badge */}
                      {isBoosted && (
                        <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-0.5">
                          <Zap className="h-2.5 w-2.5 text-white fill-current" />
                        </div>
                      )}
                      
                      {/* Asset selection area */}
                      <div 
                        className="cursor-pointer"
                        onClick={() => {
                          if (interview.lockStatus !== 'locked') {
                            toggleAssetSelection(interview.id, asset.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <Icon className="h-3 w-3 text-primary" />
                          <span className="text-xs truncate flex-1">{asset.name}</span>
                          {isSelected && <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />}
                        </div>
                      </div>
                      
                      {/* Boost button */}
                      {onBoostAsset && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-5 text-xs w-full mt-1.5 ${
                            isBoosted 
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                              : 'hover:bg-muted'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBoostAsset(asset.id);
                          }}
                          disabled={interview.lockStatus === 'locked'}
                        >
                          <Zap className={`h-3 w-3 mr-1 ${isBoosted ? 'fill-current' : ''}`} />
                          {isBoosted ? 'Boosted' : 'Boost'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 text-xs w-full"
                onClick={() => openDetailView(interview.id)}
              >
                View All {availableAssets.length} Assets
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  if (interview.status === 'add-contact') {
                    updateInterview(interview.id, 'status', 'contacted');
                  }
                }}
                disabled={interview.status !== 'add-contact' || interview.lockStatus === 'locked'}
              >
                Mark as Contacted
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  updateInterview(interview.id, 'status', 'appointment-made');
                }}
                disabled={interview.status === 'appointment-made' || interview.lockStatus === 'locked'}
              >
                Confirm Appointment
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Document Results */}
        {step.step === 3 && (() => {
          // Get relevant questions based on selected assets
          const relevantQuestions: { id: string; question: string; assetName: string }[] = [];
          interview.selectedAssets.forEach(assetId => {
            const asset = availableAssets.find(a => a.id === assetId);
            const questions = assetQuestions[assetId] || [];
            questions.forEach(q => {
              relevantQuestions.push({
                ...q,
                assetName: asset?.name || assetId
              });
            });
          });

          // Update question answer helper
          const updateQuestionAnswer = (questionId: string, answer: string) => {
            const currentAnswers = interview.questionAnswers || {};
            updateInterview(interview.id, 'questionAnswers', {
              ...currentAnswers,
              [questionId]: answer
            });
          };
          
          // Get unlocked assets for SessionNavigator
          const unlockedAssets = researchPlanConfig?.unlockedAssets 
            ? mockBrandAssets.filter(asset => researchPlanConfig.unlockedAssets!.includes(asset.id))
            : mockBrandAssets;

          return (
            <div className="space-y-4 mt-3">
              {/* Session Navigator - Only show if in bundle mode */}
              {researchPlanConfig?.entryMode === 'bundle' && unlockedAssets.length > 1 && currentAssetId && onNavigateToAsset && onReturnToHub && (
                <SessionNavigator
                  currentAssetId={currentAssetId}
                  currentMethodType="interviews"
                  allAssets={unlockedAssets}
                  onNavigateToAsset={onNavigateToAsset}
                  onReturnToHub={onReturnToHub}
                />
              )}
              
              <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                {/* General Summary */}
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    General Interview Summary
                  </Label>
                  <Textarea 
                    value={interview.interviewResults}
                    onChange={(e) => updateInterview(interview.id, 'interviewResults', e.target.value)}
                    placeholder="Provide a high-level summary of the interview, key themes, and notable quotes..."
                    rows={4}
                    className="text-sm mt-1"
                    disabled={interview.lockStatus === 'locked'}
                  />
                </div>

                {/* Asset-Specific Questions */}
                {relevantQuestions.length > 0 && (
                  <div className="space-y-3 border-t pt-3 mt-3">
                    <Label className="text-xs flex items-center gap-1">
                      <HelpCircle className="h-3 w-3" />
                      Asset-Specific Questions ({relevantQuestions.length})
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Answer questions related to the selected brand assets
                    </p>
                    
                    {relevantQuestions.map((q, index) => (
                      <div key={q.id} className="space-y-1.5">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="text-xs bg-background shrink-0">
                            {q.assetName}
                          </Badge>
                          <Label className="text-xs leading-relaxed">
                            {index + 1}. {q.question}
                          </Label>
                        </div>
                        <Textarea 
                          value={interview.questionAnswers?.[q.id] || ''}
                          onChange={(e) => updateQuestionAnswer(q.id, e.target.value)}
                          placeholder="Enter interviewee's answer..."
                          rows={2}
                          className="text-sm"
                          disabled={interview.lockStatus === 'locked'}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {relevantQuestions.length === 0 && (
                  <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded p-2">
                    <p className="flex items-center gap-1">
                      <HelpCircle className="h-3 w-3" />
                      No brand assets selected. Select assets in Step 2 to see relevant questions.
                    </p>
                  </div>
                )}

                <Button
                  size="sm"
                  className="h-7 text-xs w-full mt-3"
                  onClick={() => {
                    updateInterview(interview.id, 'status', 'results-added');
                  }}
                  disabled={!interview.interviewResults || interview.status === 'results-added' || interview.lockStatus === 'locked'}
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save Results
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Step 4: Conduct Interview */}
        {step.step === 4 && (
          <div className="space-y-3 mt-3 p-3 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-xs">Interview Notes</Label>
              <Textarea 
                value={interview.notes}
                onChange={(e) => updateInterview(interview.id, 'notes', e.target.value)}
                placeholder="Add notes during or after the interview..."
                rows={3}
                className="text-sm mt-1"
                disabled={interview.lockStatus === 'locked'}
              />
            </div>
            <Button
              size="sm"
              className="h-7 text-xs w-full"
              onClick={() => {
                updateInterview(interview.id, 'status', 'interview-held');
              }}
              disabled={interview.status === 'interview-held' || interview.status === 'results-added' || interview.lockStatus === 'locked'}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Mark Interview as Completed
            </Button>
          </div>
        )}

        {/* Step 5: Lock & Approve */}
        {step.step === 5 && (
          <div className="space-y-3 mt-3 p-3 bg-muted/50 rounded-lg">
            {interview.lockStatus === 'locked' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <Lock className="h-4 w-4" />
                  <span className="font-medium">Interview is locked and approved</span>
                </div>
                {interview.lockedBy && (
                  <p className="text-xs text-muted-foreground">
                    Locked by {interview.lockedBy} on {formatDate(interview.lockedAt)}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs w-full"
                  onClick={() => handleUnlockInterview(interview.id)}
                >
                  <Unlock className="h-3 w-3 mr-1" />
                  Unlock Interview
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Lock this interview to finalize it for reporting and prevent further edits.
                </p>
                <Button
                  size="sm"
                  className="h-7 text-xs w-full"
                  onClick={() => handleLockInterview(interview.id)}
                  disabled={interview.status !== 'results-added'}
                >
                  <Lock className="h-3 w-3 mr-1" />
                  Lock & Approve Interview
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}