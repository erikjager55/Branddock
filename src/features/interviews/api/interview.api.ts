import type {
  Interview,
  InterviewStats,
  InterviewQuestion,
  InterviewTemplate,
} from "../types/interview.types";

// ─── Overview ────────────────────────────────────────────────

export async function fetchInterviews(
  assetId: string,
): Promise<{ interviews: Interview[]; stats: InterviewStats }> {
  const res = await fetch(`/api/brand-assets/${assetId}/interviews`);
  if (!res.ok) throw new Error("Failed to fetch interviews");
  return res.json();
}

export async function createInterview(
  assetId: string,
  data?: { title?: string },
): Promise<{ interview: Interview }> {
  const res = await fetch(`/api/brand-assets/${assetId}/interviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data ?? {}),
  });
  if (!res.ok) throw new Error("Failed to create interview");
  return res.json();
}

// ─── Detail CRUD ─────────────────────────────────────────────

export async function fetchInterviewDetail(
  assetId: string,
  interviewId: string,
): Promise<{ interview: Interview }> {
  const res = await fetch(
    `/api/brand-assets/${assetId}/interviews/${interviewId}`,
  );
  if (!res.ok) throw new Error("Failed to fetch interview");
  return res.json();
}

export async function updateInterview(
  assetId: string,
  interviewId: string,
  data: Partial<Interview>,
): Promise<{ interview: Interview }> {
  const res = await fetch(
    `/api/brand-assets/${assetId}/interviews/${interviewId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) throw new Error("Failed to update interview");
  return res.json();
}

export async function deleteInterview(
  assetId: string,
  interviewId: string,
): Promise<{ deleted: boolean }> {
  const res = await fetch(
    `/api/brand-assets/${assetId}/interviews/${interviewId}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete interview");
  return res.json();
}

export async function duplicateInterview(
  assetId: string,
  interviewId: string,
): Promise<{ interview: Interview }> {
  const res = await fetch(
    `/api/brand-assets/${assetId}/interviews/${interviewId}/duplicate`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error("Failed to duplicate interview");
  return res.json();
}

// ─── Questions ───────────────────────────────────────────────

export async function addQuestion(
  assetId: string,
  interviewId: string,
  data: {
    linkedAssetId?: string;
    questionType: string;
    questionText: string;
    answerOptions?: string[];
    savedToLibrary?: boolean;
  },
): Promise<{ question: InterviewQuestion }> {
  const res = await fetch(
    `/api/brand-assets/${assetId}/interviews/${interviewId}/questions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) throw new Error("Failed to add question");
  return res.json();
}

export async function updateQuestion(
  assetId: string,
  interviewId: string,
  questionId: string,
  data: Partial<InterviewQuestion>,
): Promise<{ question: InterviewQuestion }> {
  const res = await fetch(
    `/api/brand-assets/${assetId}/interviews/${interviewId}/questions/${questionId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) throw new Error("Failed to update question");
  return res.json();
}

export async function deleteQuestion(
  assetId: string,
  interviewId: string,
  questionId: string,
): Promise<{ deleted: boolean }> {
  const res = await fetch(
    `/api/brand-assets/${assetId}/interviews/${interviewId}/questions/${questionId}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete question");
  return res.json();
}

// ─── Actions ─────────────────────────────────────────────────

export async function completeInterview(
  assetId: string,
  interviewId: string,
): Promise<{ interview: Interview }> {
  const res = await fetch(
    `/api/brand-assets/${assetId}/interviews/${interviewId}/complete`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error("Failed to complete interview");
  return res.json();
}

export async function approveInterview(
  assetId: string,
  interviewId: string,
): Promise<{ interview: Interview; progress: number }> {
  const res = await fetch(
    `/api/brand-assets/${assetId}/interviews/${interviewId}/approve`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error("Failed to approve interview");
  return res.json();
}

// ─── Templates ───────────────────────────────────────────────

export async function fetchTemplates(
  assetId: string,
  category?: string,
): Promise<{ templates: InterviewTemplate[] }> {
  const url = new URL(
    `/api/brand-assets/${assetId}/interviews/templates`,
    window.location.origin,
  );
  if (category) url.searchParams.set("category", category);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch templates");
  return res.json();
}
