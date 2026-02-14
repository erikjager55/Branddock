import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import {
  ArrowLeft,
  Save,
  X,
  Users,
  Target,
  Heart,
  AlertCircle,
  TrendingUp,
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap,
  DollarSign,
  MessageSquare,
  ClipboardList,
  Eye,
  Plus,
  Sparkles,
  BarChart3,
  Brain,
  Home,
  Activity,
  Lightbulb
} from 'lucide-react';
import { Persona, PersonaStatus } from '../types/persona';

interface CreatePersonaProps {
  onBack: () => void;
  onCreate: (persona: Persona) => void;
}

export function CreatePersona({ onBack, onCreate }: CreatePersonaProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [newPersona, setNewPersona] = useState<Partial<Persona>>({
    name: '',
    tagline: '',
    avatar: '',
    status: 'draft' as PersonaStatus,
    demographics: {
      age: '',
      gender: '',
      location: '',
      occupation: '',
      education: '',
      income: ''
    },
    goals: [''],
    frustrations: [''],
    motivations: [''],
    behaviors: [''],
    values: [''],
    interests: [''],
    researchCoverage: 0,
    researchMethods: [],
    validationScore: 0
  });

  const handleSave = () => {
    // Generate ID and create persona
    const persona: Persona = {
      ...newPersona,
      id: `persona-${Date.now()}`,
      name: newPersona.name || 'Unnamed Persona',
      tagline: newPersona.tagline || '',
      status: newPersona.status || 'draft',
      demographics: newPersona.demographics || {
        age: '',
        gender: '',
        location: '',
        occupation: '',
        education: '',
        income: ''
      },
      goals: newPersona.goals?.filter(g => g.trim()) || [],
      frustrations: newPersona.frustrations?.filter(f => f.trim()) || [],
      motivations: newPersona.motivations?.filter(m => m.trim()) || [],
      behaviors: newPersona.behaviors?.filter(b => b.trim()) || [],
      values: newPersona.values?.filter(v => v.trim()) || [],
      interests: newPersona.interests?.filter(i => i.trim()) || [],
      researchCoverage: newPersona.researchCoverage || 0,
      researchMethods: newPersona.researchMethods || [],
      validationScore: newPersona.validationScore || 0
    } as Persona;
    
    onCreate(persona);
  };

  // Helper functions for list editing
  const handleAddListItem = (field: 'goals' | 'frustrations' | 'motivations' | 'behaviors' | 'values' | 'interests') => {
    setNewPersona({
      ...newPersona,
      [field]: [...(newPersona[field] || []), '']
    });
  };

  const handleUpdateListItem = (field: 'goals' | 'frustrations' | 'motivations' | 'behaviors' | 'values' | 'interests', index: number, value: string) => {
    const newList = [...(newPersona[field] || [])];
    newList[index] = value;
    setNewPersona({
      ...newPersona,
      [field]: newList
    });
  };

  const handleRemoveListItem = (field: 'goals' | 'frustrations' | 'motivations' | 'behaviors' | 'values' | 'interests', index: number) => {
    setNewPersona({
      ...newPersona,
      [field]: (newPersona[field] || []).filter((_, i) => i !== index)
    });
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Personas
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="h-20 w-20 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center ring-4 ring-purple-100 dark:ring-purple-900/30">
                <Users className="h-10 w-10 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="space-y-2 mb-2">
                  <Input
                    value={newPersona.name || ''}
                    onChange={(e) => setNewPersona({
                      ...newPersona,
                      name: e.target.value
                    })}
                    placeholder="Enter persona name"
                    className="text-3xl font-bold h-12"
                  />
                  <Input
                    value={newPersona.tagline || ''}
                    onChange={(e) => setNewPersona({
                      ...newPersona,
                      tagline: e.target.value
                    })}
                    placeholder="Enter persona tagline"
                    className="text-lg"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Draft
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onBack}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Create Persona
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="psychographics">Psychographics</TabsTrigger>
            <TabsTrigger value="background">Background</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Demographics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Demographics
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Age
                  </Label>
                  <Input
                    value={newPersona.demographics?.age || ''}
                    onChange={(e) => setNewPersona({
                      ...newPersona,
                      demographics: { ...newPersona.demographics, age: e.target.value }
                    })}
                    placeholder="e.g., 32"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Gender
                  </Label>
                  <Input
                    value={newPersona.demographics?.gender || ''}
                    onChange={(e) => setNewPersona({
                      ...newPersona,
                      demographics: { ...newPersona.demographics, gender: e.target.value }
                    })}
                    placeholder="e.g., Female"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Location
                  </Label>
                  <Input
                    value={newPersona.demographics?.location || ''}
                    onChange={(e) => setNewPersona({
                      ...newPersona,
                      demographics: { ...newPersona.demographics, location: e.target.value }
                    })}
                    placeholder="e.g., Amsterdam, Netherlands"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    Occupation
                  </Label>
                  <Input
                    value={newPersona.demographics?.occupation || ''}
                    onChange={(e) => setNewPersona({
                      ...newPersona,
                      demographics: { ...newPersona.demographics, occupation: e.target.value }
                    })}
                    placeholder="e.g., Product Manager"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    Education
                  </Label>
                  <Input
                    value={newPersona.demographics?.education || ''}
                    onChange={(e) => setNewPersona({
                      ...newPersona,
                      demographics: { ...newPersona.demographics, education: e.target.value }
                    })}
                    placeholder="e.g., Bachelor's Degree"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Income
                  </Label>
                  <Input
                    value={newPersona.demographics?.income || ''}
                    onChange={(e) => setNewPersona({
                      ...newPersona,
                      demographics: { ...newPersona.demographics, income: e.target.value }
                    })}
                    placeholder="e.g., €60,000 - €80,000"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Avatar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Avatar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Avatar URL</Label>
                  <Input
                    value={newPersona.avatar || ''}
                    onChange={(e) => setNewPersona({
                      ...newPersona,
                      avatar: e.target.value
                    })}
                    placeholder="Enter image URL for persona avatar"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Psychographics Tab */}
          <TabsContent value="psychographics" className="space-y-6">
            {/* Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Goals
                </CardTitle>
                <CardDescription>
                  What does this persona want to achieve?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(newPersona.goals || ['']).map((goal, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={goal}
                      onChange={(e) => handleUpdateListItem('goals', index, e.target.value)}
                      placeholder="Enter a goal..."
                    />
                    {(newPersona.goals?.length || 0) > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveListItem('goals', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddListItem('goals')}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
                </Button>
              </CardContent>
            </Card>

            {/* Frustrations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Frustrations
                </CardTitle>
                <CardDescription>
                  What challenges or pain points does this persona face?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(newPersona.frustrations || ['']).map((frustration, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={frustration}
                      onChange={(e) => handleUpdateListItem('frustrations', index, e.target.value)}
                      placeholder="Enter a frustration..."
                    />
                    {(newPersona.frustrations?.length || 0) > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveListItem('frustrations', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddListItem('frustrations')}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Frustration
                </Button>
              </CardContent>
            </Card>

            {/* Motivations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-600" />
                  Motivations
                </CardTitle>
                <CardDescription>
                  What drives this persona's decisions and actions?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(newPersona.motivations || ['']).map((motivation, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={motivation}
                      onChange={(e) => handleUpdateListItem('motivations', index, e.target.value)}
                      placeholder="Enter a motivation..."
                    />
                    {(newPersona.motivations?.length || 0) > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveListItem('motivations', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddListItem('motivations')}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Motivation
                </Button>
              </CardContent>
            </Card>

            {/* Values */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Values
                </CardTitle>
                <CardDescription>
                  What principles and beliefs are important to this persona?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(newPersona.values || ['']).map((value, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={value}
                      onChange={(e) => handleUpdateListItem('values', index, e.target.value)}
                      placeholder="Enter a value..."
                    />
                    {(newPersona.values?.length || 0) > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveListItem('values', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddListItem('values')}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Value
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Background Tab */}
          <TabsContent value="background" className="space-y-6">
            {/* Behaviors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Behaviors
                </CardTitle>
                <CardDescription>
                  How does this persona typically act or behave?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(newPersona.behaviors || ['']).map((behavior, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={behavior}
                      onChange={(e) => handleUpdateListItem('behaviors', index, e.target.value)}
                      placeholder="Enter a behavior..."
                    />
                    {(newPersona.behaviors?.length || 0) > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveListItem('behaviors', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddListItem('behaviors')}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Behavior
                </Button>
              </CardContent>
            </Card>

            {/* Interests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                  Interests
                </CardTitle>
                <CardDescription>
                  What hobbies, topics, or activities interest this persona?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(newPersona.interests || ['']).map((interest, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={interest}
                      onChange={(e) => handleUpdateListItem('interests', index, e.target.value)}
                      placeholder="Enter an interest..."
                    />
                    {(newPersona.interests?.length || 0) > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveListItem('interests', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddListItem('interests')}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Interest
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
