import type { AnalysisSession, AnalysisMessage } from "../types/persona-analysis.types";

const BASE = "/api/personas";

export async function startAnalysisSession(
  personaId: string,
): Promise<{
  sessionId: string;
  status: string;
  progress: number;
  totalDimensions: number;
  answeredDimensions: number;
  messages: AnalysisMessage[];
}> {
  const res = await fetch(`${BASE}/${personaId}/ai-analysis`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to start analysis session");
  return res.json();
}

export async function fetchAnalysisSession(
  personaId: string,
  sessionId: string,
): Promise<AnalysisSession> {
  const res = await fetch(`${BASE}/${personaId}/ai-analysis/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch analysis session");
  return res.json();
}

export async function sendAnalysisAnswer(
  personaId: string,
  sessionId: string,
  content: string,
): Promise<{
  feedback: string;
  nextQuestion: { content: string; dimensionKey: string; dimensionTitle: string } | null;
  progress: number;
  answeredDimensions: number;
  isComplete: boolean;
}> {
  const res = await fetch(
    `${BASE}/${personaId}/ai-analysis/${sessionId}/answer`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
  if (!res.ok) throw new Error("Failed to send analysis answer");
  return res.json();
}

export async function completeAnalysis(
  personaId: string,
  sessionId: string,
): Promise<{
  status: string;
  insightsData: AnalysisSession["insightsData"];
  researchBoost: number;
  validationPercentage: number;
}> {
  const res = await fetch(
    `${BASE}/${personaId}/ai-analysis/${sessionId}/complete`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error("Failed to complete analysis");
  return res.json();
}
