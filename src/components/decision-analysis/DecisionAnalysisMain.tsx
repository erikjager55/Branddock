import React, { useState } from 'react';
import { DecisionAnalysis } from '../../types/decision-analysis';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
  Calendar,
  Database,
  ChevronRight,
} from 'lucide-react';

interface DecisionAnalysisMainProps {
  analysis: DecisionAnalysis;
  onGenerateBrief?: () => void;
}

export function DecisionAnalysisMain({ analysis, onGenerateBrief }: DecisionAnalysisMainProps) {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  const toggleBlock = (id: string) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedBlocks(newExpanded);
  };

  // Readiness configuration
  const readinessConfig = {
    ready: {
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      label: analysis.readinessLabel || 'Beslisklaar – Laag risico',
    },
    uncertain: {
      icon: AlertCircle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      label: analysis.readinessLabel || 'Onzeker – Gemiddeld risico',
    },
    blocked: {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: analysis.readinessLabel || 'Geblokkeerd – Hoog risico',
    },
    outdated: {
      icon: Clock,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      label: analysis.readinessLabel || 'Verouderd – Data niet meer actueel',
    },
  };

  const config = readinessConfig[analysis.readiness];
  const ReadinessIcon = config.icon;

  // Risk severity configuration
  const riskConfig = {
    high: { color: 'text-red-600', bgColor: 'bg-red-50', label: 'Hoog' },
    medium: { color: 'text-amber-600', bgColor: 'bg-amber-50', label: 'Gemiddeld' },
    low: { color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Laag' },
  };

  // Metric status configuration
  const metricConfig = {
    good: { color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    warning: { color: 'text-amber-600', bgColor: 'bg-amber-50' },
    critical: { color: 'text-red-600', bgColor: 'bg-red-50' },
  };

  // Trend icons
  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* TOP SECTION: Decision Status */}
      <Card className={`border-2 ${config.borderColor}`}>
        <CardContent className="p-8">
          
          {/* Main Question */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold mb-2">
              {analysis.mainQuestion}
            </h1>
          </div>

          {/* Status Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${config.bgColor} ${config.color} mb-6`}>
            <ReadinessIcon className="h-5 w-5" />
            <span className="font-medium">{config.label}</span>
          </div>

          {/* Description */}
          <p className="text-slate-600 mb-6 max-w-2xl">
            {analysis.readinessDescription}
          </p>

          {/* Risks */}
          {analysis.risks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Belangrijkste risico's
              </h3>
              <div className="space-y-2">
                {analysis.risks.map((risk) => {
                  const riskStyle = riskConfig[risk.severity];
                  return (
                    <div
                      key={risk.id}
                      className={`p-4 rounded-lg border ${riskStyle.bgColor} border-slate-200`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${riskStyle.color} bg-white`}>
                          {riskStyle.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 mb-1">
                            {risk.category}
                          </div>
                          <div className="text-sm text-slate-600 mb-2">
                            {risk.description}
                          </div>
                          {risk.mitigation && (
                            <div className="text-sm text-slate-500 flex items-start gap-2">
                              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{risk.mitigation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Primary Action */}
          <Button
            size="lg"
            onClick={onGenerateBrief}
            className="bg-[#1FD1B2] hover:bg-[#1FD1B2]/90 text-white gap-2"
          >
            <FileText className="h-4 w-4" />
            Genereer decision brief
          </Button>
        </CardContent>
      </Card>

      {/* BOTTOM SECTION: Data Source & Accountability */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Bronverantwoording
          </h3>

          <div className="space-y-4 text-sm">
            
            {/* Data Source */}
            <div className="flex gap-3">
              <span className="text-slate-500 min-w-[120px]">Herkomst data</span>
              <span className="text-slate-900 font-medium">
                {analysis.dataSource.type === 'ai-analysis' && 'AI Exploratie'}
                {analysis.dataSource.type === 'workshop' && 'Workshop'}
                {analysis.dataSource.type === 'interview' && 'Interviews'}
                {analysis.dataSource.type === 'questionnaire' && 'Questionnaire'}
              </span>
            </div>

            {/* Date */}
            <div className="flex gap-3">
              <span className="text-slate-500 min-w-[120px]">Datum</span>
              <span className="text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(analysis.dataSource.date).toLocaleDateString('nl-NL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            {/* Participants */}
            {analysis.dataSource.participants && (
              <div className="flex gap-3">
                <span className="text-slate-500 min-w-[120px]">Deelnemers</span>
                <span className="text-slate-900">{analysis.dataSource.participants}</span>
              </div>
            )}

            {/* Assumptions */}
            {analysis.dataSource.assumptions && analysis.dataSource.assumptions.length > 0 && (
              <div>
                <div className="text-slate-500 mb-2">Aannames</div>
                <ul className="space-y-1.5 ml-0">
                  {analysis.dataSource.assumptions.map((assumption, idx) => (
                    <li key={idx} className="text-slate-600 flex items-start gap-2">
                      <span className="text-slate-400 mt-1">•</span>
                      <span>{assumption}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
