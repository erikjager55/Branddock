import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
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
  Lock,
  Unlock,
  Mail,
  Phone,
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
  Lightbulb
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
import { InterviewWorkflowStep } from './InterviewWorkflowStep';
import { currentBundle } from '../../data/mock-bundles';

interface Interview {
  id: string;
  name: string;
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
  status: 'add-contact' | 'contacted' | 'appointment-made' | 'interview-held' | 'results-added';
  lockStatus?: 'editable' | 'locked';
  lockedBy?: string;
  lockedAt?: Date;
  lockReason?: string;
  lastEditedBy?: string;
  lastEditedAt?: Date;
  interviewer?: string;
}

interface InterviewsManagerProps {
  assetId: string;
  onRerender?: () => void;
  onEdit?: (data: any) => void;
  initialConfig?: {
    numberOfInterviews: number;
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

export function InterviewsManager({ assetId, onRerender, onEdit, initialConfig, researchPlanConfig, onNavigateToAsset, onReturnToHub }: InterviewsManagerProps) {
  const [viewStatus, setViewStatus] = useState<'in-progress' | 'approved'>('in-progress');
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [selectedLockInterview, setSelectedLockInterview] = useState<string | null>(null);
  const [lockReason, setLockReason] = useState<string>('finalized');
  const [lockReasonText, setLockReasonText] = useState('');
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [selectedDetailInterview, setSelectedDetailInterview] = useState<string | null>(null);
  const [approvedSort, setApprovedSort] = useState<'date' | 'name' | 'assets'>('date');
  const [addInterviewDialogOpen, setAddInterviewDialogOpen] = useState(false);
  const [newInterviewName, setNewInterviewName] = useState('');
  const [expandedInterviews, setExpandedInterviews] = useState<Record<string, boolean>>({});
  const [totalInterviews, setTotalInterviews] = useState<number>(initialConfig?.numberOfInterviews || 4);
  
  // Boosted assets state
  const [boostedAssets, setBoostedAssets] = useState<string[]>(['1', '2']); // Some assets are boosted by default
  
  const [interviews, setInterviews] = useState<Interview[]>([
    {
      id: 'interview-1',
      name: 'Leadership Interview #1',
      interviewee: 'John Smith',
      email: 'john.smith@company.com',
      phone: '+1 (555) 123-4567',
      company: 'TechCorp Inc.',
      position: 'CEO',
      date: new Date().toISOString().split('T')[0],
      time: '14:00',
      duration: 60,
      selectedAssets: ['vision-mission', 'core-values'],
      notes: 'Very engaged, provided valuable insights on company vision.',
      interviewResults: 'John emphasized the importance of innovation and human-centered design. He believes the company\'s purpose should center around empowering businesses through technology.\n\nKey insights:\n- Innovation is core to company identity\n- Technology should democratize access to enterprise tools\n- Human-centered design is non-negotiable\n- Purpose-driven approach to business decisions',
      questionAnswers: {
        'q1': 'We envision becoming the leading technology partner for SMBs globally, empowering them with enterprise-level tools.',
        'q2': 'We exist to democratize technology and make powerful business tools accessible to everyone, not just large enterprises.',
        'q3': 'Innovation, integrity, and customer-centricity are our core principles. We never compromise on quality or ethical practices.'
      },
      status: 'results-added',
      lockStatus: 'locked',
      lockedBy: 'Sarah Chen',
      lockedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      lockReason: 'finalized',
      lastEditedBy: 'Sarah Chen',
      lastEditedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      interviewer: 'Sarah Chen'
    },
    {
      id: 'interview-2',
      name: 'Leadership Interview #2',
      interviewee: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      phone: '+1 (555) 234-5678',
      company: 'TechCorp Inc.',
      position: 'CMO',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '10:00',
      duration: 45,
      selectedAssets: ['brand-positioning', 'core-values', 'brand-archetype'],
      notes: 'Focus on brand perception and market positioning.',
      interviewResults: 'Sarah highlighted the importance of authentic brand storytelling and consistent messaging across all touchpoints.',
      questionAnswers: {
        'q4': 'We\'re a trusted partner that makes complex technology feel simple and approachable.',
        'q5': 'If our brand were a person, they\'d be a knowledgeable friend - someone who\'s an expert but never talks down to you.'
      },
      status: 'interview-held',
      lockStatus: 'editable',
      lastEditedBy: 'Mike Rodriguez',
      lastEditedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      interviewer: 'Mike Rodriguez'
    },
    {
      id: 'interview-3',
      name: 'Stakeholder Interview #1',
      interviewee: 'David Martinez',
      email: 'david.martinez@techcorp.com',
      phone: '+1 (555) 345-6789',
      company: 'TechCorp Inc.',
      position: 'CTO',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '15:00',
      duration: 60,
      selectedAssets: ['vision-mission', 'trends', 'golden-circle'],
      notes: 'Technical perspective on company mission and future trends.',
      interviewResults: 'David provided deep insights into the technical vision and how emerging technologies will shape the company\'s future.',
      questionAnswers: {
        'q1': 'In 5-10 years, we\'ll be the infrastructure that powers millions of small businesses globally.',
        'q8': 'AI is the biggest trend. Every business will need AI capabilities, but most can\'t build it themselves.'
      },
      status: 'results-added',
      lockStatus: 'editable',
      lastEditedBy: 'Sarah Chen',
      lastEditedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      interviewer: 'Sarah Chen'
    },
    {
      id: 'interview-4',
      name: 'Customer Interview #1',
      interviewee: 'Emily Watson',
      email: 'emily@smallbiz.com',
      phone: '+1 (555) 456-7890',
      company: 'SmallBiz Solutions',
      position: 'Founder',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '11:00',
      duration: 30,
      selectedAssets: ['brand-positioning', 'social-relevancy'],
      notes: 'Customer perspective on brand value and social impact.',
      interviewResults: 'Emily shared how the product has transformed her business operations and enabled growth she thought impossible for a small team.',
      questionAnswers: {
        'q6': 'You\'re leveling the playing field. Small businesses like mine can now compete with larger companies.'
      },
      status: 'results-added',
      lockStatus: 'locked',
      lockedBy: 'Mike Rodriguez',
      lockedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      lockReason: 'used-in-canvas',
      lastEditedBy: 'Mike Rodriguez',
      lastEditedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      interviewer: 'Mike Rodriguez'
    },
    {
      id: 'interview-5',
      name: 'Team Interview #1',
      interviewee: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '14:00',
      duration: 45,
      selectedAssets: ['core-values'],
      notes: '',
      interviewResults: '',
      status: 'add-contact',
      lockStatus: 'editable'
    },
    {
      id: 'interview-6',
      name: 'Partner Interview #1',
      interviewee: 'Alex Thompson',
      email: 'alex@partner.com',
      phone: '+1 (555) 567-8901',
      company: 'Partner Co.',
      position: 'VP Strategy',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '11:00',
      duration: 60,
      selectedAssets: ['brand-positioning', 'trends'],
      notes: '',
      interviewResults: '',
      status: 'appointment-made',
      lockStatus: 'editable'
    }
  ]);

  // Available brand assets
  const availableAssets = [
    { id: 'vision-mission', name: 'Vision & Mission Statement', icon: Eye, type: 'Strategy' },
    { id: 'core-values', name: 'Core Values', icon: Heart, type: 'Culture' },
    { id: 'brand-positioning', name: 'Brand Positioning', icon: Target, type: 'Strategy' },
    { id: 'golden-circle', name: 'Golden Circle Framework', icon: Target, type: 'Foundation' },
    { id: 'brand-archetype', name: 'Brand Archetype', icon: Users, type: 'Personality' },
    { id: 'social-relevancy', name: 'Social Relevancy', icon: Globe, type: 'Purpose' },
    { id: 'trends', name: 'Market Trends', icon: TrendingUp, type: 'Context' }
  ];

  // Helper functions
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getLockReasonLabel = (reason?: string) => {
    const reasons: Record<string, string> = {
      'finalized': 'Finalized for report',
      'used-in-canvas': 'Used in canvas',
      'approved-by-stakeholder': 'Approved by stakeholder',
      'other': 'Other reason'
    };
    return reasons[reason || ''] || 'Locked';
  };

  const updateInterview = (interviewId: string, field: keyof Interview, value: any) => {
    setInterviews(prev => prev.map(interview => 
      interview.id === interviewId ? { ...interview, [field]: value } : interview
    ));
  };

  const handleAddInterview = () => {
    if (!newInterviewName.trim()) return;
    
    const newInterview: Interview = {
      id: `interview-${Date.now()}`,
      name: newInterviewName,
      interviewee: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      duration: 60,
      selectedAssets: [],
      notes: '',
      interviewResults: '',
      status: 'add-contact',
      lockStatus: 'editable'
    };
    
    setInterviews(prev => [...prev, newInterview]);
    setTotalInterviews(prev => prev + 1);
    setNewInterviewName('');
    setAddInterviewDialogOpen(false);
  };

  const handleDeleteInterview = (interviewId: string) => {
    setInterviews(prev => prev.filter(i => i.id !== interviewId));
  };

  const handleLockInterview = (interviewId: string) => {
    setSelectedLockInterview(interviewId);
    setLockModalOpen(true);
  };

  const confirmLockInterview = () => {
    if (selectedLockInterview) {
      updateInterview(selectedLockInterview, 'lockStatus', 'locked');
      updateInterview(selectedLockInterview, 'lockedBy', 'Current User');
      updateInterview(selectedLockInterview, 'lockedAt', new Date());
      updateInterview(selectedLockInterview, 'lockReason', lockReason);
      setLockModalOpen(false);
      setSelectedLockInterview(null);
      setLockReason('finalized');
      setLockReasonText('');
    }
  };

  const handleUnlockInterview = (interviewId: string) => {
    setSelectedLockInterview(interviewId);
    setUnlockModalOpen(true);
  };

  const confirmUnlockInterview = () => {
    if (selectedLockInterview) {
      updateInterview(selectedLockInterview, 'lockStatus', 'editable');
      updateInterview(selectedLockInterview, 'lockedBy', undefined);
      updateInterview(selectedLockInterview, 'lockedAt', undefined);
      updateInterview(selectedLockInterview, 'lockReason', undefined);
      setUnlockModalOpen(false);
      setSelectedLockInterview(null);
    }
  };

  const openDetailView = (interviewId: string) => {
    setSelectedDetailInterview(interviewId);
    setDetailViewOpen(true);
  };

  const closeDetailView = () => {
    setDetailViewOpen(false);
    setSelectedDetailInterview(null);
    setEditMode(null);
  };

  const toggleAssetSelection = (interviewId: string, assetId: string) => {
    setInterviews(prev => prev.map(interview => {
      if (interview.id === interviewId) {
        const selectedAssets = interview.selectedAssets.includes(assetId)
          ? interview.selectedAssets.filter(id => id !== assetId)
          : [...interview.selectedAssets, assetId];
        return { ...interview, selectedAssets };
      }
      return interview;
    }));
  };

  // Boost asset handler
  const handleBoostAsset = (assetId: string) => {
    setBoostedAssets(prev => {
      if (prev.includes(assetId)) {
        // Remove boost
        return prev.filter(id => id !== assetId);
      } else {
        // Add boost
        return [...prev, assetId];
      }
    });
  };

  // Filter interviews
  const inProgressInterviews = interviews.filter(i => 
    i.status !== 'results-added' || i.lockStatus === 'editable'
  );
  
  const approvedInterviews = interviews.filter(i => 
    i.lockStatus === 'locked' && i.status === 'results-added'
  );

  // Sort approved interviews
  const sortedApprovedInterviews = [...approvedInterviews].sort((a, b) => {
    if (approvedSort === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (approvedSort === 'name') {
      return a.interviewee.localeCompare(b.interviewee);
    }
    if (approvedSort === 'assets') {
      return b.selectedAssets.length - a.selectedAssets.length;
    }
    return 0;
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'add-contact': { label: 'Add Contact', color: 'bg-gray-100 text-gray-700' },
      'contacted': { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
      'appointment-made': { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
      'interview-held': { label: 'Interview Held', color: 'bg-purple-100 text-purple-700' },
      'results-added': { label: 'Results Added', color: 'bg-green-100 text-green-700' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['add-contact'];
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getStatusIcon = () => {
    switch (viewStatus) {
      case 'in-progress':
        return <Play className="h-5 w-5" />;
      case 'approved':
        return <Check className="h-5 w-5" />;
    }
  };

  const getStatusLabel = () => {
    switch (viewStatus) {
      case 'in-progress':
        return 'In Progress';
      case 'approved':
        return 'Approved';
    }
  };

  const getStatusColor = () => {
    switch (viewStatus) {
      case 'in-progress':
        return 'text-blue-600';
      case 'approved':
        return 'text-green-600';
      default:
        return 'text-blue-600';
    }
  };

  const renderInProgressView = () => (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-2xl font-semibold">{inProgressInterviews.length}/{totalInterviews}</div>
                <div className="text-sm text-muted-foreground">Active Interviews</div>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span className="text-sm text-muted-foreground">
                    {interviews.filter(i => i.status === 'add-contact').length} To Schedule
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-muted-foreground">
                    {interviews.filter(i => i.status === 'appointment-made').length} Scheduled
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm text-muted-foreground">
                    {interviews.filter(i => i.status === 'interview-held').length} In Review
                  </span>
                </div>
              </div>
            </div>
            <Button onClick={() => setAddInterviewDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Interview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Interviews List */}
      <div className="grid gap-4">
        {inProgressInterviews.map(interview => {
          const isExpanded = expandedInterviews[interview.id];
          
          // Define workflow steps
          const workflowSteps = [
            {
              step: 1,
              title: 'Add Contact Information',
              description: 'Fill in interviewee details and contact information',
              isCompleted: interview.interviewee && interview.email,
              isCurrent: !interview.interviewee || !interview.email
            },
            {
              step: 2,
              title: 'Schedule Interview',
              description: 'Set date, time and select brand assets to discuss',
              isCompleted: interview.status !== 'add-contact' && interview.selectedAssets.length > 0,
              isCurrent: (interview.interviewee && interview.email) && (interview.status === 'add-contact' || interview.selectedAssets.length === 0)
            },
            {
              step: 3,
              title: 'Document Results',
              description: 'Add interview insights and key findings',
              isCompleted: interview.status === 'results-added',
              isCurrent: interview.status === 'appointment-made' || interview.status === 'contacted'
            },
            {
              step: 4,
              title: 'Conduct Interview',
              description: 'Hold the interview and take initial notes',
              isCompleted: interview.status === 'interview-held' || interview.status === 'results-added',
              isCurrent: interview.status === 'interview-held'
            },
            {
              step: 5,
              title: 'Lock & Approve',
              description: 'Finalize interview and lock for reporting',
              isCompleted: interview.lockStatus === 'locked',
              isCurrent: interview.status === 'results-added' && interview.lockStatus === 'editable'
            }
          ];

          return (
            <Card 
              key={interview.id}
              className="hover:border-primary transition-all"
            >
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{interview.name}</h3>
                            {getStatusBadge(interview.status)}
                          </div>
                          {interview.interviewee && (
                            <div className="text-sm text-muted-foreground">
                              {interview.interviewee} • {interview.position} at {interview.company}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(new Date(interview.date))}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {interview.time} • {interview.duration} min
                        </span>
                        {interview.selectedAssets.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {interview.selectedAssets.length} assets
                          </span>
                        )}
                      </div>

                      {/* Contact Info */}
                      {interview.email && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {interview.email}
                          </span>
                          {interview.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {interview.phone}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openDetailView(interview.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetailView(interview.id)}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          {interview.status === 'results-added' && interview.lockStatus === 'editable' && (
                            <DropdownMenuItem onClick={() => handleLockInterview(interview.id)}>
                              <Lock className="h-4 w-4 mr-2" />
                              Lock Interview
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteInterview(interview.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Workflow Steps - Collapsible */}
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => setExpandedInterviews(prev => ({
                      ...prev,
                      [interview.id]: !prev[interview.id]
                    }))}
                  >
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          View Interview Workflow
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
                          <InterviewWorkflowStep
                            key={step.step}
                            step={step}
                            interview={interview}
                            availableAssets={availableAssets}
                            updateInterview={updateInterview}
                            toggleAssetSelection={toggleAssetSelection}
                            handleLockInterview={handleLockInterview}
                            handleUnlockInterview={handleUnlockInterview}
                            openDetailView={openDetailView}
                            formatDate={formatDate}
                            isLastStep={index === workflowSteps.length - 1}
                            activeBundle={currentBundle}
                            boostedAssets={boostedAssets}
                            onBoostAsset={handleBoostAsset}
                            researchPlanConfig={researchPlanConfig}
                            onNavigateToAsset={onNavigateToAsset}
                            onReturnToHub={onReturnToHub}
                            currentAssetId={assetId}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderApprovedView = () => (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-2xl font-semibold">{approvedInterviews.length}</div>
                <div className="text-sm text-muted-foreground">Approved Interviews</div>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <div className="text-sm text-muted-foreground">
                  All interviews locked and ready for analysis
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Sort: {approvedSort === 'date' && 'Date'}
                    {approvedSort === 'name' && 'Name'}
                    {approvedSort === 'assets' && 'Assets'}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setApprovedSort('date')}>
                    <Calendar className="h-3 w-3 mr-2" />
                    By Date
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setApprovedSort('name')}>
                    <Users className="h-3 w-3 mr-2" />
                    By Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setApprovedSort('assets')}>
                    <Package className="h-3 w-3 mr-2" />
                    By Assets
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approved Interviews Grid */}
      <div className="grid gap-4">
        {sortedApprovedInterviews.map(interview => {
          const firstInsight = interview.interviewResults?.split('\n')[0] || '';
          
          return (
            <Card 
              key={interview.id}
              className="hover:border-primary transition-all cursor-pointer"
              onClick={() => openDetailView(interview.id)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{interview.interviewee}</h3>
                          <Badge className="bg-green-100 text-green-700">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {interview.position} at {interview.company}
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(new Date(interview.date))}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {interview.duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {interview.selectedAssets.length} assets
                      </span>
                      {interview.interviewer && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {interview.interviewer}
                        </span>
                      )}
                    </div>

                    {/* Preview */}
                    {firstInsight && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {firstInsight}
                      </p>
                    )}

                    {/* Lock Metadata */}
                    {interview.lockedBy && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3 text-green-600" />
                        <span>Locked by {interview.lockedBy} on {formatDate(interview.lockedAt)}</span>
                        {interview.lockReason && (
                          <>
                            <span>•</span>
                            <span>{getLockReasonLabel(interview.lockReason)}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetailView(interview.id);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleUnlockInterview(interview.id);
                        }}>
                          <Unlock className="h-4 w-4 mr-2" />
                          Unlock Interview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                        }}>
                          <FileText className="h-4 w-4 mr-2" />
                          Export Report
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const selectedDetailInterviewData = selectedDetailInterview 
    ? interviews.find(i => i.id === selectedDetailInterview)
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* PROMINENT VIEW SWITCHER - ALWAYS VISIBLE AT TOP */}
      <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 sticky top-20 z-40 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-xl">1-on-1 Interview Manager</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {viewStatus === 'in-progress' && 'Conduct structured interviews with stakeholders'}
                {viewStatus === 'approved' && 'Completed and locked interviews ready for analysis'}
              </p>
            </div>
          </div>
          
          {/* VIEW SWITCHER DROPDOWN */}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="min-w-[200px] justify-between bg-background">
                  <div className="flex items-center">
                    <span className={`mr-2 ${getStatusColor()}`}>{getStatusIcon()}</span>
                    <span className="font-medium">{getStatusLabel()}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px]">
                <DropdownMenuItem onClick={() => setViewStatus('in-progress')} className="cursor-pointer py-3">
                  <Play className="h-4 w-4 mr-2 text-blue-600" />
                  <span>In Progress</span>
                  {viewStatus === 'in-progress' && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewStatus('approved')} className="cursor-pointer py-3">
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  <span>Approved</span>
                  {viewStatus === 'approved' && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {viewStatus === 'in-progress' && renderInProgressView()}
      {viewStatus === 'approved' && renderApprovedView()}

      {/* Add Interview Dialog */}
      <Dialog open={addInterviewDialogOpen} onOpenChange={setAddInterviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Interview</DialogTitle>
            <DialogDescription>
              Create a new interview slot to schedule with a stakeholder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Interview Name</Label>
              <Input 
                value={newInterviewName}
                onChange={(e) => setNewInterviewName(e.target.value)}
                placeholder="e.g., Leadership Interview #3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddInterviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddInterview}>
              <Plus className="h-4 w-4 mr-2" />
              Add Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={detailViewOpen} onOpenChange={setDetailViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedDetailInterviewData && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-xl mb-2">
                      {selectedDetailInterviewData.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mb-3">
                      {getStatusBadge(selectedDetailInterviewData.status)}
                      {selectedDetailInterviewData.lockStatus === 'locked' && (
                        <Badge className="bg-green-100 text-green-700">
                          <Lock className="h-3 w-3 mr-1" />
                          Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={closeDetailView}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Interviewee</Label>
                        <Input 
                          value={selectedDetailInterviewData.interviewee}
                          onChange={(e) => updateInterview(selectedDetailInterviewData.id, 'interviewee', e.target.value)}
                          disabled={selectedDetailInterviewData.lockStatus === 'locked'}
                        />
                      </div>
                      <div>
                        <Label>Position</Label>
                        <Input 
                          value={selectedDetailInterviewData.position}
                          onChange={(e) => updateInterview(selectedDetailInterviewData.id, 'position', e.target.value)}
                          disabled={selectedDetailInterviewData.lockStatus === 'locked'}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Email</Label>
                        <Input 
                          value={selectedDetailInterviewData.email}
                          onChange={(e) => updateInterview(selectedDetailInterviewData.id, 'email', e.target.value)}
                          disabled={selectedDetailInterviewData.lockStatus === 'locked'}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input 
                          value={selectedDetailInterviewData.phone}
                          onChange={(e) => updateInterview(selectedDetailInterviewData.id, 'phone', e.target.value)}
                          disabled={selectedDetailInterviewData.lockStatus === 'locked'}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input 
                        value={selectedDetailInterviewData.company}
                        onChange={(e) => updateInterview(selectedDetailInterviewData.id, 'company', e.target.value)}
                        disabled={selectedDetailInterviewData.lockStatus === 'locked'}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Interview Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Interview Schedule</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Date</Label>
                        <Input 
                          type="date"
                          value={selectedDetailInterviewData.date}
                          onChange={(e) => updateInterview(selectedDetailInterviewData.id, 'date', e.target.value)}
                          disabled={selectedDetailInterviewData.lockStatus === 'locked'}
                        />
                      </div>
                      <div>
                        <Label>Time</Label>
                        <Input 
                          type="time"
                          value={selectedDetailInterviewData.time}
                          onChange={(e) => updateInterview(selectedDetailInterviewData.id, 'time', e.target.value)}
                          disabled={selectedDetailInterviewData.lockStatus === 'locked'}
                        />
                      </div>
                      <div>
                        <Label>Duration (min)</Label>
                        <Input 
                          type="number"
                          value={selectedDetailInterviewData.duration}
                          onChange={(e) => updateInterview(selectedDetailInterviewData.id, 'duration', parseInt(e.target.value))}
                          disabled={selectedDetailInterviewData.lockStatus === 'locked'}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Brand Assets Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Brand Assets to Discuss</CardTitle>
                    <CardDescription>
                      Select which brand assets to cover in this interview
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {availableAssets.map(asset => {
                        const Icon = asset.icon;
                        const isSelected = selectedDetailInterviewData.selectedAssets.includes(asset.id);
                        
                        return (
                          <div
                            key={asset.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-primary bg-blue-50 dark:bg-blue-950/20'
                                : 'border-border hover:border-primary hover:bg-muted'
                            } ${selectedDetailInterviewData.lockStatus === 'locked' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => {
                              if (selectedDetailInterviewData.lockStatus !== 'locked') {
                                toggleAssetSelection(selectedDetailInterviewData.id, asset.id);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2 flex-1">
                                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{asset.name}</p>
                                  <p className="text-xs text-muted-foreground">{asset.type}</p>
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Interview Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      value={selectedDetailInterviewData.notes}
                      onChange={(e) => updateInterview(selectedDetailInterviewData.id, 'notes', e.target.value)}
                      placeholder="Add your notes here..."
                      rows={3}
                      disabled={selectedDetailInterviewData.lockStatus === 'locked'}
                    />
                  </CardContent>
                </Card>

                {/* Interview Results */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Interview Results</CardTitle>
                    <CardDescription>
                      Document key insights and findings from the interview
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      value={selectedDetailInterviewData.interviewResults}
                      onChange={(e) => updateInterview(selectedDetailInterviewData.id, 'interviewResults', e.target.value)}
                      placeholder="Add interview results and insights..."
                      rows={8}
                      disabled={selectedDetailInterviewData.lockStatus === 'locked'}
                    />
                  </CardContent>
                </Card>

                {/* Status Update */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Interview Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedDetailInterviewData.status}
                      onValueChange={(value) => updateInterview(selectedDetailInterviewData.id, 'status', value)}
                      disabled={selectedDetailInterviewData.lockStatus === 'locked'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add-contact">Add Contact</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="appointment-made">Appointment Made</SelectItem>
                        <SelectItem value="interview-held">Interview Held</SelectItem>
                        <SelectItem value="results-added">Results Added</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter className="flex justify-between items-center">
                <div className="flex gap-2">
                  {selectedDetailInterviewData.lockStatus === 'editable' ? (
                    <Button 
                      variant="outline"
                      onClick={() => handleLockInterview(selectedDetailInterviewData.id)}
                      disabled={selectedDetailInterviewData.status !== 'results-added'}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Lock Interview
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      onClick={() => handleUnlockInterview(selectedDetailInterviewData.id)}
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      Unlock Interview
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={closeDetailView}>
                    Close
                  </Button>
                  <Button onClick={closeDetailView}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lock Confirmation Dialog */}
      <Dialog open={lockModalOpen} onOpenChange={setLockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock Interview</DialogTitle>
            <DialogDescription>
              Locking this interview will prevent further edits. Choose a reason for locking:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Lock Reason</Label>
              <Select value={lockReason} onValueChange={setLockReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finalized">Finalized for report</SelectItem>
                  <SelectItem value="used-in-canvas">Used in canvas</SelectItem>
                  <SelectItem value="approved-by-stakeholder">Approved by stakeholder</SelectItem>
                  <SelectItem value="other">Other reason</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {lockReason === 'other' && (
              <div>
                <Label>Additional Notes</Label>
                <Textarea 
                  value={lockReasonText}
                  onChange={(e) => setLockReasonText(e.target.value)}
                  placeholder="Explain why you're locking this interview..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmLockInterview}>
              <Lock className="h-4 w-4 mr-2" />
              Lock Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Confirmation Dialog */}
      <Dialog open={unlockModalOpen} onOpenChange={setUnlockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Interview</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlock this interview? This will allow it to be edited again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmUnlockInterview}>
              <Unlock className="h-4 w-4 mr-2" />
              Unlock Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}