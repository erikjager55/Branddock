// === Enums ===
export type AIAnalysisStatus =
  | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
  | "REPORT_GENERATING" | "REPORT_READY" | "ERROR";

export type AIMessageType = "SYSTEM_INTRO" | "AI_QUESTION" | "USER_ANSWER" | "AI_FEEDBACK";

// === Entities ===
export interface AIAnalysisMessage {
  id: string;
  type: AIMessageType;
  content: string;
  orderIndex: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AIBrandAnalysisSession {
  id: string;
  status: AIAnalysisStatus;
  progress: number;
  totalQuestions: number;
  answeredQuestions: number;
  locked: boolean;
  completedAt: string | null;
  brandAssetId: string;
  createdAt: string;
}

// === Report ===
export interface AIAnalysisReportData {
  executiveSummary: string;
  findings: AIFinding[];
  recommendations: AIRecommendation[];
  dataPointsCount: number;
  sourcesCount: number;
  confidenceScore: number;
  completedAt: string;
  lastUpdatedAt: string;
}

export type FindingKey = "brand_purpose" | "target_audience" | "unique_value" | "customer_challenge" | "market_position";

export interface AIFinding {
  key: FindingKey;
  title: string;
  description: string;
}

export interface AIRecommendation {
  number: number;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

// === API Responses ===
export interface StartAnalysisResponse {
  sessionId: string;
  status: "IN_PROGRESS";
  messages: AIAnalysisMessage[];
}

export interface SubmitAnswerResponse {
  feedback: AIAnalysisMessage;
  nextQuestion: AIAnalysisMessage | null;
  progress: number;
  answeredQuestions: number;
  totalQuestions: number;
  isComplete: boolean;
}

export interface SessionWithMessages {
  session: AIBrandAnalysisSession;
  messages: AIAnalysisMessage[];
}

export interface ReportResponse {
  reportData: AIAnalysisReportData;
  status: "REPORT_READY";
}
