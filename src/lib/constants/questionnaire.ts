// ── Question type options for the Design step ──

export const QUESTION_TYPE_OPTIONS = [
  { value: "SHORT_TEXT", label: "Short Text" },
  { value: "TEXTAREA", label: "Textarea" },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "RATING", label: "Rating" },
  { value: "RANKING", label: "Ranking" },
] as const;

export type QQuestionType = (typeof QUESTION_TYPE_OPTIONS)[number]["value"];

// ── Recipient group options ──

export const RECIPIENT_GROUP_OPTIONS = [
  { value: "STAKEHOLDER", label: "Stakeholder" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "PARTNER", label: "Partner" },
  { value: "OTHER", label: "Other" },
] as const;

// ── Wizard steps ──

export const WIZARD_STEPS = [
  "Design",
  "Distribution",
  "Recipients",
  "Collect",
  "Analyze",
] as const;

// ── Reminder day options ──

export const REMINDER_DAY_OPTIONS = [
  { value: 1, label: "1 day" },
  { value: 2, label: "2 days" },
  { value: 3, label: "3 days" },
  { value: 5, label: "5 days" },
  { value: 7, label: "7 days" },
] as const;

// ── Default email template ──

export const DEFAULT_EMAIL_SUBJECT =
  "You're invited: {questionnaire_name}";

export const DEFAULT_EMAIL_BODY = `Hi {recipient_name},

You've been invited to participate in our survey: {questionnaire_name}.

Your feedback is valuable to us. Please click the link below to get started:

{questionnaire_link}

Thank you!`;

// ── Question interface (JSON stored in Prisma) ──

export interface QuestionnaireQuestionItem {
  id: string;
  text: string;
  type: QQuestionType;
  required: boolean;
  assetLink?: string;
  options?: string[];
}

// ── Recipient interface (JSON stored in Prisma) ──

export interface QuestionnaireRecipientItem {
  id: string;
  name: string;
  email: string;
  group: string;
  role?: string;
  status: "PENDING" | "SENT" | "OPENED" | "COMPLETED";
  sentAt?: string;
  respondedAt?: string;
}

// ── AI Insight interface ──

export interface QuestionnaireInsight {
  title: string;
  content: string;
}

// ── Mock data for Analyze step (fallback when no real data) ──

export const MOCK_AI_INSIGHTS: QuestionnaireInsight[] = [
  {
    title: "Brand Personality",
    content:
      "Respondents primarily view the brand as innovative and forward-thinking (67%), with a secondary perception of reliability and trustworthiness.",
  },
  {
    title: "Mission Resonance",
    content:
      "Average rating of 3.7/5 indicates good alignment between stated mission and stakeholder perception, though room for improvement exists.",
  },
  {
    title: "Unique Differentiators",
    content:
      "Sustainability and innovation are the most cited unique qualities, mentioned by 72% and 64% of respondents respectively.",
  },
  {
    title: "Value Hierarchy",
    content:
      "Sustainability ranks highest (1.8), followed by Innovation (2.3) and Customer Focus (2.7) in the value ranking questions.",
  },
];

export const MOCK_ANALYZE_STATS = {
  totalResponses: 42,
  responseRate: 84,
  completionRate: 95,
  avgTime: 8,
  assetsCovered: 5,
};
