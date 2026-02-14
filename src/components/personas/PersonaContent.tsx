import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { 
  User, 
  Target, 
  Heart, 
  AlertTriangle, 
  Zap, 
  TrendingUp,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  Home,
  BookOpen,
  CheckCircle,
  Sparkles,
  Brain,
  Tag,
} from 'lucide-react';
import { Persona } from '../../types/persona';

interface PersonaContentProps {
  persona: Persona;
  isEditing: boolean;
  hasToolbar?: boolean;
  onUpdate?: (updatedPersona: Partial<Persona>) => void;
}

export function PersonaContent({ persona, isEditing, hasToolbar = false, onUpdate }: PersonaContentProps) {
  const [demographics, setDemographics] = useState({
    age: persona.demographics.age || '',
    location: persona.demographics.location || '',
    occupation: persona.demographics.occupation || '',
    income: persona.demographics.income || '',
    familyStatus: persona.demographics.familyStatus || '',
    education: persona.demographics.education || '',
  });

  const [goals, setGoals] = useState<string[]>(persona.goals || []);
  const [motivations, setMotivations] = useState<string[]>(persona.motivations || []);
  const [frustrations, setFrustrations] = useState<string[]>(persona.frustrations || []);
  const [behaviors, setBehaviors] = useState<string[]>(persona.behaviors || []);
  const [strategicImplications, setStrategicImplications] = useState<string[]>(
    persona.strategicImplications || []
  );

  const [psychographics, setPsychographics] = useState({
    personality: persona.personality || '',
    values: persona.values || [],
    interests: persona.interests || [],
  });

  const sections = [
    {
      key: 'demographics',
      title: 'Demographics',
      description: 'Key demographic information',
      icon: User,
      gradient: 'from-blue-500 to-cyan-500',
      bgLight: 'bg-blue-50 dark:bg-blue-900/20',
      borderLight: 'border-blue-200 dark:border-blue-800',
      fields: [
        { key: 'age', label: 'Age', icon: Calendar },
        { key: 'location', label: 'Location', icon: MapPin },
        { key: 'occupation', label: 'Occupation', icon: Briefcase },
        { key: 'income', label: 'Income', icon: DollarSign },
        { key: 'familyStatus', label: 'Family Status', icon: Home },
        { key: 'education', label: 'Education', icon: BookOpen },
      ],
    },
    {
      key: 'goals',
      title: 'Goals',
      description: 'Primary objectives and aspirations',
      icon: Target,
      gradient: 'from-green-500 to-emerald-500',
      bgLight: 'bg-green-50 dark:bg-green-900/20',
      borderLight: 'border-green-200 dark:border-green-800',
      impact: 'high' as const,
      items: goals,
      setItems: setGoals,
    },
    {
      key: 'motivations',
      title: 'Motivations',
      description: 'Core drivers and values',
      icon: Heart,
      gradient: 'from-pink-500 to-rose-500',
      bgLight: 'bg-pink-50 dark:bg-pink-900/20',
      borderLight: 'border-pink-200 dark:border-pink-800',
      impact: 'high' as const,
      items: motivations,
      setItems: setMotivations,
    },
    {
      key: 'frustrations',
      title: 'Frustrations',
      description: 'Pain points and challenges',
      icon: AlertTriangle,
      gradient: 'from-orange-500 to-amber-500',
      bgLight: 'bg-orange-50 dark:bg-orange-900/20',
      borderLight: 'border-orange-200 dark:border-orange-800',
      impact: 'medium' as const,
      items: frustrations,
      setItems: setFrustrations,
    },
    {
      key: 'behaviors',
      title: 'Behaviors',
      description: 'Observable actions and patterns',
      icon: Zap,
      gradient: 'from-purple-500 to-violet-500',
      bgLight: 'bg-purple-50 dark:bg-purple-900/20',
      borderLight: 'border-purple-200 dark:border-purple-800',
      impact: 'medium' as const,
      items: behaviors,
      setItems: setBehaviors,
    },
    {
      key: 'strategic-implications',
      title: 'Strategic Implications',
      description: 'How this persona impacts decisions',
      icon: TrendingUp,
      gradient: 'from-indigo-500 to-blue-500',
      bgLight: 'bg-indigo-50 dark:bg-indigo-900/20',
      borderLight: 'border-indigo-200 dark:border-indigo-800',
      impact: 'high' as const,
      items: strategicImplications,
      setItems: setStrategicImplications,
    },
  ];

  const getImpactBadgeClass = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'medium':
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'low':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  const handleDemographicChange = (field: string, value: string) => {
    setDemographics(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, value: string, items: string[], setItems: (items: string[]) => void) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const renderDemographicsCard = () => {
    const section = sections[0];
    const Icon = section.icon;

    return (
      <Card
        key={section.key}
        className={`border-2 transition-all shadow-sm hover:shadow-md overflow-hidden ${
          isEditing
            ? section.borderLight
            : 'border-gray-200 dark:border-gray-800'
        }`}
      >
        <CardContent className="p-0">
          {/* Passport Header Banner */}
          <div className={`bg-gradient-to-br ${section.gradient} px-6 py-4 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white">{section.title}</h3>
                <p className="text-xs text-white/80">{section.description}</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
              ID Profile
            </Badge>
          </div>

          {/* Passport Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {section.fields?.map((field, idx) => {
                const FieldIcon = field.icon;
                return (
                  <div 
                    key={field.key} 
                    className={`flex items-start gap-3 pb-3 ${
                      idx < section.fields!.length - 2 ? 'border-b border-gray-200 dark:border-gray-700' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <FieldIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                        {field.label}
                      </label>
                      {isEditing ? (
                        <Input
                          value={demographics[field.key as keyof typeof demographics]}
                          onChange={(e) => handleDemographicChange(field.key, e.target.value)}
                          className="h-8 text-sm font-mono"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      ) : (
                        <p className="text-sm font-semibold text-foreground truncate">
                          {demographics[field.key as keyof typeof demographics] || (
                            <span className="text-muted-foreground italic font-normal">Not specified</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Passport Footer Stripe */}
            <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-300 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span className="font-mono">PERSONA-{persona.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Verified Profile</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderListCard = (section: typeof sections[1]) => {
    const Icon = section.icon;

    return (
      <Card
        key={section.key}
        className={`border-2 transition-all shadow-sm hover:shadow-md ${
          isEditing
            ? section.borderLight
            : 'border-gray-200 dark:border-gray-800'
        }`}
      >
        <CardContent className="p-6">
          {/* Icon Header with Impact Badge */}
          <div className="flex items-start justify-between mb-4">
            <div
              className={`h-12 w-12 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center shadow-md flex-shrink-0`}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
            {section.impact && (
              <Badge variant="outline" className={`text-xs ${getImpactBadgeClass(section.impact)}`}>
                {section.impact} impact
              </Badge>
            )}
          </div>

          {/* Title */}
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-1">{section.title}</h3>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </div>

          {/* Content */}
          <div className={`${section.bgLight} ${section.borderLight} border rounded-lg p-4`}>
            {isEditing ? (
              <Textarea
                value={section.items?.join('\n') || ''}
                onChange={(e) => section.setItems?.(e.target.value.split('\n').filter(line => line.trim()))}
                className="min-h-[120px] text-sm resize-none"
                placeholder={`Enter ${section.title.toLowerCase()} (one per line)`}
              />
            ) : (
              <div className="space-y-2">
                {section.items && section.items.length > 0 ? (
                  section.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        section.key === 'goals' ? 'text-green-600' :
                        section.key === 'motivations' ? 'text-pink-600' :
                        section.key === 'frustrations' ? 'text-orange-600' :
                        section.key === 'behaviors' ? 'text-purple-600' :
                        'text-indigo-600'
                      }`} />
                      <p className="text-sm leading-relaxed">{item}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No {section.title.toLowerCase()} defined yet
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Item Count */}
          {!isEditing && section.items && section.items.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>{section.items.length} {section.items.length === 1 ? 'item' : 'items'}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPsychographicsCard = () => {
    return (
      <Card
        className={`border-2 transition-all shadow-sm hover:shadow-md ${
          isEditing
            ? 'border-teal-200 dark:border-teal-800'
            : 'border-gray-200 dark:border-gray-800'
        }`}
      >
        <CardContent className="p-6">
          {/* Icon Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md flex-shrink-0">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <Badge variant="outline" className="text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800">
              medium impact
            </Badge>
          </div>

          {/* Title */}
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-1">Psychographics</h3>
            <p className="text-sm text-muted-foreground">Personality, values, and interests</p>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Personality */}
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Personality Type
                </label>
              </div>
              {isEditing ? (
                <Input
                  value={psychographics.personality}
                  onChange={(e) => setPsychographics(prev => ({ ...prev, personality: e.target.value }))}
                  className="h-8 text-sm"
                  placeholder="e.g., INTJ, Analytical Thinker"
                />
              ) : (
                <p className="text-sm font-medium">
                  {psychographics.personality || (
                    <span className="text-muted-foreground italic">Not specified</span>
                  )}
                </p>
              )}
            </div>

            {/* Values */}
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Core Values
                </label>
              </div>
              {isEditing ? (
                <Textarea
                  value={psychographics.values.join('\n')}
                  onChange={(e) => setPsychographics(prev => ({ 
                    ...prev, 
                    values: e.target.value.split('\n').filter(line => line.trim()) 
                  }))}
                  className="min-h-[80px] text-sm resize-none"
                  placeholder="Enter values (one per line)"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {psychographics.values.length > 0 ? (
                    psychographics.values.map((value, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
                        {value}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">No values defined yet</span>
                  )}
                </div>
              )}
            </div>

            {/* Interests */}
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Interests & Hobbies
                </label>
              </div>
              {isEditing ? (
                <Textarea
                  value={psychographics.interests.join('\n')}
                  onChange={(e) => setPsychographics(prev => ({ 
                    ...prev, 
                    interests: e.target.value.split('\n').filter(line => line.trim()) 
                  }))}
                  className="min-h-[80px] text-sm resize-none"
                  placeholder="Enter interests (one per line)"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {psychographics.interests.length > 0 ? (
                    psychographics.interests.map((interest, idx) => (
                      <Badge key={idx} variant="outline" className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700">
                        {interest}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">No interests defined yet</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats Footer */}
          {!isEditing && (psychographics.values.length > 0 || psychographics.interests.length > 0) && (
            <div className="mt-4 pt-3 border-t border-teal-200 dark:border-teal-800 flex items-center gap-4 text-sm text-muted-foreground">
              {psychographics.values.length > 0 && (
                <div className="flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  <span>{psychographics.values.length} values</span>
                </div>
              )}
              {psychographics.interests.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  <span>{psychographics.interests.length} interests</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${hasToolbar ? 'border border-t-0 border-gray-200 dark:border-gray-800 rounded-b-2xl p-6 bg-white dark:bg-gray-900' : ''}`}>
      {/* Demographics Card - Full Width on First Row */}
      <div className="md:col-span-3">
        {renderDemographicsCard()}
      </div>

      {/* Psychographics Card - Full Width on Second Row */}
      <div className="md:col-span-3">
        {renderPsychographicsCard()}
      </div>

      {/* Goals and Motivations */}
      {renderListCard(sections[1])}
      {renderListCard(sections[2])}

      {/* Frustrations */}
      {renderListCard(sections[3])}

      {/* Behaviors and Strategic Implications - Side by Side */}
      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderListCard(sections[4])}
        {renderListCard(sections[5])}
      </div>
    </div>
  );
}