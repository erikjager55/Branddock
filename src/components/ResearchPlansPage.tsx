import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PageHeader } from './ui/PageHeader';
import { Stack } from './ui/Stack';
import { Grid } from './ui/Grid';
import { Container } from './ui/Container';
import { Flex } from './ui/Flex';
import {
  Target,
  ArrowRight,
  Crown,
  Sparkles,
  Clock,
  BarChart3,
  Lock,
  MessageSquare,
  Crosshair,
  FileText,
  Map,
  Rocket,
  Radio,
  Mic,
  PieChart,
  Star,
  Lightbulb,
  TrendingUp,
  Package,
} from 'lucide-react';
import { ResearchBundle } from '../data/research-bundles';
import { researchBundles } from '../data/research-bundles';

interface ResearchPlansPageProps {
  onSelectBundle: (bundle: ResearchBundle) => void;
  onNavigateToCustomValidation?: () => void;
}

export function ResearchPlansPage({ onSelectBundle, onNavigateToCustomValidation }: ResearchPlansPageProps) {
  return (
    <div className="h-full overflow-auto bg-background">
      {/* Header - Using master component */}
      <PageHeader
        icon={Package}
        iconGradient="purple"
        title="Research Bundles"
        subtitle="Pre-packaged research plans that solve strategic risks and unlock decisions"
        actions={
          onNavigateToCustomValidation && (
            <Button onClick={onNavigateToCustomValidation} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Custom Validation
            </Button>
          )
        }
      />

      {/* Content - Using Container and Stack for auto layout */}
      <Container maxWidth="xl" paddingX="md" paddingY="md">
        <Stack direction="vertical" gap="xl">
          {/* Foundation Plans Highlight */}
          <Card variant="gradient">
            <CardHeader>
              <Flex align="center" gap="3">
                <Crown className="h-6 w-6 text-purple-600" />
                <Stack direction="vertical" gap="none">
                  <CardTitle>Foundation Plans</CardTitle>
                  <CardDescription>
                    Comprehensive research packages that eliminate multiple strategic risks at once
                  </CardDescription>
                </Stack>
              </Flex>
            </CardHeader>
            <CardContent>
              <Grid cols={2} gap="md">
                {researchBundles
                  .filter(b => b.bundleType === 'foundation')
                  .slice(0, 4)
                  .map((plan) => {
                    const toolCount = Array.isArray(plan.strategyToolUnlocked) 
                      ? plan.strategyToolUnlocked.length 
                      : 1;
                    
                    // Duration and impact metadata
                    const duration = plan.id === 'brand-essentials-foundation' ? '2 Weeks' :
                                   plan.id === 'customer-intelligence-foundation' ? '3 Weeks' :
                                   plan.id === 'complete-strategy-foundation' ? '4 Weeks' : '3 Weeks';
                    const impact = 'High Impact';
                    
                    // Map actual strategy tools to display
                    const toolsMapping: Record<string, { icon: any; name: string }> = {
                      'campaign-strategy-generator': { icon: Target, name: 'Campaign Strategy' },
                      'messaging-framework-builder': { icon: MessageSquare, name: 'Messaging Framework' },
                      'go-to-market-strategy': { icon: Rocket, name: 'Go-to-Market' },
                      'competitive-positioning-framework': { icon: Crosshair, name: 'Competitive Positioning' },
                      'brand-extension-opportunities': { icon: Sparkles, name: 'Brand Extension' },
                      'brand-architecture-framework': { icon: Package, name: 'Brand Architecture' },
                      'customer-journey-mapping': { icon: Map, name: 'Journey Mapping' },
                      'touchpoint-strategy': { icon: Target, name: 'Touchpoint Strategy' },
                      'loyalty-retention-strategy': { icon: Star, name: 'Retention Strategy' },
                      'product-concept-generator': { icon: Lightbulb, name: 'Product Concept' },
                      'content-strategy-planner': { icon: FileText, name: 'Content Strategy' },
                      'channel-strategy-advisor': { icon: Radio, name: 'Channel Strategy' },
                      'growth-strategy-roadmap': { icon: TrendingUp, name: 'Growth Roadmap' },
                    };
                    
                    // Get the actual tools for this plan
                    const unlockedTools = Array.isArray(plan.strategyToolUnlocked)
                      ? plan.strategyToolUnlocked.map(toolId => toolsMapping[toolId]).filter(Boolean)
                      : [];
                    
                    return (
                      <Card
                        key={plan.id}
                        className="border hover:border-gray-300 dark:hover:border-gray-600 transition-all group"
                      >
                        <CardContent className="p-5 space-y-4">
                          {/* 1. Header: Title + Badges */}
                          <div>
                            <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                              {plan.name}
                            </h5>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                <Clock className="h-3 w-3 mr-1" />
                                {duration}
                              </Badge>
                              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                <BarChart3 className="h-3 w-3 mr-1" />
                                {impact}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* 2. Section A: The Work (Validation Methods) */}
                          <div className="space-y-2">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                              REQ. RESEARCH (INPUT)
                            </p>
                            <div className="space-y-2 bg-blue-50/50 dark:bg-blue-950/10 rounded-lg p-3 border border-blue-100 dark:border-blue-900/30">
                              {/* Method 1: Interviews */}
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                                  <Mic className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                    Depth Interviews
                                  </p>
                                  <p className="text-[10px] text-gray-600 dark:text-gray-400">
                                    Qualitative
                                  </p>
                                </div>
                              </div>
                              
                              {/* Method 2: Survey */}
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                                  <PieChart className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                    Perception Survey
                                  </p>
                                  <p className="text-[10px] text-gray-600 dark:text-gray-400">
                                    Quantitative
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* 3. Section B: The Reward (Unlocked Strategy Suite) */}
                          <div className="space-y-2">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                              UNLOCKS {toolCount} TOOLS (OUTPUT)
                            </p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {unlockedTools.map((tool, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                                  title={tool.name}
                                >
                                  <Lock className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                  <span className="text-[9px] font-medium text-gray-700 dark:text-gray-300 truncate">
                                    {tool.name.replace('Campaign Strategy', 'Campaign Strat.').replace('Messaging Framework', 'Messaging').replace('Competitive Positioning', 'Comp. Position').replace('Brand Extension', 'Extension').replace('Brand Architecture', 'Architecture').replace('Content Strategy', 'Content')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* 4. Footer Action */}
                          <Button 
                            size="sm" 
                            className="w-full bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200"
                            variant="default"
                            onClick={() => onSelectBundle(plan)}
                          >
                            View Bundle Details
                            <ArrowRight className="h-3.5 w-3.5 ml-2" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}\n            </Grid>
            </CardContent>
          </Card>

          {/* All Bundles - Using Stack and Grid */}
          <Stack direction="vertical" gap="md">
            <h2 className="text-2xl font-semibold">All Research Bundles</h2>
            <Grid cols={3} gap="md">
              {researchBundles.map((plan) => (
                <Card
                  key={plan.id}
                  className="border hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => onSelectBundle(plan)}
                >
                  <CardHeader>
                    <Flex align="center" gap="3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <plan.icon className="h-5 w-5 text-primary" />
                      </div>
                      <Stack direction="vertical" gap="xs">
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs w-fit">
                          {plan.bundleType === 'foundation' ? 'Foundation' : 'Targeted'}
                        </Badge>
                      </Stack>
                    </Flex>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm line-clamp-2">
                      {plan.description}
                    </CardDescription>
                    <Flex align="center" justify="between" className="mt-4">
                      <span className="text-xs text-muted-foreground">
                        {Array.isArray(plan.strategyToolUnlocked) ? plan.strategyToolUnlocked.length : 1} tools unlocked
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Flex>
                  </CardContent>
                </Card>
              ))}
            </Grid>
          </Stack>
        </Stack>
      </Container>
    </div>
  );
}