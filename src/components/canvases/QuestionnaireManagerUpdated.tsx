import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { 
  Users,
  ChevronDown,
  CheckCircle,
  Calendar,
  Download,
  Clock,
  Plus,
  Eye,
  Target,
  Heart,
  Globe,
  TrendingUp,
  Mail,
  Edit3,
  Save,
  X,
  Package,
  MoreVertical,
  FileText,
  AlertCircle,
  Check,
  Circle,
  MessageCircle,
  Play,
  Trash2,
  ChevronRight,
  Lightbulb,
  Send,
  ClipboardList,
  Link2,
  Copy,
  ExternalLink
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { QuestionnaireWorkflowStep } from './QuestionnaireWorkflowStep';

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
  questionAnswers?: Record<string, string>;
  status: 'setup' | 'link-generated' | 'link-sent' | 'responses-received' | 'analyzed';
  lastEditedBy?: string;
  lastEditedAt?: Date;
}

interface Question {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'multiple-choice' | 'rating' | 'yes-no';
  linkedAssetId?: string;
  options?: string[];
  required: boolean;
  answer?: string;
}

interface QuestionnaireManagerProps {
  assetId: string;
  onRerender?: () => void;
  onEdit?: (data: any) => void;
  initialConfig?: {
    numberOfQuestionnaires: number;
    selectedAssets: string[];
  };
  // Session Navigation props
  researchPlanConfig?: {
    entryMode?: 'asset' | 'bundle' | 'questionnaire';
    unlockedAssets?: string[];
  } | null;
  onNavigateToAsset?: (assetId: string) => void;
  onReturnToHub?: () => void;
}

export function QuestionnaireManager({ 
  assetId, 
  onRerender, 
  onEdit, 
  initialConfig,
  researchPlanConfig,
  onNavigateToAsset,
  onReturnToHub
}: QuestionnaireManagerProps) {
  const [viewStatus, setViewStatus] = useState<'in-progress' | 'approved'>('in-progress');
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [addAssetDialogOpen, setAddAssetDialogOpen] = useState(false);
  
  // Available brand assets
  const availableAssets = [
    { id: 'vision-mission', name: 'Vision & Mission', icon: Target, type: 'Vision Statement' },
    { id: 'core-values', name: 'Core Values', icon: Heart, type: 'Core Values' },
    { id: 'brand-positioning', name: 'Brand Positioning', icon: TrendingUp, type: 'Brand Positioning' },
    { id: 'golden-circle', name: 'Golden Circle', icon: Target, type: 'Golden Circle' },
    { id: 'brand-archetype', name: 'Brand Archetype', icon: Users, type: 'Brand Archetype' },
    { id: 'social-relevancy', name: 'Social Relevancy', icon: Globe, type: 'Social Impact' },
    { id: 'trends', name: 'Industry Trends', icon: TrendingUp, type: 'Trends Analysis' }
  ];

  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([
    {
      id: 'q1',
      name: 'Questionnaire #1',
      recipient: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      group: 'Internal Team',
      role: 'Marketing Director',
      date: '2025-12-01',
      selectedAssets: ['vision-mission', 'core-values'],
      linkGenerated: true,
      linkSent: true,
      linkUrl: 'https://survey.brand.io/q/abc123',
      responsesReceived: true,
      responseData: 'Comprehensive responses received covering all selected assets.',
      questionAnswers: {},
      status: 'responses-received',
      lastEditedBy: 'System',
      lastEditedAt: new Date()
    },
    {
      id: 'q2',
      name: 'Questionnaire #2',
      recipient: 'Michael Chen',
      email: 'michael.chen@company.com',
      group: 'External Stakeholders',
      role: 'Key Customer',
      date: '2025-12-03',
      selectedAssets: ['brand-positioning', 'brand-archetype'],
      linkGenerated: true,
      linkSent: false,
      linkUrl: 'https://survey.brand.io/q/def456',
      responsesReceived: false,
      status: 'link-generated'
    },
    {
      id: 'q3',
      name: 'Questionnaire #3',
      recipient: 'Emily Rodriguez',
      email: 'emily.rodriguez@company.com',
      group: 'Internal Team',
      role: 'Product Manager',
      date: '2025-12-05',
      selectedAssets: ['golden-circle'],
      linkGenerated: false,
      linkSent: false,
      responsesReceived: false,
      status: 'setup'
    }
  ]);

  const [numberOfQuestionnaires, setNumberOfQuestionnaires] = useState(
    initialConfig?.numberOfQuestionnaires || 3
  );

  const updateQuestionnaire = (id: string, field: string, value: any) => {
    setQuestionnaires(prev => 
      prev.map(q => 
        q.id === id 
          ? { 
              ...q, 
              [field]: value,
              lastEditedBy: 'Current User',
              lastEditedAt: new Date()
            } 
          : q
      )
    );
  };

  const toggleAssetSelection = (questionnaireId: string, assetId: string) => {
    setQuestionnaires(prev =>
      prev.map(q => {
        if (q.id === questionnaireId) {
          const selectedAssets = q.selectedAssets.includes(assetId)
            ? q.selectedAssets.filter(id => id !== assetId)
            : [...q.selectedAssets, assetId];
          return { ...q, selectedAssets };
        }
        return q;
      })
    );
  };

  const addNewQuestionnaire = () => {
    const newId = `q${questionnaires.length + 1}`;
    const newQuestionnaire: Questionnaire = {
      id: newId,
      name: `Questionnaire #${questionnaires.length + 1}`,
      recipient: '',
      email: '',
      group: '',
      role: '',
      date: new Date().toISOString().split('T')[0],
      selectedAssets: [],
      linkGenerated: false,
      linkSent: false,
      responsesReceived: false,
      status: 'setup'
    };
    setQuestionnaires(prev => [...prev, newQuestionnaire]);
    setNumberOfQuestionnaires(prev => prev + 1);
  };

  const deleteQuestionnaire = (id: string) => {
    setQuestionnaires(prev => prev.filter(q => q.id !== id));
    setNumberOfQuestionnaires(prev => prev - 1);
  };

  const generateLink = (id: string) => {
    const randomId = Math.random().toString(36).substring(7);
    const linkUrl = `https://survey.brand.io/q/${randomId}`;
    updateQuestionnaire(id, 'linkUrl', linkUrl);
    updateQuestionnaire(id, 'linkGenerated', true);
    updateQuestionnaire(id, 'status', 'link-generated');
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  // Calculate workflow steps for each questionnaire
  const getWorkflowSteps = (questionnaire: Questionnaire) => {
    return [
      {
        step: 1,
        title: 'Design Questionnaire',
        description: 'Build questions and link them to brand assets',
        isCompleted: questionnaire.linkGenerated,
        isCurrent: questionnaire.status === 'setup'
      },
      {
        step: 2,
        title: 'Setup Recipients',
        description: 'Configure recipient details and distribution',
        isCompleted: questionnaire.linkSent,
        isCurrent: questionnaire.status === 'link-generated'
      },
      {
        step: 3,
        title: 'Send & Track',
        description: 'Distribute questionnaire and monitor responses',
        isCompleted: questionnaire.responsesReceived,
        isCurrent: questionnaire.status === 'link-sent'
      },
      {
        step: 4,
        title: 'Analyze Results',
        description: 'Review insights and export findings',
        isCompleted: questionnaire.status === 'analyzed',
        isCurrent: questionnaire.status === 'responses-received'
      }
    ];
  };

  const inProgressQuestionnaires = questionnaires.filter(q => 
    q.status !== 'analyzed'
  );

  const completedQuestionnaires = questionnaires.filter(q => 
    q.status === 'analyzed'
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'setup':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Setup</Badge>;
      case 'link-generated':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Link Ready</Badge>;
      case 'link-sent':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700">Sent</Badge>;
      case 'responses-received':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Responses In</Badge>;
      case 'analyzed':
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Completed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Status Dropdown */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Brand Questionnaire Manager</h2>
          <p className="text-muted-foreground">
            Collect brand insights through structured questionnaires
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {viewStatus === 'in-progress' ? (
                  <>
                    <Play className="h-4 w-4 text-blue-600" />
                    In Progress
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Approved
                  </>
                )}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={() => setViewStatus('in-progress')}
                className="cursor-pointer py-3"
              >
                <Play className="h-4 w-4 mr-2 text-blue-600" />
                <span>In Progress</span>
                {viewStatus === 'in-progress' && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setViewStatus('approved')}
                className="cursor-pointer py-3"
              >
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                <span>Approved</span>
                {viewStatus === 'approved' && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* In Progress View */}
      {viewStatus === 'in-progress' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-2xl font-semibold">
                      {inProgressQuestionnaires.length}/{numberOfQuestionnaires}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Questionnaires</div>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <span className="text-sm text-muted-foreground">
                        {questionnaires.filter(q => q.status === 'setup').length} Setup
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-muted-foreground">
                        {questionnaires.filter(q => q.status === 'link-generated' || q.status === 'link-sent').length} Pending
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm text-muted-foreground">
                        {questionnaires.filter(q => q.status === 'responses-received').length} Received
                      </span>
                    </div>
                  </div>
                </div>
                <Button onClick={addNewQuestionnaire}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Questionnaire
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Questionnaire List */}
          <div className="space-y-4">
            {inProgressQuestionnaires.map((questionnaire) => {
              const workflowSteps = getWorkflowSteps(questionnaire);
              const isExpanded = selectedQuestionnaireId === questionnaire.id;
              const completedSteps = workflowSteps.filter(s => s.isCompleted).length;
              const totalSteps = workflowSteps.length;
              const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

              return (
                <Card key={questionnaire.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                          <ClipboardList className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold">{questionnaire.name}</h3>
                            {getStatusBadge(questionnaire.status)}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              {questionnaire.recipient || 'No recipient set'} 
                              {questionnaire.role && ` • ${questionnaire.role}`}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {questionnaire.selectedAssets.length} assets selected
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {questionnaire.date}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedQuestionnaireId(isExpanded ? null : questionnaire.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {isExpanded ? 'Collapse' : 'Expand'} Workflow
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteQuestionnaire(questionnaire.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">{completedSteps}/{totalSteps} steps</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Expandable Workflow */}
                    <Collapsible open={isExpanded} onOpenChange={(open) => setSelectedQuestionnaireId(open ? questionnaire.id : null)}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-between hover:bg-muted/50 -mx-2 px-2"
                        >
                          <span className="flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            View Questionnaire Workflow
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="space-y-3">
                          {workflowSteps.map((step, index) => (
                            <QuestionnaireWorkflowStep
                              key={step.step}
                              step={step}
                              questionnaire={questionnaire}
                              availableAssets={availableAssets}
                              updateQuestionnaire={updateQuestionnaire}
                              toggleAssetSelection={toggleAssetSelection}
                              generateLink={generateLink}
                              copyLink={copyLink}
                              formatDate={formatDate}
                              isLastStep={index === workflowSteps.length - 1}
                              researchPlanConfig={researchPlanConfig}
                              onNavigateToAsset={onNavigateToAsset}
                              onReturnToHub={onReturnToHub}
                              currentAssetId={assetId}
                            />
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              );
            })}

            {inProgressQuestionnaires.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-2">No Active Questionnaires</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first questionnaire to start collecting brand insights
                  </p>
                  <Button onClick={addNewQuestionnaire}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Questionnaire
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Approved View */}
      {viewStatus === 'approved' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Completed Questionnaires
              </CardTitle>
              <CardDescription>
                Review finalized questionnaire results and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedQuestionnaires.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No completed questionnaires yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedQuestionnaires.map((questionnaire) => (
                    <Card key={questionnaire.id} className="border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold mb-1">{questionnaire.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {questionnaire.recipient} • {questionnaire.role}
                            </p>
                          </div>
                          <Button size="sm">
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}