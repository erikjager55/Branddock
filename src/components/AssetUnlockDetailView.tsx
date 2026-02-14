import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { calculateDecisionStatus } from '../utils/decision-status-calculator';
import { ResearchFlowModal } from './ResearchFlowModal';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  MessageCircle,
  FileText,
  Brain,
  Target,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Zap,
  TrendingUp,
  Shield,
  Crown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SPACING, 
  TYPOGRAPHY, 
  ICON_SIZES, 
  ICON_CONTAINERS,
  COLORS,
  CARD_VARIANTS,
  ANIMATION,
} from '../constants/design-system';

interface AssetUnlockDetailViewProps {
  assetId: string;
  onBack: () => void;
  onStartResearch: (methodId: string) => void;
}

// Research method definitions
const researchMethods = [
  {
    id: 'ai-exploration',
    name: 'AI Exploration',
    description: 'Instant AI-powered insights and strategic analysis',
    icon: Brain,
    unlockLevel: 'free',
    impact: 'Medium',
    duration: '5 min',
    unlocksPotential: 35,
  },
  {
    id: 'workshop',
    name: 'Workshop',
    description: 'Collaborative stakeholder session with guided exercises',
    icon: Users,
    unlockLevel: 'free',
    impact: 'High',
    duration: '2-4 hours',
    unlocksPotential: 45,
  },
  {
    id: 'interviews',
    name: 'Interviews',
    description: 'Deep-dive conversations with key stakeholders',
    icon: MessageCircle,
    unlockLevel: 'basic',
    impact: 'High',
    duration: '45-60 min',
    unlocksPotential: 40,
  },
  {
    id: 'questionnaire',
    name: 'Questionnaire',
    description: 'Structured survey for broad stakeholder input',
    icon: FileText,
    unlockLevel: 'basic',
    impact: 'Medium',
    duration: '1-2 weeks',
    unlocksPotential: 25,
  },
];

export function AssetUnlockDetailView({ assetId, onBack, onStartResearch }: AssetUnlockDetailViewProps) {
  const [selectedLayout, setSelectedLayout] = useState<'default' | 'alternative'>('default');
  const [selectedMethod, setSelectedMethod] = useState<typeof researchMethods[0] | null>(null);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [localAsset, setLocalAsset] = useState(mockBrandAssets.find((a) => a.id === assetId));
  
  if (!localAsset) return null;

  const decisionStatus = calculateDecisionStatus(localAsset);
  const completedMethods = localAsset.researchMethods.filter((m) => m.status === 'completed');
  const totalMethods = researchMethods.length;
  const unlockProgress = (completedMethods.length / totalMethods) * 100;

  // Calculate total unlock potential
  const totalUnlockPotential = completedMethods.reduce((sum, method) => {
    const methodDef = researchMethods.find((m) => m.id === method.type);
    return sum + (methodDef?.unlocksPotential || 0);
  }, 0);

  // Handle research start
  const handleStartResearch = (methodId: string) => {
    const method = researchMethods.find((m) => m.id === methodId);
    if (!method) return;
    
    setSelectedMethod(method);
    setIsFlowModalOpen(true);
  };

  // Handle research completion
  const handleResearchComplete = (methodId: string) => {
    // Update local asset state
    setLocalAsset(prev => {
      if (!prev) return prev;
      
      const updatedMethods = prev.researchMethods.map(m => 
        m.type === methodId ? { ...m, status: 'completed' as const } : m
      );
      
      // If method doesn't exist, add it
      const methodExists = prev.researchMethods.some(m => m.type === methodId);
      if (!methodExists) {
        updatedMethods.push({
          type: methodId as any,
          status: 'completed',
          completedDate: new Date().toISOString(),
        });
      }
      
      return { ...prev, researchMethods: updatedMethods };
    });

    // Show success toast
    const method = researchMethods.find((m) => m.id === methodId);
    toast.success(`${method?.name} voltooid!`, {
      description: `+${method?.unlocksPotential}% besliskracht toegevoegd aan ${localAsset.type}`,
      duration: 5000,
    });

    // Check if unlocked
    setTimeout(() => {
      const newDecisionStatus = calculateDecisionStatus(localAsset);
      if (newDecisionStatus.status === 'safe-to-decide' && decisionStatus.status !== 'safe-to-decide') {
        toast.success('🎉 Asset unlocked!', {
          description: `${localAsset.type} is now fully unlocked and ready for strategic decisions.`,
          duration: 7000,
        });
      }
    }, 1000);

    setIsFlowModalOpen(false);
    onStartResearch(methodId);
  };

  const getStatusConfig = () => {
    switch (decisionStatus.status) {
      case 'safe-to-decide':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          label: 'Ready to Decide',
          message: 'Dit asset heeft voldoende onderzoek om strategische beslissingen te maken',
        };
      case 'decision-at-risk':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          label: 'Meer onderzoek aanbevolen',
          message: 'Voer extra onderzoek uit om besluitvorming te versterken',
        };
      case 'blocked':
        return {
          icon: Lock,
          color: 'text-red-600',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          label: 'Geblokkeerd',
          message: 'Minimaal onderzoek is vereist om dit asset te ontgrendelen',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Default Layout
  if (selectedLayout === 'default') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="max-w-6xl mx-auto px-8 py-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className={ICON_SIZES.sm + " mr-2"} />
              Terug naar overzicht
            </Button>

            <div className="flex items-start justify-between gap-6">
              {/* Left: Asset Info */}
              <div className="flex-1">
                <h1 className={TYPOGRAPHY.pageTitle + " mb-3"}>{localAsset.type}</h1>
                <p className={TYPOGRAPHY.pageSubtitle + " mb-4 max-w-2xl"}>
                  {localAsset.description}
                </p>
                
                {/* Current Status */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${statusConfig.bg} ${statusConfig.border}`}>
                  <StatusIcon className={`${ICON_SIZES.md} ${statusConfig.color}`} />
                  <span className={`${TYPOGRAPHY.emphasis} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              {/* Right: Impact & CTA */}
              <Card className="w-80">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className={ICON_SIZES.md + " text-[#1FD1B2]"} />
                    <h3 className={TYPOGRAPHY.cardTitle}>Beslisimpact</h3>
                  </div>
                  <div className={TYPOGRAPHY.statLarge + " text-[#1FD1B2]"}>
                    {totalUnlockPotential}%
                  </div>
                  <p className={TYPOGRAPHY.caption + " mt-1"}>
                    Unlocked by {completedMethods.length} research methods
                  </p>
                </CardHeader>
                <CardContent>
                  <Button 
                    size="lg" 
                    className="w-full bg-[#1FD1B2] hover:bg-[#1AB89A] text-white"
                    disabled={decisionStatus.status === 'safe-to-decide'}
                  >
                    <Unlock className={ICON_SIZES.md + " mr-2"} />
                    Ontgrendel met onderzoek
                  </Button>
                  <p className={TYPOGRAPHY.caption + " text-center mt-2"}>
                    {decisionStatus.status === 'safe-to-decide' 
                      ? 'Dit asset is volledig ontgrendeld'
                      : 'Start onderzoek om campagnestrategie te ontgrendelen'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* Status Message */}
          <div className={`mb-8 p-6 rounded-xl border ${statusConfig.bg} ${statusConfig.border}`}>
            <p className={`${TYPOGRAPHY.emphasis} ${statusConfig.color}`}>
              {statusConfig.message}
            </p>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className={TYPOGRAPHY.label}>Onderzoeksvoortgang</span>
                <span className={TYPOGRAPHY.bodySmall + " " + TYPOGRAPHY.muted}>
                  {completedMethods.length} van {totalMethods} voltooid
                </span>
              </div>
              <Progress value={unlockProgress} className="h-2" />
            </div>
          </div>

          {/* Research Methods Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6">Beschikbare onderzoeken</h2>
            
            {researchMethods.map((method) => {
              const assetMethod = localAsset.researchMethods.find((m) => m.type === method.id);
              const isCompleted = assetMethod?.status === 'completed';
              const isInProgress = assetMethod?.status === 'in-progress';
              const MethodIcon = method.icon;

              return (
                <motion.div
                  key={method.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className={`
                    transition-all hover:shadow-md
                    ${isCompleted ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : ''}
                    ${isInProgress ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : ''}
                  `}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-6">
                        {/* Left: Method Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`
                            h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0
                            ${isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}
                          `}>
                            <MethodIcon className={`h-6 w-6 ${isCompleted ? 'text-green-600' : 'text-muted-foreground'}`} />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{method.name}</h3>
                              {method.unlockLevel === 'free' && (
                                <Badge className="bg-[#1FD1B2] text-white hover:bg-[#1FD1B2] px-2 py-0 text-xs font-semibold">
                                  FREE
                                </Badge>
                              )}
                              {method.unlockLevel === 'basic' && (
                                <Badge variant="outline" className="px-2 py-0 text-xs">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Basic
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {method.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                Impact: {method.impact}
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                +{method.unlocksPotential}% unlock
                              </div>
                              <div>⏱ {method.duration}</div>
                            </div>
                          </div>
                        </div>

                        {/* Right: Status & Action */}
                        <div className="flex flex-col items-end gap-3 min-w-[140px]">
                          {isCompleted && (
                            <>
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-semibold text-sm">Voltooid</span>
                              </div>
                              <Button variant="outline" size="sm" className="w-full">
                                Bekijk resultaten
                              </Button>
                            </>
                          )}
                          
                          {isInProgress && (
                            <>
                              <div className="flex items-center gap-2 text-blue-600">
                                <Shield className="h-5 w-5" />
                                <span className="font-semibold text-sm">Bezig</span>
                              </div>
                              <Button variant="outline" size="sm" className="w-full">
                                Doorgaan
                              </Button>
                            </>
                          )}
                          
                          {!isCompleted && !isInProgress && (
                            <>
                              <div className="text-sm font-semibold text-[#1FD1B2]">
                                +{method.unlocksPotential}%
                              </div>
                              <Button 
                                size="sm" 
                                className="w-full"
                                onClick={() => handleStartResearch(method.id)}
                              >
                                Start onderzoek
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Impact Preview */}
          <Card className="mt-8 bg-gradient-to-br from-[#1FD1B2]/10 to-blue-500/10 border-[#1FD1B2]/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-[#1FD1B2]/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-[#1FD1B2]" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Dit onderzoek ontgrendelt campagnestrategie</h3>
                  <p className="text-sm text-muted-foreground">
                    Voltooien van alle onderzoeken geeft je toegang tot geavanceerde strategische tools en AI-gegenereerde campagne-aanbevelingen.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Layout Toggle (Dev Only) */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedLayout('alternative')}
            className="shadow-lg"
          >
            Alternatieve layout →
          </Button>
        </div>

        {/* Research Flow Modal */}
        {selectedMethod && (
          <ResearchFlowModal
            isOpen={isFlowModalOpen}
            onClose={() => setIsFlowModalOpen(false)}
            method={selectedMethod}
            assetName={localAsset.type}
            onComplete={handleResearchComplete}
          />
        )}
      </div>
    );
  }

  // Alternative Layout - More Compact
  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{localAsset.type}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <div className={`flex items-center gap-1.5 text-sm ${statusConfig.color}`}>
                    <StatusIcon className="h-4 w-4" />
                    <span className="font-medium">{statusConfig.label}</span>
                  </div>
                  <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {completedMethods.length}/{totalMethods} onderzoeken
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Beslisimpact</div>
                <div className="text-2xl font-bold text-[#1FD1B2]">{totalUnlockPotential}%</div>
              </div>
              <Button 
                className="bg-[#1FD1B2] hover:bg-[#1AB89A] text-white"
                disabled={decisionStatus.status === 'safe-to-decide'}
              >
                <Unlock className="h-4 w-4 mr-2" />
                Ontgrendel
              </Button>
            </div>
          </div>

          {/* Compact Progress */}
          <Progress value={unlockProgress} className="h-2 mt-4" />
        </div>
      </div>

      {/* Compact Grid */}
      <div className="max-w-5xl mx-auto px-8 py-6">
        <div className="grid grid-cols-2 gap-4">
          {researchMethods.map((method) => {
            const assetMethod = localAsset.researchMethods.find((m) => m.type === method.id);
            const isCompleted = assetMethod?.status === 'completed';
            const isInProgress = assetMethod?.status === 'in-progress';
            const MethodIcon = method.icon;

            return (
              <Card 
                key={method.id}
                className={`
                  transition-all hover:shadow-md cursor-pointer
                  ${isCompleted ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200' : ''}
                  ${isInProgress ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200' : ''}
                `}
                onClick={() => !isCompleted && !isInProgress && handleStartResearch(method.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`
                      h-10 w-10 rounded-lg flex items-center justify-center
                      ${isCompleted ? 'bg-green-100' : 'bg-muted'}
                    `}>
                      <MethodIcon className={`h-5 w-5 ${isCompleted ? 'text-green-600' : 'text-muted-foreground'}`} />
                    </div>
                    {isCompleted && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {!isCompleted && !isInProgress && (
                      <div className="text-lg font-bold text-[#1FD1B2]">
                        +{method.unlocksPotential}%
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{method.name}</h3>
                    {method.unlockLevel === 'free' && (
                      <Badge className="bg-[#1FD1B2] text-white hover:bg-[#1FD1B2] px-1.5 py-0 text-xs">
                        FREE
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {method.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>⏱ {method.duration}</span>
                    <span>{method.impact} impact</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Compact Impact Message */}
        <div className={`mt-6 p-4 rounded-lg border text-center ${statusConfig.bg} ${statusConfig.border}`}>
          <p className={`text-sm font-medium ${statusConfig.color}`}>
            {statusConfig.message}
          </p>
        </div>
      </div>

      {/* Layout Toggle */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedLayout('default')}
          className="shadow-lg"
        >
          ← Standaard layout
        </Button>
      </div>

      {/* Research Flow Modal */}
      {selectedMethod && (
        <ResearchFlowModal
          isOpen={isFlowModalOpen}
          onClose={() => setIsFlowModalOpen(false)}
          method={selectedMethod}
          assetName={localAsset.type}
          onComplete={handleResearchComplete}
        />
      )}
    </div>
  );
}