import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { 
  ArrowRight,
  Target,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { WelcomeModal, useShouldShowWelcome } from './WelcomeModal';
import { DecisionStatusBadge } from './decision-status/DecisionStatusBadge';
import { calculateDecisionStatus } from '../utils/decision-status-calculator';
import { 
  calculateSimpleDashboardStatus,
  generateTopStrategicRisks,
  generateNextBestAction,
  transformToDecisionCockpit 
} from '../utils/dashboard-decision-transformer';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { mockPersonas } from '../data/mock-personas';
import { DecisionImpactPanel } from './impact/DecisionImpactPanel';

interface DashboardProps {
  onStartResearch?: () => void;
  onNavigateToRelationships?: () => void;
  onNavigate?: (url: string) => void;
}

export function Dashboard({ onStartResearch, onNavigateToRelationships, onNavigate }: DashboardProps) {
  const [showWelcome, setShowWelcome] = React.useState(false);
  const shouldShowWelcome = useShouldShowWelcome();

  React.useEffect(() => {
    setShowWelcome(shouldShowWelcome);
  }, [shouldShowWelcome]);

  // Simple dashboard status
  const dashboardStatus = React.useMemo(() => calculateSimpleDashboardStatus(), []);
  
  // Top 2 strategic risks
  const topRisks = React.useMemo(() => generateTopStrategicRisks(), []);
  
  // Next best action (SINGLE)
  const nextBestAction = React.useMemo(() => {
    const action = generateNextBestAction();
    if (!action) {
      return {
        title: 'Continue Building',
        description: 'Your strategic foundation is strong. Keep validating and refining.',
        actionLabel: 'View Research Hub',
        targetSection: 'research',
        estimatedTime: ''
      };
    }
    return {
      title: action.title,
      description: action.reason,
      actionLabel: 'Take Action',
      targetSection: action.targetType === 'asset' ? 'brand' : action.targetType === 'persona' ? 'personas' : 'research',
      estimatedTime: action.estimatedTime
    };
  }, []);

  // Decision cockpit data for overview
  const decisionCockpitData = React.useMemo(() => transformToDecisionCockpit(), []);

  const handleNavigate = (section: string) => {
    if (onNavigate) {
      onNavigate(section);
    }
  };

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-1">Overview</h1>
              <p className="text-muted-foreground">
                Strategic overview of your brand research and validation progress
              </p>
            </div>
            <DecisionStatusBadge 
              status={dashboardStatus.status}
              size="lg"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        
        {/* Top Stats Grid - Compact 4-column */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">COVERAGE</span>
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold">{decisionCockpitData.avgCoverage}%</div>
              <Progress value={decisionCockpitData.avgCoverage} className="h-1.5 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">READY</span>
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {decisionCockpitData.readyToDecide}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Assets validated</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">AT RISK</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {decisionCockpitData.atRiskCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">IN PROGRESS</span>
                <Target className="h-4 w-4 text-slate-600" />
              </div>
              <div className="text-2xl font-bold text-slate-600">
                {decisionCockpitData.blockedCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Being researched</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid - 2 columns on desktop */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Left Column - 2 cols wide */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Recommended Next Step - Prominent CTA */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1">{nextBestAction.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{nextBestAction.description}</p>
                    <div className="flex items-center gap-3">
                      <Button 
                        onClick={() => handleNavigate(nextBestAction.targetSection)}
                        className="gap-2"
                      >
                        {nextBestAction.actionLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      {nextBestAction.estimatedTime && (
                        <span className="text-xs text-muted-foreground">
                          {nextBestAction.estimatedTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What Needs Your Attention */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  What Needs Your Attention
                </CardTitle>
                <CardDescription>
                  {dashboardStatus.recommendation}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topRisks.slice(0, 2).map((risk, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors group cursor-pointer"
                    onClick={() => handleNavigate(risk.targetSection)}
                  >
                    <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium mb-1">{risk.title}</h4>
                      <p className="text-sm text-muted-foreground">{risk.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                  </div>
                ))}
                
                {topRisks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                    <p className="font-medium">All systems ready</p>
                    <p className="text-sm">No immediate risks detected</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Decision Impact Panel */}
            <DecisionImpactPanel />
          </div>

          {/* Right Column - Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground px-1">QUICK ACCESS</h3>
            
            <button
              onClick={() => handleNavigate('brand')}
              className="w-full group p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/50 transition-all text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-semibold mb-1">Brand Assets</h3>
              <p className="text-sm text-muted-foreground">
                {mockBrandAssets.length} assets
              </p>
            </button>

            <button
              onClick={() => handleNavigate('personas')}
              className="w-full group p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/50 transition-all text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-semibold mb-1">Personas</h3>
              <p className="text-sm text-muted-foreground">
                {mockPersonas.length} personas
              </p>
            </button>

            <button
              onClick={() => handleNavigate('research')}
              className="w-full group p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/50 transition-all text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-semibold mb-1">Research Hub</h3>
              <p className="text-sm text-muted-foreground">
                Active research
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}