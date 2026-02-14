import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { 
  Clock, 
  Users, 
  CheckCircle, 
  Target, 
  Lightbulb, 
  TrendingUp,
  FileText,
  Image as ImageIcon,
  StickyNote,
  Plus,
  Edit2,
  Save,
  X,
  Trash2
} from 'lucide-react';
import { GoldenCircleCanvas } from './GoldenCircleCanvas';

interface WorkshopReportProps {
  isLocked: boolean;
  onLockToggle: () => void;
}

export function WorkshopReport({ isLocked, onLockToggle }: WorkshopReportProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Executive Summary state
  const [executiveSummary, setExecutiveSummary] = useState(
    'De workshop resulteerde in een helder gedefinieerd Golden Circle framework dat de kern van de organisatie vastlegt. Het team van 8 stakeholders bereikte consensus over het doel (WHY), de aanpak (HOW), en het aanbod (WHAT). De samenwerking leidde tot waardevolle inzichten over mensgerichte technologie als kernonderscheid en empowerment als primaire doelstelling.'
  );
  const [editingSummary, setEditingSummary] = useState(false);
  const [tempSummary, setTempSummary] = useState('');
  
  // Key Findings state
  const [insights, setInsights] = useState([
    'The team unanimously agreed that human-centered technology is our core differentiator',
    'There was strong alignment around empowering businesses as our primary purpose',
    'Participants emphasized the importance of sustainable growth over rapid scaling',
    'The combination of AI and human design was identified as our unique methodology',
    'Mid-market companies emerged as our most clearly defined target audience'
  ]);
  const [editingInsight, setEditingInsight] = useState<number | null>(null);
  const [tempInsight, setTempInsight] = useState('');
  
  // Strategic Recommendations state
  const [nextSteps, setNextSteps] = useState([
    'Integrate Golden Circle into brand guidelines',
    'Develop messaging framework based on workshop outcomes',
    'Create internal communication campaign',
    'Schedule follow-up session in 3 months'
  ]);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [tempStep, setTempStep] = useState('');
  
  // Workshop objectives state
  const [objectives, setObjectives] = useState([
    'Define the core purpose (WHY) of our organization',
    'Clarify our unique approach and methodology (HOW)',
    'Articulate what we deliver to customers (WHAT)',
    'Achieve stakeholder alignment on brand positioning'
  ]);
  const [editingObjective, setEditingObjective] = useState<number | null>(null);
  const [tempObjective, setTempObjective] = useState('');
  
  // Participants state
  const [participants, setParticipants] = useState([
    { name: 'David Chen', role: 'CEO', avatar: '👨‍💼' },
    { name: 'Maria Garcia', role: 'Head of Marketing', avatar: '👩‍💼' },
    { name: 'James Wilson', role: 'Product Director', avatar: '👨‍💻' },
    { name: 'Lisa Anderson', role: 'Brand Strategist', avatar: '👩‍🎨' },
    { name: 'Alex Kumar', role: 'Operations Manager', avatar: '👨‍🔬' },
    { name: 'Emma Thompson', role: 'Customer Success Lead', avatar: '👩‍💼' },
    { name: 'Robert Taylor', role: 'Tech Lead', avatar: '👨‍💻' },
    { name: 'Sophie Martinez', role: 'Design Lead', avatar: '👩‍🎨' }
  ]);
  const [editingParticipant, setEditingParticipant] = useState<number | null>(null);
  const [tempParticipantName, setTempParticipantName] = useState('');
  const [tempParticipantRole, setTempParticipantRole] = useState('');

  const [notes, setNotes] = useState<Array<{ id: string; author: string; content: string; timestamp: string }>>([
    {
      id: '1',
      author: 'David Chen',
      content: 'The WHY section really resonated with the team. We need to ensure this purpose is reflected in all our communications.',
      timestamp: '2025-09-05 10:15'
    },
    {
      id: '2',
      author: 'Maria Garcia',
      content: 'Suggestion: Add more emphasis on the sustainability aspect in our HOW - it\'s a key differentiator.',
      timestamp: '2025-09-05 10:42'
    },
    {
      id: '3',
      author: 'James Wilson',
      content: 'The WHAT section could benefit from more specific examples of our service offerings.',
      timestamp: '2025-09-05 11:10'
    }
  ]);
  const [newNote, setNewNote] = useState('');

  const addNote = () => {
    if (newNote.trim()) {
      const note = {
        id: Date.now().toString(),
        author: 'Current User',
        content: newNote,
        timestamp: new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        }).replace(',', '')
      };
      setNotes([...notes, note]);
      setNewNote('');
    }
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  // Workshop data
  const workshopData = {
    title: 'Golden Circle Canvas Workshop',
    date: 'September 5, 2025',
    duration: '2.5 hours',
    location: 'Innovation Lab, Building A',
    facilitator: 'Sarah Mitchell',
    agenda: [
      { time: '9:00 AM', activity: 'Introduction & Ice Breaker', duration: '15 min' },
      { time: '9:15 AM', activity: 'Golden Circle Framework Presentation', duration: '20 min' },
      { time: '9:35 AM', activity: 'Individual Reflection Exercise', duration: '15 min' },
      { time: '9:50 AM', activity: 'WHY - Purpose Discovery', duration: '30 min' },
      { time: '10:20 AM', activity: 'Coffee Break', duration: '10 min' },
      { time: '10:30 AM', activity: 'HOW - Process Definition', duration: '30 min' },
      { time: '11:00 AM', activity: 'WHAT - Product Articulation', duration: '20 min' },
      { time: '11:20 AM', activity: 'Canvas Review & Refinement', duration: '20 min' },
      { time: '11:40 AM', activity: 'Voting & Consensus Building', duration: '15 min' },
      { time: '11:55 AM', activity: 'Next Steps & Wrap-up', duration: '5 min' }
    ],
    images: [
      'https://images.unsplash.com/photo-1565688527174-775059ac429c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHdvcmtzaG9wJTIwdGVhbSUyMGNvbGxhYm9yYXRpb258ZW58MXx8fHwxNzYzNDU1NDQ2fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1681949215173-fe0d15c790c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZWJvYXJkJTIwYnJhaW5zdG9ybWluZyUyMG1lZXRpbmd8ZW58MXx8fHwxNzYzNDU1NDQ2fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1576153192281-d558108925bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ24lMjB0aGlua2luZyUyMHdvcmtzaG9wJTIwc3RpY2t5JTIwbm90ZXN8ZW58MXx8fHwxNzYzNDU1NDQ3fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1758873268745-dd2cf0d677b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwc3RyYXRlZ3klMjBtZWV0aW5nJTIwb2ZmaWNlfGVufDF8fHx8MTc2MzQ1NTQ0N3ww&ixlib=rb-4.1.0&q=80&w=1080'
    ]
  };

  return (
    <div className="w-full space-y-6">
      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="canvas">Canvas</TabsTrigger>
          <TabsTrigger value="workshop">Workshop</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>

        {/* Overview Tab - AI Generated Report */}
        <TabsContent value="overview" className="space-y-6">
          {/* AI Generated Report Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5252E3] to-purple-600 flex items-center justify-center shadow-sm">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle>AI Gegenereerd Rapport</CardTitle>
                  <CardDescription>Gebaseerd op workshop uitkomsten en participant input</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Executive Summary */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-lg">Executive Summary</h3>
                  </div>
                  {!isLocked && !editingSummary && (
                    <Button
                      onClick={() => {
                        setTempSummary(executiveSummary);
                        setEditingSummary(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
                {editingSummary ? (
                  <div className="space-y-2">
                    <Textarea
                      value={tempSummary}
                      onChange={(e) => setTempSummary(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setEditingSummary(false)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          setExecutiveSummary(tempSummary);
                          setEditingSummary(false);
                        }}
                        size="sm"
                        className="bg-[#1FD1B2] hover:bg-[#1AB89C]"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {executiveSummary}
                  </p>
                )}
              </div>

              <Separator />

              {/* Key Findings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-lg">Belangrijkste Bevindingen</h3>
                </div>
                <div className="grid gap-4">
                  {insights.map((insight, index) => (
                    <div key={index} className="space-y-2">
                      {editingInsight === index ? (
                        <div className="space-y-2">
                          <Textarea
                            value={tempInsight}
                            onChange={(e) => setTempInsight(e.target.value)}
                            className="min-h-[80px]"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => setEditingInsight(null)}
                              variant="outline"
                              size="sm"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                const updatedInsights = [...insights];
                                updatedInsights[index] = tempInsight;
                                setInsights(updatedInsights);
                                setEditingInsight(null);
                              }}
                              size="sm"
                              className="bg-[#1FD1B2] hover:bg-[#1AB89C]"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button
                              onClick={() => {
                                setInsights(insights.filter((_, i) => i !== index));
                                setEditingInsight(null);
                              }}
                              size="sm"
                              variant="destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary mt-0.5">
                              {index + 1}
                            </div>
                            <p className="text-sm leading-relaxed flex-1">{insight}</p>
                          </div>
                          {!isLocked && (
                            <Button
                              onClick={() => {
                                setTempInsight(insight);
                                setEditingInsight(index);
                              }}
                              variant="outline"
                              size="sm"
                              className="mt-2"
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {!isLocked && (
                    <Button
                      onClick={() => setInsights([...insights, 'New insight'])}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Insight
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Strategic Recommendations */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="font-semibold text-lg">Strategische Aanbevelingen</h3>
                </div>
                <div className="space-y-3">
                  {nextSteps.map((step, index) => (
                    <div key={index} className="space-y-2">
                      {editingStep === index ? (
                        <div className="space-y-2">
                          <Input
                            value={tempStep}
                            onChange={(e) => setTempStep(e.target.value)}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => setEditingStep(null)}
                              variant="outline"
                              size="sm"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                const updatedSteps = [...nextSteps];
                                updatedSteps[index] = tempStep;
                                setNextSteps(updatedSteps);
                                setEditingStep(null);
                              }}
                              size="sm"
                              className="bg-[#1FD1B2] hover:bg-[#1AB89C]"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button
                              onClick={() => {
                                setNextSteps(nextSteps.filter((_, i) => i !== index));
                                setEditingStep(null);
                              }}
                              size="sm"
                              variant="destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                            <CheckCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm flex-1">{step}</span>
                          </div>
                          {!isLocked && (
                            <Button
                              onClick={() => {
                                setTempStep(step);
                                setEditingStep(index);
                              }}
                              variant="outline"
                              size="sm"
                              className="mt-2"
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {!isLocked && (
                    <Button
                      onClick={() => setNextSteps([...nextSteps, 'New recommendation'])}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Recommendation
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Canvas Tab */}
        <TabsContent value="canvas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workshop-Generated Golden Circle</CardTitle>
              <CardDescription>
                The final framework created collaboratively by all participants. {isLocked ? 'Unlock to edit the canvas.' : 'Fill in or edit the canvas below.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
            </CardContent>
          </Card>

          {/* Golden Circle Canvas Component */}
          <GoldenCircleCanvas 
            isLocked={isLocked}
            onLockToggle={onLockToggle}
            sessionData={{
              aggregatedData: {
                why: "To empower businesses through innovative technology solutions that create meaningful human connections and drive sustainable growth.",
                how: "By combining cutting-edge AI and automation with human-centered design principles, creating intuitive solutions that seamlessly integrate into existing workflows.",
                what: "We develop intelligent business automation platforms, AI-powered analytics tools, and digital transformation consulting services for mid-market companies."
              },
              sources: ['Workshop Session', 'Team Collaboration', 'Stakeholder Input']
            }}
          />
        </TabsContent>

        {/* Workshop Tab */}
        <TabsContent value="workshop" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Objectives */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Workshop Objectives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {objectives.map((objective, index) => (
                  <div key={index} className="space-y-2">
                    {editingObjective === index ? (
                      <div className="space-y-2">
                        <Input
                          value={tempObjective}
                          onChange={(e) => setTempObjective(e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => setEditingObjective(null)}
                            variant="outline"
                            size="sm"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              const updatedObjectives = [...objectives];
                              updatedObjectives[index] = tempObjective;
                              setObjectives(updatedObjectives);
                              setEditingObjective(null);
                            }}
                            size="sm"
                            className="bg-[#1FD1B2] hover:bg-[#1AB89C]"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button
                            onClick={() => {
                              setObjectives(objectives.filter((_, i) => i !== index));
                              setEditingObjective(null);
                            }}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm flex-1">{objective}</span>
                        </div>
                        {!isLocked && (
                          <Button
                            onClick={() => {
                              setTempObjective(objective);
                              setEditingObjective(index);
                            }}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {!isLocked && (
                  <Button
                    onClick={() => setObjectives([...objectives, 'New objective'])}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Objective
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  Participants ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {participants.map((participant, index) => (
                    <div key={index} className="space-y-2">
                      {editingParticipant === index ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Name"
                            value={tempParticipantName}
                            onChange={(e) => setTempParticipantName(e.target.value)}
                          />
                          <Input
                            placeholder="Role"
                            value={tempParticipantRole}
                            onChange={(e) => setTempParticipantRole(e.target.value)}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => setEditingParticipant(null)}
                              variant="outline"
                              size="sm"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                const updatedParticipants = [...participants];
                                updatedParticipants[index] = {
                                  ...updatedParticipants[index],
                                  name: tempParticipantName,
                                  role: tempParticipantRole
                                };
                                setParticipants(updatedParticipants);
                                setEditingParticipant(null);
                              }}
                              size="sm"
                              className="bg-[#1FD1B2] hover:bg-[#1AB89C]"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                setParticipants(participants.filter((_, i) => i !== index));
                                setEditingParticipant(null);
                              }}
                              size="sm"
                              variant="destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <div className="text-2xl">{participant.avatar}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{participant.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{participant.role}</div>
                            </div>
                          </div>
                          {!isLocked && (
                            <Button
                              onClick={() => {
                                setTempParticipantName(participant.name);
                                setTempParticipantRole(participant.role);
                                setEditingParticipant(index);
                              }}
                              variant="outline"
                              size="sm"
                              className="mt-1 w-full"
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {!isLocked && (
                  <Button
                    onClick={() => setParticipants([...participants, { name: 'New Participant', role: 'Role', avatar: '👤' }])}
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Participant
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Agenda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Workshop Agenda
              </CardTitle>
              <CardDescription>Complete timeline of activities and exercises</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {workshopData.agenda.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge variant="outline" className="font-mono text-xs min-w-20 justify-center">
                          {item.time}
                        </Badge>
                        <span className="font-medium">{item.activity}</span>
                      </div>
                      <span className="text-sm text-muted-foreground mr-2">{item.duration}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-4 pt-2 text-sm text-muted-foreground">
                        Activity details and notes will appear here during the workshop.
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-yellow-500" />
                Participant Notes & Insights
              </CardTitle>
              <CardDescription>
                Capture and share insights, observations, and suggestions from workshop participants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Note */}
              {!isLocked && (
                <>
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg border-2 border-dashed">
                    <div className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-primary" />
                      <h4 className="font-medium">Add New Note</h4>
                    </div>
                    <Textarea
                      placeholder="Share your insights, observations, or suggestions..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button onClick={addNote} disabled={!newNote.trim()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>

                  <Separator />
                </>
              )}

              {/* Existing Notes */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">All Notes ({notes.length})</h4>
                {notes.map((note) => (
                  <Card key={note.id} className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-yellow-500 text-white flex items-center justify-center font-semibold text-sm">
                            {note.author.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium">{note.author}</div>
                              <div className="text-xs text-muted-foreground">{note.timestamp}</div>
                            </div>
                            {!isLocked && (
                              <Button
                                onClick={() => deleteNote(note.id)}
                                variant="ghost"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed">{note.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-purple-500" />
                Workshop Gallery
              </CardTitle>
              <CardDescription>Photos captured during the session</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {workshopData.images.map((image, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden group cursor-pointer">
                    <ImageWithFallback
                      src={image}
                      alt={`Workshop photo ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
