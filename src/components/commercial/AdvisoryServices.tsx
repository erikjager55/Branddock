/**
 * COMPONENT: Advisory & Services
 * 
 * Premium tier: Upsell omgeving met geplande reviews,
 * begeleide validaties, en research ondersteuning.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Calendar,
  CheckCircle,
  Users,
  Lightbulb,
  ArrowRight,
  Clock,
  Target,
  MessageSquare,
  Star,
  Shield,
  FileText,
  Video
} from 'lucide-react';
import { PRODUCT_TIERS } from '../../types/product-tier';

interface AdvisoryServicesProps {
  onScheduleConsultation?: () => void;
  currentTier?: 'decision-scan' | 'strategic-control' | 'advisory-services';
}

export function AdvisoryServices({ onScheduleConsultation, currentTier = 'strategic-control' }: AdvisoryServicesProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'validations' | 'support'>('overview');
  const tierInfo = PRODUCT_TIERS['advisory-services'];

  // Mock data for services
  const upcomingReviews = [
    {
      id: '1',
      type: 'Quarterly Strategic Review',
      date: '15 januari 2025',
      time: '14:00 - 16:00',
      advisor: 'Sarah van den Berg',
      topics: [
        'Q4 campaign performance analyse',
        'Research coverage assessment',
        'Q1 strategic priorities'
      ],
      status: 'scheduled' as const
    },
    {
      id: '2',
      type: 'Brand Asset Deep Dive',
      date: '22 januari 2025',
      time: '10:00 - 11:30',
      advisor: 'Marcus de Vries',
      topics: [
        'Core value proposition validatie',
        'Messaging consistency review',
        'Competitive positioning update'
      ],
      status: 'pending' as const
    }
  ];

  const guidedValidations = [
    {
      id: '1',
      title: 'Persona Validation Program',
      description: 'Expert-begeleide user research voor top 3 persona segmenten',
      duration: '4 weken',
      deliverables: [
        '15+ user interviews',
        'Persona profiles + validatie rapport',
        'Strategic recommendations'
      ],
      status: 'available' as const
    },
    {
      id: '2',
      title: 'Brand Messaging Test',
      description: 'Multi-channel messaging validatie met A/B testing expertise',
      duration: '3 weken',
      deliverables: [
        'Test design + implementatie',
        'Statistical analysis',
        'Optimization roadmap'
      ],
      status: 'in-progress' as const
    }
  ];

  const supportServices = [
    {
      icon: MessageSquare,
      title: 'Prioritaire Chat Support',
      description: 'Directe toegang tot strategy advisors binnen 2 uur',
      included: true
    },
    {
      icon: Video,
      title: 'On-Demand Video Calls',
      description: 'Flexibele expert consultaties voor acute vraagstukken',
      included: true
    },
    {
      icon: FileText,
      title: 'Custom Research Design',
      description: 'Ontwerp van onderzoek specifiek voor jouw strategische vragen',
      included: true
    },
    {
      icon: Users,
      title: 'Stakeholder Presentaties',
      description: 'Expert presentaties voor board en senior management',
      included: true
    }
  ];

  if (currentTier !== 'advisory-services') {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Card className="border-2">
          <CardHeader className="text-center pb-8">
            <div className={`inline-flex items-center justify-center h-16 w-16 rounded-2xl mx-auto mb-6 ${tierInfo.color.badge}`}>
              <Star className={`h-8 w-8 ${tierInfo.color.text}`} />
            </div>
            <CardTitle className="text-3xl mb-3">{tierInfo.name}</CardTitle>
            <CardDescription className="text-lg max-w-2xl mx-auto">
              {tierInfo.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Certainty Level */}
            <div className="text-center p-6 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium text-muted-foreground mb-1">Besliszekerheid Niveau</p>
              <p className="text-2xl font-bold mb-2">{tierInfo.certaintyLevel}</p>
              <p className="text-sm text-muted-foreground">{tierInfo.certaintyDescription}</p>
            </div>

            {/* What's Included */}
            <div>
              <h3 className="font-semibold mb-4 text-center">Wat je krijgt:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tierInfo.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Value Proposition */}
            <div className={`p-6 rounded-lg ${tierInfo.color.bg} border-2 border-current`}>
              <h3 className="font-semibold mb-3">Maximale Besliszekerheid met Expert Begeleiding</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Voor organisaties die kritieke strategische beslissingen nemen met significante impact. 
                Ons Advisory & Services programma combineert de kracht van het Strategic Control platform 
                met hands-on expert begeleiding voor maximale confidence in elke beslissing.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 rounded-lg bg-background/60">
                  <p className="text-2xl font-bold">95%+</p>
                  <p className="text-xs text-muted-foreground mt-1">Decision Certainty</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/60">
                  <p className="text-2xl font-bold">4x</p>
                  <p className="text-xs text-muted-foreground mt-1">Sneller Valideren</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/60">
                  <p className="text-2xl font-bold">24/7</p>
                  <p className="text-xs text-muted-foreground mt-1">Expert Toegang</p>
                </div>
              </div>
            </div>

            {/* Pricing & CTA */}
            <div className="text-center space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border inline-block">
                <p className="text-sm text-muted-foreground mb-1">Investering</p>
                <p className="text-3xl font-bold">{tierInfo.price}</p>
                <p className="text-sm text-muted-foreground mt-1">Gebaseerd op je organisatie en behoeften</p>
              </div>
              <div className="flex gap-3 max-w-md mx-auto">
                <Button size="lg" className="flex-1 gap-2" onClick={onScheduleConsultation}>
                  {tierInfo.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has Advisory & Services tier - show the dashboard
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Advisory & Services</h1>
          <p className="text-muted-foreground">
            Expert begeleiding voor maximale besliszekerheid
          </p>
        </div>
        <Badge className={tierInfo.color.badge} variant="outline">
          <Star className="h-3 w-3 mr-1" />
          {tierInfo.name}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <Shield className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Calendar className="h-4 w-4" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="validations" className="gap-2">
            <Target className="h-4 w-4" />
            Validations
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Support
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Advisor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                    SB
                  </div>
                  <div>
                    <p className="font-semibold">Sarah van den Berg</p>
                    <p className="text-sm text-muted-foreground">Senior Strategy Advisor</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Next Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold mb-1">15 jan</p>
                <p className="text-sm text-muted-foreground">Quarterly Strategic Review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Response Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold mb-1">&lt; 2h</p>
                <p className="text-sm text-muted-foreground">Prioritaire support toegang</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recente Expert Interacties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Brand Messaging Review Afgerond</p>
                    <p className="text-sm text-muted-foreground">
                      Expert validatie van kernboodschap - 3 optimalisaties aanbevolen
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">2 dagen geleden</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Strategic Consultation: Q1 Campagne Planning</p>
                    <p className="text-sm text-muted-foreground">
                      1-op-1 sessie met Sarah - actieplan gedefinieerd
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">5 dagen geleden</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Geplande Strategic Reviews</CardTitle>
              <CardDescription>
                Kwartaal reviews en deep-dive sessies met je strategy advisor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingReviews.map((review) => (
                <div key={review.id} className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold mb-1">{review.type}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {review.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {review.time}
                        </span>
                      </div>
                    </div>
                    <Badge variant={review.status === 'scheduled' ? 'default' : 'outline'}>
                      {review.status === 'scheduled' ? 'Gepland' : 'In afwachting'}
                    </Badge>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Advisor</p>
                    <p className="text-sm">{review.advisor}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Agenda Topics</p>
                    <div className="space-y-1">
                      {review.topics.map((topic, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <span>{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {review.status === 'scheduled' && (
                    <div className="mt-4 pt-4 border-t flex gap-2">
                      <Button variant="outline" size="sm">
                        Reschedule
                      </Button>
                      <Button size="sm">
                        Join Meeting
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validations Tab */}
        <TabsContent value="validations" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Begeleide Validatie Programma's</CardTitle>
              <CardDescription>
                Expert-ondersteuning voor kritieke research en validatie projecten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {guidedValidations.map((validation) => (
                <div key={validation.id} className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{validation.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{validation.description}</p>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {validation.duration}
                      </Badge>
                    </div>
                    <Badge variant={validation.status === 'in-progress' ? 'default' : 'outline'}>
                      {validation.status === 'in-progress' ? 'In Progress' : 'Beschikbaar'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Deliverables</p>
                    <div className="space-y-1">
                      {validation.deliverables.map((deliverable, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <span>{deliverable}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {validation.status === 'available' && (
                    <Button className="w-full mt-4" variant="outline">
                      Start Validatie Program
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="space-y-6 mt-6">
          <div className="grid gap-6">
            {supportServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6 text-purple-700 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{service.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                        <Button size="sm" variant="outline">
                          Gebruik Service
                        </Button>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        Inbegrepen
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
