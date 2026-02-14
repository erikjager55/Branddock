export type InterviewStatus = "TO_SCHEDULE" | "SCHEDULED" | "INTERVIEW_HELD" | "IN_REVIEW" | "COMPLETED";

export type InterviewQuestionType = "OPEN" | "MULTIPLE_CHOICE" | "MULTI_SELECT" | "RATING_SCALE" | "RANKING";

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
  createdAt: string;
  updatedAt: string;
}

export interface InterviewAssetLink {
  id: string;
  brandAssetId: string;
  brandAsset: { id: string; name: string; slug: string; category: string };
}

export interface InterviewQuestion {
  id: string;
  linkedAssetId: string | null;
  linkedAsset: { id: string; name: string; slug: string } | null;
  questionType: InterviewQuestionType;
  questionText: string;
  options: string[];
  orderIndex: number;
  isFromTemplate: boolean;
  answerText: string | null;
  answerOptions: string[];
  answerRating: number | null;
  answerRanking: string[];
  isAnswered: boolean;
}

export interface InterviewQuestionTemplate {
  id: string;
  questionText: string;
  questionType: InterviewQuestionType;
  options: string[];
  category: string;
  assetSlug: string | null;
}

// === API Bodies ===
export interface SaveContactBody {
  intervieweeName: string;
  intervieweePosition: string;
  intervieweeEmail: string;
  intervieweePhone?: string;
  intervieweeCompany: string;
}

export interface SaveScheduleBody {
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
}

export interface AddQuestionBody {
  linkedAssetId?: string;
  questionType: InterviewQuestionType;
  questionText: string;
  options?: string[];
  templateId?: string;
}

export interface AnswerQuestionBody {
  answerText?: string;
  answerOptions?: string[];
  answerRating?: number;
  answerRanking?: string[];
}

export interface InterviewOverviewStats {
  total: number;
  toSchedule: number;
  scheduled: number;
  completed: number;
  inReview: number;
}

// Question type config for UI
export const QUESTION_TYPE_CONFIG: Record<InterviewQuestionType, { label: string; icon: string; description: string }> = {
  OPEN: { label: "Open", icon: "MessageSquare", description: "Free text response" },
  MULTIPLE_CHOICE: { label: "Multiple Choice", icon: "CircleDot", description: "Select one option" },
  MULTI_SELECT: { label: "Multi-Select", icon: "CheckSquare", description: "Select multiple options" },
  RATING_SCALE: { label: "Rating Scale", icon: "Star", description: "Rate from 1 to 5" },
  RANKING: { label: "Ranking", icon: "ArrowUpDown", description: "Drag to rank options" },
};
