// Decision-focused analysis types for strategic decision making

export type DecisionReadiness = 'ready' | 'uncertain' | 'blocked' | 'outdated';

export interface DecisionRisk {
  id: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  mitigation?: string;
}

export interface DecisionBlock {
  id: string;
  question: string;
  metric: {
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'stable';
    status?: 'good' | 'warning' | 'critical';
  };
  keyInsight: string;
  implication: string;
  recommendedAction: string;
  confidence: number; // 0-100
}

export interface DataSource {
  type: 'ai-analysis' | 'workshop' | 'interview' | 'questionnaire';
  date: string;
  participants?: number;
  assumptions?: string[];
}

export interface DecisionAnalysis {
  id: string;
  mainQuestion: string;
  readiness: DecisionReadiness;
  readinessLabel: string;
  readinessDescription: string;
  risks: DecisionRisk[];
  decisionBlocks: DecisionBlock[];
  dataSource: DataSource;
  generatedAt: string;
}
