/**
 * COMPONENT: Advisory & Services
 * 
 * Premium tier: Upsell environment with scheduled reviews,
 * guided validations, and research support.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('commercial');
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'validations' | 'support'>('overview');
  const tierInfo = PRODUCT_TIERS['advisory-services'];

  // Mock data for services
  const upcomingReviews = [
    {
      id: '1',
      type: t('advisory.reviews.items.review1.type'),
      date: t('advisory.reviews.items.review1.date'),
      time: '14:00 - 16:00',
      advisor: 'Sarah van den Berg',
      topics: [
        t('advisory.reviews.items.review1.topic1'),
        t('advisory.reviews.items.review1.topic2'),
        t('advisory.reviews.items.review1.topic3')
      ],
      status: 'scheduled' as const
    },
    {
      id: '2',
      type: t('advisory.reviews.items.review2.type'),
      date: t('advisory.reviews.items.review2.date'),
      time: '10:00 - 11:30',
      advisor: 'Marcus de Vries',
      topics: [
        t('advisory.reviews.items.review2.topic1'),
        t('advisory.reviews.items.review2.topic2'),
        t('advisory.reviews.items.review2.topic3')
      ],
      status: 'pending' as const
    }
  ];

  const guidedValidations = [
    {
      id: '1',
      title: t('advisory.validations.items.validation1.title'),
      description: t('advisory.validations.items.validation1.description'),
      duration: t('advisory.validations.items.validation1.duration'),
      deliverables: [
        t('advisory.validations.items.validation1.deliverable1'),
        t('advisory.validations.items.validation1.deliverable2'),
        t('advisory.validations.items.validation1.deliverable3')
      ],
      status: 'available' as const
    },
    {
      id: '2',
      title: t('advisory.validations.items.validation2.title'),
      description: t('advisory.validations.items.validation2.description'),
      duration: t('advisory.validations.items.validation2.duration'),
      deliverables: [
        t('advisory.validations.items.validation2.deliverable1'),
        t('advisory.validations.items.validation2.deliverable2'),
        t('advisory.validations.items.validation2.deliverable3')
      ],
      status: 'in-progress' as const
    }
  ];

  const supportServices = [
    {
      icon: MessageSquare,
      title: t('advisory.support.services.chat.title'),
      description: t('advisory.support.services.chat.description'),
      included: true
    },
    {
      icon: Video,
      title: t('advisory.support.services.video.title'),
      description: t('advisory.support.services.video.description'),
      included: true
    },
    {
      icon: FileText,
      title: t('advisory.support.services.research.title'),
      description: t('advisory.support.services.research.description'),
      included: true
    },
    {
      icon: Users,
      title: t('advisory.support.services.stakeholder.title'),
      description: t('advisory.support.services.stakeholder.description'),
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
              <p className="text-sm font-medium text-muted-foreground mb-1">{t('advisory.upsell.certaintyLevel')}</p>
              <p className="text-2xl font-bold mb-2">{tierInfo.certaintyLevel}</p>
              <p className="text-sm text-muted-foreground">{tierInfo.certaintyDescription}</p>
            </div>

            {/* What's Included */}
            <div>
              <h3 className="font-semibold mb-4 text-center">{t('advisory.upsell.whatYouGet')}</h3>
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
              <h3 className="font-semibold mb-3">{t('advisory.upsell.valuePropTitle')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('advisory.upsell.valuePropBody')}
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 rounded-lg bg-background/60">
                  <p className="text-2xl font-bold">95%+</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('advisory.upsell.statCertaintyLabel')}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/60">
                  <p className="text-2xl font-bold">4x</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('advisory.upsell.statFasterLabel')}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/60">
                  <p className="text-2xl font-bold">24/7</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('advisory.upsell.statAccessLabel')}</p>
                </div>
              </div>
            </div>

            {/* Pricing & CTA */}
            <div className="text-center space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border inline-block">
                <p className="text-sm text-muted-foreground mb-1">{t('advisory.upsell.investment')}</p>
                <p className="text-3xl font-bold">{tierInfo.price}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('advisory.upsell.pricingNote')}</p>
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
          <h1 className="text-3xl font-bold mb-2">{t('advisory.header.title')}</h1>
          <p className="text-muted-foreground">
            {t('advisory.header.subtitle')}
          </p>
        </div>
        <Badge className={tierInfo.color.badge} variant="outline">
          <Star className="h-3 w-3 mr-1" />
          {tierInfo.name}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <Shield className="h-4 w-4" />
            {t('advisory.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Calendar className="h-4 w-4" />
            {t('advisory.tabs.reviews')}
          </TabsTrigger>
          <TabsTrigger value="validations" className="gap-2">
            <Target className="h-4 w-4" />
            {t('advisory.tabs.validations')}
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            {t('advisory.tabs.support')}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('advisory.overview.activeAdvisor')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                    SB
                  </div>
                  <div>
                    <p className="font-semibold">Sarah van den Berg</p>
                    <p className="text-sm text-muted-foreground">{t('advisory.overview.advisorRole')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('advisory.overview.nextReview')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold mb-1">{t('advisory.overview.nextReviewDate')}</p>
                <p className="text-sm text-muted-foreground">{t('advisory.overview.nextReviewType')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('advisory.overview.responseTime')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold mb-1">&lt; 2h</p>
                <p className="text-sm text-muted-foreground">{t('advisory.overview.responseSupport')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>{t('advisory.overview.recentTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t('advisory.overview.activity1Title')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('advisory.overview.activity1Body')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{t('advisory.overview.activity1Time')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t('advisory.overview.activity2Title')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('advisory.overview.activity2Body')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{t('advisory.overview.activity2Time')}</p>
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
              <CardTitle>{t('advisory.reviews.title')}</CardTitle>
              <CardDescription>
                {t('advisory.reviews.description')}
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
                      {review.status === 'scheduled' ? t('advisory.reviews.statusScheduled') : t('advisory.reviews.statusPending')}
                    </Badge>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('advisory.reviews.advisorLabel')}</p>
                    <p className="text-sm">{review.advisor}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('advisory.reviews.agendaLabel')}</p>
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
                        {t('advisory.reviews.reschedule')}
                      </Button>
                      <Button size="sm">
                        {t('advisory.reviews.joinMeeting')}
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
              <CardTitle>{t('advisory.validations.title')}</CardTitle>
              <CardDescription>
                {t('advisory.validations.description')}
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
                      {validation.status === 'in-progress' ? t('advisory.validations.statusInProgress') : t('advisory.validations.statusAvailable')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('advisory.validations.deliverablesLabel')}</p>
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
                      {t('advisory.validations.startProgram')}
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
                          {t('advisory.support.useService')}
                        </Button>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        {t('advisory.support.included')}
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
