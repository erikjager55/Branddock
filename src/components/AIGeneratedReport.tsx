import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Lock, 
  Unlock, 
  RefreshCw, 
  FileText,
  Sparkles,
  Target,
  Users,
  Lightbulb,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

interface AIGeneratedReportProps {
  answers: {
    brandPurpose?: string;
    targetAudience?: string;
    uniqueValue?: string;
    competitiveLandscape?: string;
    customerChallenge?: string;
    brandValues?: string;
    futureVision?: string;
  };
  isLocked?: boolean;
  onLockToggle?: () => void;
  onRegenerate?: () => void;
}

export function AIGeneratedReport({ 
  answers, 
  isLocked = false, 
  onLockToggle,
  onRegenerate 
}: AIGeneratedReportProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (isLocked) return;
    
    setIsRegenerating(true);
    // Simulate regeneration
    setTimeout(() => {
      setIsRegenerating(false);
      onRegenerate?.();
    }, 2000);
  };

  // Generate report content based on answers
  const generateExecutiveSummary = () => {
    return `Op basis van de opgegeven informatie blijkt dat ${answers.brandPurpose || 'uw organisatie'} zich richt op ${answers.targetAudience || 'een specifieke doelgroep'}. De unieke waardepropositie ligt in ${answers.uniqueValue || 'de differentiërende aanpak'}, wat een duidelijk onderscheid creëert ten opzichte van de competitie. Met een focus op ${answers.brandValues || 'kernwaarden'} en een visie op ${answers.futureVision || 'toekomstige groei'}, is er een solide basis voor strategische merkpositionering.`;
  };

  const generateKeyFindings = () => {
    const findings = [];
    
    if (answers.brandPurpose) {
      findings.push({
        icon: Target,
        title: 'Merkdoelstelling',
        description: `De kern van het merk ligt in ${answers.brandPurpose}. Dit vormt de basis voor alle communicatie en merkexpressie.`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      });
    }

    if (answers.targetAudience) {
      findings.push({
        icon: Users,
        title: 'Doelgroep Definitie',
        description: `Primaire focus op ${answers.targetAudience}. Deze doelgroep bepaalt de tone of voice en kanaalstrategie.`,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      });
    }

    if (answers.uniqueValue) {
      findings.push({
        icon: Sparkles,
        title: 'Unieke Waarde',
        description: `Onderscheidend vermogen door ${answers.uniqueValue}. Dit is het centrale differentiatiepunt in de markt.`,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      });
    }

    if (answers.customerChallenge) {
      findings.push({
        icon: Lightbulb,
        title: 'Klantuitdaging',
        description: `Lost op: ${answers.customerChallenge}. Dit vormt de basis voor relevante oplossingen en messaging.`,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      });
    }

    if (answers.competitiveLandscape) {
      findings.push({
        icon: TrendingUp,
        title: 'Marktpositie',
        description: `In een landschap waar ${answers.competitiveLandscape}, biedt dit strategische kansen voor differentiatie.`,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      });
    }

    return findings;
  };

  const generateRecommendations = () => {
    const recommendations = [];

    if (answers.brandPurpose) {
      recommendations.push('Integreer de merkdoelstelling in alle touchpoints en communicatie-uitingen');
    }
    if (answers.targetAudience) {
      recommendations.push('Ontwikkel persona\'s en customer journeys voor de gedefinieerde doelgroep');
    }
    if (answers.uniqueValue) {
      recommendations.push('Creëer content die de unieke waarde tastbaar en begrijpelijk maakt');
    }
    if (answers.customerChallenge) {
      recommendations.push('Bouw thought leadership rond oplossingen voor de klantuitdaging');
    }
    if (answers.brandValues) {
      recommendations.push(`Vertaal de waarden (${answers.brandValues}) naar concrete gedragingen en besliscriteria`);
    }

    return recommendations;
  };

  const findings = generateKeyFindings();
  const recommendations = generateRecommendations();

  return (
    <div className="space-y-6">
      {/* Header - Simplified without duplicate buttons */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#5252E3] to-purple-600 flex items-center justify-center shadow-sm">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#1F2937]">AI Gegenereerd Rapport</h2>
          <p className="text-sm text-muted-foreground">
            Op basis van {Object.keys(answers).filter(key => answers[key as keyof typeof answers]).length} beantwoorde vragen
          </p>
        </div>
      </div>

      {/* Lock Status Badge */}
      {isLocked && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-[#1FD1B2]/5 border border-[#1FD1B2]/30 dark:bg-[#1FD1B2]/10 dark:border-[#1FD1B2]/30">
          <Lock className="h-4 w-4 text-[#1FD1B2]" />
          <span className="text-sm text-[#1F2937] dark:text-green-400 font-medium">
            This report is locked. Unlock to make changes.
          </span>
        </div>
      )}

      {/* Executive Summary */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#5252E3]" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {generateExecutiveSummary()}
          </p>
        </CardContent>
      </Card>

      {/* Key Findings */}
      {findings.length > 0 && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#1FD1B2]" />
              Belangrijkste Bevindingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {findings.map((finding, index) => {
                const Icon = finding.icon;
                return (
                  <div
                    key={index}
                    className={`p-5 rounded-xl border ${finding.bgColor} border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-shadow`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm ${finding.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[#1F2937] dark:text-slate-100 mb-2">
                          {finding.title}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {finding.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Recommendations */}
      {recommendations.length > 0 && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#5252E3]" />
              Strategische Aanbevelingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border border-slate-100 dark:border-slate-800"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#5252E3] to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-xs font-bold text-white">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 flex-1 leading-relaxed pt-0.5">
                    {recommendation}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}