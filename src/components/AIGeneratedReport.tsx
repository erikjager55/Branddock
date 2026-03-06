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
    return `Based on the provided information, ${answers.brandPurpose || 'your organization'} focuses on ${answers.targetAudience || 'a specific target audience'}. The unique value proposition lies in ${answers.uniqueValue || 'the differentiating approach'}, which creates a clear distinction from the competition. With a focus on ${answers.brandValues || 'core values'} and a vision for ${answers.futureVision || 'future growth'}, there is a solid foundation for strategic brand positioning.`;
  };

  const generateKeyFindings = () => {
    const findings = [];
    
    if (answers.brandPurpose) {
      findings.push({
        icon: Target,
        title: 'Brand Purpose',
        description: `The core of the brand lies in ${answers.brandPurpose}. This forms the foundation for all communication and brand expression.`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      });
    }

    if (answers.targetAudience) {
      findings.push({
        icon: Users,
        title: 'Target Audience Definition',
        description: `Primary focus on ${answers.targetAudience}. This target audience determines the tone of voice and channel strategy.`,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      });
    }

    if (answers.uniqueValue) {
      findings.push({
        icon: Sparkles,
        title: 'Unique Value',
        description: `Distinctive capability through ${answers.uniqueValue}. This is the central differentiation point in the market.`,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      });
    }

    if (answers.customerChallenge) {
      findings.push({
        icon: Lightbulb,
        title: 'Customer Challenge',
        description: `Solves: ${answers.customerChallenge}. This forms the foundation for relevant solutions and messaging.`,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      });
    }

    if (answers.competitiveLandscape) {
      findings.push({
        icon: TrendingUp,
        title: 'Market Position',
        description: `In a landscape where ${answers.competitiveLandscape}, this offers strategic opportunities for differentiation.`,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      });
    }

    return findings;
  };

  const generateRecommendations = () => {
    const recommendations = [];

    if (answers.brandPurpose) {
      recommendations.push('Integrate the brand purpose into all touchpoints and communication efforts');
    }
    if (answers.targetAudience) {
      recommendations.push('Develop personas and customer journeys for the defined target audience');
    }
    if (answers.uniqueValue) {
      recommendations.push('Create content that makes the unique value tangible and understandable');
    }
    if (answers.customerChallenge) {
      recommendations.push('Build thought leadership around solutions for the customer challenge');
    }
    if (answers.brandValues) {
      recommendations.push(`Translate the values (${answers.brandValues}) into concrete behaviors and decision criteria`);
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
          <h2 className="text-xl font-semibold text-[#1F2937]">AI Generated Report</h2>
          <p className="text-sm text-muted-foreground">
            Based on {Object.keys(answers).filter(key => answers[key as keyof typeof answers]).length} answered questions
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
              Key Findings
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
              Strategic Recommendations
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