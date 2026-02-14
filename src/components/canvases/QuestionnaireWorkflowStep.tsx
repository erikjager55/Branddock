import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Check,
  Circle,
  CheckCircle,
  Save,
  Eye,
  Heart,
  Globe,
  Target,
  TrendingUp,
  Users,
  HelpCircle,
  FileText,
  Link2,
  Copy,
  Send,
  Mail,
  ExternalLink,
  ClipboardCheck,
  Plus,
  Trash2,
  Edit3,
  GripVertical,
  ChevronDown,
  BarChart3,
  MessageSquare,
  Star,
  CheckSquare,
  Circle as RadioIcon
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { SessionNavigator } from '../SessionNavigator';
import { mockBrandAssets } from '../../data/mock-brand-assets';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'multiple-choice' | 'rating' | 'yes-no';
  linkedAssetId?: string;
  options?: string[];
  required: boolean;
  answer?: string;
}

interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

interface Questionnaire {
  id: string;
  name: string;
  recipient: string;
  email: string;
  group: string;
  role: string;
  date: string;
  selectedAssets: string[];
  questions?: Question[];
  linkGenerated: boolean;
  linkSent: boolean;
  linkUrl?: string;
  responsesReceived: boolean;
  responseData?: string;
  status: string;
}

interface Asset {
  id: string;
  name: string;
  icon: any;
  type: string;
}

interface QuestionnaireWorkflowStepProps {
  step: WorkflowStep;
  questionnaire: Questionnaire;
  availableAssets: Asset[];
  updateQuestionnaire: (id: string, field: string, value: any) => void;
  toggleAssetSelection: (id: string, assetId: string) => void;
  generateLink: (id: string) => void;
  copyLink: (url: string) => void;
  formatDate: (date?: Date) => string;
  isLastStep: boolean;
  // Session Navigation props
  researchPlanConfig?: {
    entryMode?: 'asset' | 'bundle' | 'questionnaire';
    unlockedAssets?: string[];
  } | null;
  onNavigateToAsset?: (assetId: string) => void;
  onReturnToHub?: () => void;
  currentAssetId?: string;
}

export function QuestionnaireWorkflowStep({
  step,
  questionnaire,
  availableAssets,
  updateQuestionnaire,
  toggleAssetSelection,
  generateLink,
  copyLink,
  formatDate,
  isLastStep,
  researchPlanConfig,
  onNavigateToAsset,
  onReturnToHub,
  currentAssetId
}: QuestionnaireWorkflowStepProps) {
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const getStatusIcon = (isCompleted: boolean, isCurrent: boolean) => {
    if (isCompleted) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (isCurrent) {
      return <Circle className="h-5 w-5 text-blue-600 fill-blue-600" />;
    } else {
      return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  // Question management functions
  const addQuestion = () => {
    const currentQuestions = questionnaire.questions || [];
    const newQuestion: Question = {
      id: `q${Date.now()}`,
      text: '',
      type: 'text',
      required: false
    };
    updateQuestionnaire(questionnaire.id, 'questions', [...currentQuestions, newQuestion]);
    setEditingQuestionId(newQuestion.id);
  };

  const updateQuestion = (questionId: string, field: string, value: any) => {
    const currentQuestions = questionnaire.questions || [];
    const updatedQuestions = currentQuestions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    );
    updateQuestionnaire(questionnaire.id, 'questions', updatedQuestions);
  };

  const deleteQuestion = (questionId: string) => {
    const currentQuestions = questionnaire.questions || [];
    const updatedQuestions = currentQuestions.filter(q => q.id !== questionId);
    updateQuestionnaire(questionnaire.id, 'questions', updatedQuestions);
  };

  const duplicateQuestion = (questionId: string) => {
    const currentQuestions = questionnaire.questions || [];
    const questionToDuplicate = currentQuestions.find(q => q.id === questionId);
    if (questionToDuplicate) {
      const newQuestion = {
        ...questionToDuplicate,
        id: `q${Date.now()}`,
        text: `${questionToDuplicate.text} (copy)`
      };
      updateQuestionnaire(questionnaire.id, 'questions', [...currentQuestions, newQuestion]);
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <MessageSquare className="h-4 w-4" />;
      case 'textarea':
        return <FileText className="h-4 w-4" />;
      case 'multiple-choice':
        return <CheckSquare className="h-4 w-4" />;
      case 'rating':
        return <Star className="h-4 w-4" />;
      case 'yes-no':
        return <RadioIcon className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'text':
        return 'Short Answer';
      case 'textarea':
        return 'Long Answer';
      case 'multiple-choice':
        return 'Multiple Choice';
      case 'rating':
        return 'Rating Scale';
      case 'yes-no':
        return 'Yes/No';
      default:
        return type;
    }
  };

  return (
    <div 
      className={`relative pl-8 pb-4 ${
        !isLastStep ? 'border-l-2' : ''
      } ${
        step.isCompleted 
          ? 'border-green-600' 
          : step.isCurrent 
          ? 'border-blue-600' 
          : 'border-gray-300'
      }`}
    >
      {/* Step Icon */}
      <div className="absolute left-0 top-0 -translate-x-1/2 bg-background">
        {getStatusIcon(step.isCompleted, step.isCurrent)}
      </div>

      {/* Step Content */}
      <div className="ml-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className={`font-semibold ${step.isCurrent ? 'text-blue-600' : ''}`}>
              Step {step.step}: {step.title}
            </h4>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
          {step.isCompleted && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <Check className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
        </div>

        {/* Step 1: Design Questionnaire */}
        {step.step === 1 && (
          <div className="space-y-4 mt-3">
            {/* Questionnaire Name */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <Label className="text-xs mb-2 block">Questionnaire Title</Label>
              <Input 
                value={questionnaire.name}
                onChange={(e) => updateQuestionnaire(questionnaire.id, 'name', e.target.value)}
                placeholder="e.g., Brand Values Survey"
                className="text-sm"
              />
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              {questionnaire.questions && questionnaire.questions.length > 0 ? (
                questionnaire.questions.map((question, index) => (
                  <div 
                    key={question.id} 
                    className={`p-4 bg-white dark:bg-gray-900 rounded-lg border-2 transition-all ${
                      editingQuestionId === question.id 
                        ? 'border-blue-500 ring-2 ring-blue-200' 
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                        <span className="font-semibold">{index + 1}</span>
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        {/* Question Text */}
                        <div>
                          <Textarea
                            value={question.text}
                            onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                            placeholder="Type your question here..."
                            rows={2}
                            className="text-sm"
                            onFocus={() => setEditingQuestionId(question.id)}
                          />
                        </div>

                        {/* Question Settings (shown when editing) */}
                        {editingQuestionId === question.id && (
                          <div className="space-y-3 pt-3 border-t">
                            <div className="grid grid-cols-2 gap-3">
                              {/* Question Type */}
                              <div>
                                <Label className="text-xs mb-1.5 block">Question Type</Label>
                                <Select
                                  value={question.type}
                                  onValueChange={(value) => updateQuestion(question.id, 'type', value)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">
                                      <div className="flex items-center gap-2">
                                        <MessageSquare className="h-3 w-3" />
                                        Short Answer
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="textarea">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-3 w-3" />
                                        Long Answer
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="multiple-choice">
                                      <div className="flex items-center gap-2">
                                        <CheckSquare className="h-3 w-3" />
                                        Multiple Choice
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="rating">
                                      <div className="flex items-center gap-2">
                                        <Star className="h-3 w-3" />
                                        Rating Scale
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="yes-no">
                                      <div className="flex items-center gap-2">
                                        <RadioIcon className="h-3 w-3" />
                                        Yes/No
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Link to Asset */}
                              <div>
                                <Label className="text-xs mb-1.5 block">Link to Brand Asset</Label>
                                <Select
                                  value={question.linkedAssetId || 'none'}
                                  onValueChange={(value) => {
                                    updateQuestion(question.id, 'linkedAssetId', value === 'none' ? undefined : value);
                                    // Auto-add asset to questionnaire selectedAssets if not already there
                                    if (value !== 'none' && !questionnaire.selectedAssets.includes(value)) {
                                      updateQuestionnaire(
                                        questionnaire.id, 
                                        'selectedAssets', 
                                        [...questionnaire.selectedAssets, value]
                                      );
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="No asset" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">
                                      <span className="text-muted-foreground">No asset linked</span>
                                    </SelectItem>
                                    {availableAssets.map((asset) => {
                                      const Icon = asset.icon;
                                      return (
                                        <SelectItem key={asset.id} value={asset.id}>
                                          <div className="flex items-center gap-2">
                                            <Icon className="h-3 w-3" />
                                            {asset.name}
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Multiple Choice Options */}
                            {question.type === 'multiple-choice' && (
                              <div className="space-y-2">
                                <Label className="text-xs">Answer Options</Label>
                                {(question.options || ['Option 1', 'Option 2']).map((option, optIndex) => (
                                  <div key={optIndex} className="flex items-center gap-2">
                                    <RadioIcon className="h-3 w-3 text-muted-foreground" />
                                    <Input
                                      value={option}
                                      onChange={(e) => {
                                        const newOptions = [...(question.options || [])];
                                        newOptions[optIndex] = e.target.value;
                                        updateQuestion(question.id, 'options', newOptions);
                                      }}
                                      className="text-xs h-7"
                                      placeholder={`Option ${optIndex + 1}`}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        const newOptions = (question.options || []).filter((_, i) => i !== optIndex);
                                        updateQuestion(question.id, 'options', newOptions);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
                                    updateQuestion(question.id, 'options', newOptions);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Option
                                </Button>
                              </div>
                            )}

                            {/* Required Toggle */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <input
                                type="checkbox"
                                id={`required-${question.id}`}
                                checked={question.required}
                                onChange={(e) => updateQuestion(question.id, 'required', e.target.checked)}
                                className="rounded"
                              />
                              <Label htmlFor={`required-${question.id}`} className="text-xs cursor-pointer">
                                Required question
                              </Label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Question Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => duplicateQuestion(question.id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteQuestion(question.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Question Preview (when not editing) */}
                    {editingQuestionId !== question.id && (
                      <div className="ml-9 mt-2 text-xs text-muted-foreground flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {getQuestionTypeIcon(question.type)}
                          <span>{getQuestionTypeLabel(question.type)}</span>
                        </div>
                        {question.linkedAssetId && (
                          <Badge variant="outline" className="text-xs h-5">
                            <Target className="h-2.5 w-2.5 mr-1" />
                            {availableAssets.find(a => a.id === question.linkedAssetId)?.name}
                          </Badge>
                        )}
                        {question.required && (
                          <Badge variant="secondary" className="text-xs h-5 bg-orange-100 text-orange-700">
                            Required
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed">
                  <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No questions added yet</p>
                  <p className="text-xs text-muted-foreground/70 mb-4">
                    Start building your questionnaire by adding questions
                  </p>
                </div>
              )}

              {/* Add Question Button */}
              <Button
                variant="outline"
                className="w-full border-dashed border-2"
                onClick={addQuestion}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>

            {/* Assets Summary */}
            {questionnaire.selectedAssets.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                <Label className="text-xs mb-2 block flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Linked Brand Assets ({questionnaire.selectedAssets.length})
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {questionnaire.selectedAssets.map((assetId) => {
                    const asset = availableAssets.find(a => a.id === assetId);
                    if (!asset) return null;
                    const Icon = asset.icon;
                    return (
                      <Badge key={assetId} variant="secondary" className="text-xs bg-white dark:bg-gray-800">
                        <Icon className="h-3 w-3 mr-1" />
                        {asset.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Complete Design Button */}
            <Button
              size="sm"
              className="h-8 text-xs w-full"
              onClick={() => {
                if (questionnaire.questions && questionnaire.questions.length > 0) {
                  updateQuestionnaire(questionnaire.id, 'status', 'link-generated');
                  generateLink(questionnaire.id);
                }
              }}
              disabled={!questionnaire.questions || questionnaire.questions.length === 0 || questionnaire.linkGenerated}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete Design & Generate Link
            </Button>
          </div>
        )}

        {/* Step 2: Setup Recipients */}
        {step.step === 2 && (
          <div className="space-y-3 mt-3 p-3 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Recipient Name</Label>
                <Input 
                  value={questionnaire.recipient}
                  onChange={(e) => updateQuestionnaire(questionnaire.id, 'recipient', e.target.value)}
                  placeholder="John Doe"
                  className="text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Email Address</Label>
                <Input 
                  type="email"
                  value={questionnaire.email}
                  onChange={(e) => updateQuestionnaire(questionnaire.id, 'email', e.target.value)}
                  placeholder="john.doe@company.com"
                  className="text-sm mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Group/Category</Label>
                <Input 
                  value={questionnaire.group}
                  onChange={(e) => updateQuestionnaire(questionnaire.id, 'group', e.target.value)}
                  placeholder="Internal Team"
                  className="text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Role/Position</Label>
                <Input 
                  value={questionnaire.role}
                  onChange={(e) => updateQuestionnaire(questionnaire.id, 'role', e.target.value)}
                  placeholder="Marketing Manager"
                  className="text-sm mt-1"
                />
              </div>
            </div>

            {/* Survey Link Preview */}
            {questionnaire.linkGenerated && questionnaire.linkUrl && (
              <div className="border-t pt-3 mt-3">
                <Label className="text-xs flex items-center gap-1 mb-2">
                  <Link2 className="h-3 w-3" />
                  Survey Link
                </Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={questionnaire.linkUrl}
                    readOnly
                    className="text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyLink(questionnaire.linkUrl || '')}
                    className="shrink-0 h-8"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(questionnaire.linkUrl, '_blank')}
                    className="shrink-0 h-8"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <Button
              size="sm"
              className="h-8 text-xs w-full mt-3"
              onClick={() => {
                if (questionnaire.recipient && questionnaire.email) {
                  updateQuestionnaire(questionnaire.id, 'linkSent', true);
                  updateQuestionnaire(questionnaire.id, 'status', 'link-sent');
                  alert(`Email sent to ${questionnaire.email}`);
                }
              }}
              disabled={!questionnaire.recipient || !questionnaire.email || questionnaire.linkSent}
            >
              <Send className="h-3 w-3 mr-1" />
              Send Questionnaire
            </Button>
          </div>
        )}

        {/* Step 3: Send & Track */}
        {step.step === 3 && (() => {
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
                  currentMethodType="questionnaire"
                  allAssets={unlockedAssets}
                  onNavigateToAsset={onNavigateToAsset}
                  onReturnToHub={onReturnToHub}
                />
              )}

              <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                {questionnaire.linkSent ? (
                  <>
                    {/* Response Tracking */}
                    <div className="p-3 bg-white dark:bg-gray-900 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-semibold">Response Status</Label>
                        <Badge variant={questionnaire.responsesReceived ? "default" : "secondary"} className="text-xs">
                          {questionnaire.responsesReceived ? "Received" : "Waiting"}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span>Sent to: {questionnaire.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="h-3 w-3" />
                          <span>{questionnaire.questions?.length || 0} questions</span>
                        </div>
                      </div>
                    </div>

                    {/* Response Input */}
                    <div className="space-y-3">
                      <Label className="text-xs flex items-center gap-1">
                        <ClipboardCheck className="h-3 w-3" />
                        Record Responses
                      </Label>
                      
                      {questionnaire.questions?.map((question, index) => {
                        const linkedAsset = question.linkedAssetId 
                          ? availableAssets.find(a => a.id === question.linkedAssetId)
                          : null;
                        
                        return (
                          <div key={question.id} className="p-3 bg-white dark:bg-gray-900 rounded border space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-muted-foreground shrink-0">Q{index + 1}.</span>
                              <div className="flex-1">
                                <p className="text-sm mb-1">{question.text}</p>
                                {linkedAsset && (
                                  <Badge variant="outline" className="text-xs h-5 mb-2">
                                    <Target className="h-2.5 w-2.5 mr-1" />
                                    {linkedAsset.name}
                                  </Badge>
                                )}
                                {question.type === 'textarea' || question.type === 'text' ? (
                                  <Textarea
                                    value={question.answer || ''}
                                    onChange={(e) => updateQuestion(question.id, 'answer', e.target.value)}
                                    placeholder="Enter response..."
                                    rows={question.type === 'textarea' ? 3 : 2}
                                    className="text-sm"
                                  />
                                ) : question.type === 'multiple-choice' ? (
                                  <Select
                                    value={question.answer || ''}
                                    onValueChange={(value) => updateQuestion(question.id, 'answer', value)}
                                  >
                                    <SelectTrigger className="text-sm">
                                      <SelectValue placeholder="Select an answer..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {question.options?.map((option, optIndex) => (
                                        <SelectItem key={optIndex} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : question.type === 'rating' ? (
                                  <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                      <button
                                        key={rating}
                                        onClick={() => updateQuestion(question.id, 'answer', rating.toString())}
                                        className={`p-2 rounded ${
                                          question.answer === rating.toString()
                                            ? 'bg-yellow-100 text-yellow-600'
                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                        }`}
                                      >
                                        <Star className="h-4 w-4" />
                                      </button>
                                    ))}
                                    {question.answer && (
                                      <span className="text-sm text-muted-foreground ml-2">
                                        {question.answer}/5
                                      </span>
                                    )}
                                  </div>
                                ) : question.type === 'yes-no' ? (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant={question.answer === 'yes' ? 'default' : 'outline'}
                                      onClick={() => updateQuestion(question.id, 'answer', 'yes')}
                                      className="flex-1"
                                    >
                                      Yes
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={question.answer === 'no' ? 'default' : 'outline'}
                                      onClick={() => updateQuestion(question.id, 'answer', 'no')}
                                      className="flex-1"
                                    >
                                      No
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      size="sm"
                      className="h-8 text-xs w-full mt-3"
                      onClick={() => {
                        const allQuestionsAnswered = questionnaire.questions?.every(q => 
                          !q.required || (q.required && q.answer)
                        );
                        if (allQuestionsAnswered) {
                          updateQuestionnaire(questionnaire.id, 'responsesReceived', true);
                          updateQuestionnaire(questionnaire.id, 'status', 'responses-received');
                        } else {
                          alert('Please answer all required questions');
                        }
                      }}
                      disabled={questionnaire.responsesReceived}
                    >
                      <ClipboardCheck className="h-3 w-3 mr-1" />
                      Save Responses
                    </Button>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded p-3">
                    <p className="flex items-center gap-1">
                      <HelpCircle className="h-3 w-3" />
                      Send the questionnaire (Step 2) before tracking responses
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Step 4: Analyze Results */}
        {step.step === 4 && (
          <div className="space-y-3 mt-3 p-3 bg-muted/50 rounded-lg">
            {questionnaire.responsesReceived ? (
              <>
                {/* Results Summary */}
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded">
                  <p className="text-xs text-green-900 dark:text-green-100 font-medium mb-1">
                    ✓ Responses Collected
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Ready to analyze insights from {questionnaire.recipient}
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-white dark:bg-gray-900 rounded border text-center">
                    <div className="text-lg font-semibold">{questionnaire.questions?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Questions</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-gray-900 rounded border text-center">
                    <div className="text-lg font-semibold">{questionnaire.selectedAssets.length}</div>
                    <div className="text-xs text-muted-foreground">Assets</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-gray-900 rounded border text-center">
                    <div className="text-lg font-semibold">100%</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="h-8 text-xs flex-1" variant="outline">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    View Analysis
                  </Button>
                  <Button size="sm" className="h-8 text-xs flex-1" variant="outline">
                    <Eye className="h-3 w-3 mr-1" />
                    Export Report
                  </Button>
                </div>

                <Button
                  size="sm"
                  className="h-8 text-xs w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    updateQuestionnaire(questionnaire.id, 'status', 'analyzed');
                  }}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Mark as Complete
                </Button>
              </>
            ) : (
              <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded p-3">
                <p className="flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  Collect responses (Step 3) before analyzing results
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
