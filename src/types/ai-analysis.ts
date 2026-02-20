// =============================================================
// AI Brand Analysis Types (S1 — Fase 1B)
// =============================================================

// ─── Enums (mirror Prisma) ──────────────────────────────────

export type AIAnalysisStatus =
  | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
  | "REPORT_GENERATING" | "REPORT_READY" | "ERROR";

export type AIMessageType = "SYSTEM_INTRO" | "AI_QUESTION" | "USER_ANSWER" | "AI_FEEDBACK";

// ─── Message ────────────────────────────────────────────────

export interface AIAnalysisMessage {
  id: string;
  type: AIMessageType;
  content: string;
  orderIndex: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Session ────────────────────────────────────────────────

export interface AIBrandAnalysisSession {
  id: string;
  status: AIAnalysisStatus;
  progress: number;
  totalQuestions: number;
  answeredQuestions: number;
  locked: boolean;
  completedAt: string | null;
  lastUpdatedAt: string | null;
  brandAssetId: string;
  workspaceId: string;
  createdById: string;
  personaId: string | null;
  reportData: AIAnalysisReportData | null;
  messages: AIAnalysisMessage[];
  createdAt: string;
}

// Alias for convenience
export type AIAnalysisSession = AIBrandAnalysisSession;

// ─── Report ─────────────────────────────────────────────────

export type FindingKey = "brand_purpose" | "target_audience" | "unique_value" | "customer_challenge" | "market_position";

export interface AIFinding {
  key: FindingKey;
  title: string;
  description: string;
  icon: string;
}

export interface AIRecommendation {
  number: number;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

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

// ─── API Request/Response Types ─────────────────────────────

export interface StartSessionResponse {
  sessionId: string;
  status: AIAnalysisStatus;
  messages: AIAnalysisMessage[];
}

// Keep backward compat alias
export type StartAnalysisResponse = StartSessionResponse;

export interface SubmitAnswerResponse {
  feedback: string;
  nextQuestion: string | null;
  progress: number;
  answeredQuestions: number;
  totalQuestions: number;
  isComplete: boolean;
}

export interface GenerateReportResponse {
  status: AIAnalysisStatus;
  message: string;
}

export interface ReportResponse {
  status: AIAnalysisStatus;
  reportData: AIAnalysisReportData | null;
  ready: boolean;
}

export interface RawReportResponse {
  session: Omit<AIBrandAnalysisSession, "messages">;
  messages: AIAnalysisMessage[];
  reportData: AIAnalysisReportData | null;
}

export interface ToggleLockResponse {
  locked: boolean;
  sessionId: string;
}

export interface SessionWithMessages {
  session: AIBrandAnalysisSession;
  messages: AIAnalysisMessage[];
}
