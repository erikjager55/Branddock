export type InterviewStatus =
  | "TO_SCHEDULE"
  | "DRAFT"
  | "SCHEDULED"
  | "INTERVIEW_HELD"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "COMPLETED"
  | "APPROVED"
  | "CANCELLED";

export type QuestionType =
  | "OPEN"
  | "MULTIPLE_CHOICE"
  | "MULTI_SELECT"
  | "RATING_SCALE"
  | "RANKING";

export interface InterviewQuestion {
  id: string;
  interviewId: string;
  linkedAssetId: string | null;
  linkedAsset?: { id: string; name: string; category: string } | null;
  questionType: QuestionType;
  questionText: string;
  options: string[];
  orderIndex: number;
  isFromTemplate: boolean;
  templateId: string | null;
  answerText: string | null;
  answerOptions: string[];
  answerRating: number | null;
  answerRanking: string[];
  isAnswered: boolean;
}

export interface InterviewAssetLink {
  id: string;
  interviewId: string;
  brandAssetId: string;
  brandAsset: { id: string; name: string; category: string };
}

export interface Interview {
  id: string;
  brandAssetId: string;
  status: InterviewStatus;
  title: string | null;
  orderNumber: number;
  intervieweeName: string | null;
  intervieweePosition: string | null;
  intervieweeEmail: string | null;
  intervieweePhone: string | null;
  intervieweeCompany: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  durationMinutes: number;
  conductedAt: string | null;
  actualDuration: number | null;
  generalNotes: string | null;
  isLocked: boolean;
  lockedAt: string | null;
  approvedAt: string | null;
  currentStep: number;
  completedSteps: number[];
  questions: InterviewQuestion[];
  selectedAssets: InterviewAssetLink[];
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewTemplate {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options: string[];
  category: string;
  assetSlug: string | null;
}

export interface InterviewStats {
  total: number;
  toSchedule: number;
  scheduled: number;
  completed: number;
  inReview: number;
}
