export type AIMessageType = 'SYSTEM_INTRO' | 'AI_QUESTION' | 'USER_ANSWER' | 'AI_FEEDBACK';

export interface AnalysisSession {
  id: string;
  status: string;
  progress: number;
  totalDimensions: number;
  answeredDimensions: number;
  insightsData: PersonaInsightsData | null;
  messages: AnalysisMessage[];
  createdAt: string;
}

export interface AnalysisMessage {
  id: string;
  type: AIMessageType;
  content: string;
  orderIndex: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ReportFinding {
  title: string;
  description: string;
}

export interface PersonaInsightsData {
  dimensions: DimensionInsight[];
  researchBoostPercentage: number;
  completedAt: string;
  executiveSummary?: string;
  findings?: ReportFinding[];
  recommendations?: string[];
}

export interface DimensionInsight {
  key: string;
  title: string;
  icon: string;
  summary: string;
}

export interface SendAnswerBody {
  content: string;
}
