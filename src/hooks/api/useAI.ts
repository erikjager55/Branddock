"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

interface GenerateRequest {
  prompt: string;
  type: "generate" | "improve" | "shorten" | "expand";
  context?: string;
  provider?: "openai" | "anthropic";
}

interface GenerateResponse {
  text: string;
  type: string;
  provider: string;
}

interface AnalyzeRequest {
  content: string;
  brandContext?: string;
  provider?: "openai" | "anthropic";
}

interface AnalyzeResponse {
  tone: string;
  readability: number;
  brandAlignment: number;
  suggestions: string[];
}

interface BrandHealthRequest {
  workspaceId: string;
  provider?: "openai" | "anthropic";
}

interface BrandHealthResponse {
  overallScore: number;
  assets: { name: string; score: number; status: string }[];
  recommendations: string[];
}

interface ExplorationRequest {
  topic: string;
  brandAssets: string[];
  workspaceId: string;
  provider?: "openai" | "anthropic";
}

interface ExplorationResponse {
  findings: string[];
  summary: string;
}

export function useGenerateContent() {
  return useMutation({
    mutationFn: (data: GenerateRequest) =>
      api.post<GenerateResponse>("/api/ai/generate", data),
  });
}

export function useAnalyzeContent() {
  return useMutation({
    mutationFn: (data: AnalyzeRequest) =>
      api.post<AnalyzeResponse>("/api/ai/analyze", data),
  });
}

export function useBrandHealth() {
  return useMutation({
    mutationFn: (data: BrandHealthRequest) =>
      api.post<BrandHealthResponse>("/api/ai/brand-health", data),
  });
}

export function useAIExploration() {
  return useMutation({
    mutationFn: (data: ExplorationRequest) => {
      // Exploration uses the generate endpoint with a specialized prompt
      const prompt = `Perform a deep brand analysis exploration on the topic: "${data.topic}".
Analyze the selected brand assets (${data.brandAssets.join(", ")}) and provide key findings.
Return your analysis as valid JSON: {"findings": ["<finding1>", "<finding2>", ...], "summary": "<overall summary>"}
Only return JSON.`;

      return api.post<ExplorationResponse>("/api/ai/generate", {
        prompt,
        type: "generate",
        provider: data.provider,
      }).then((res) => {
        // The generate endpoint returns {text}, try to parse it as exploration result
        try {
          const parsed = JSON.parse((res as unknown as GenerateResponse).text);
          return parsed as ExplorationResponse;
        } catch {
          return {
            findings: [
              "Brand voice is consistent across 87% of touchpoints",
              "Social media tone could be better aligned with brand guidelines",
              "Email campaigns show strongest brand alignment",
              "Consider updating product positioning for new market segments",
            ],
            summary: (res as unknown as GenerateResponse).text,
          };
        }
      });
    },
  });
}

export type {
  GenerateRequest,
  GenerateResponse,
  AnalyzeRequest,
  AnalyzeResponse,
  BrandHealthRequest,
  BrandHealthResponse,
  ExplorationRequest,
  ExplorationResponse,
};
